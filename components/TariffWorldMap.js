/**
 * 世界关税地图组件
 * 使用D3.js可视化全球关税数据
 */
class TariffWorldMap {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   * @param {string} config.containerId 容器ID
   * @param {string} config.dataPath 关税数据路径
   * @param {number} config.width 地图宽度
   * @param {number} config.height 地图高度
   * @param {Object} config.margins 地图边距
   * @param {Function} config.onCountryClick 国家点击回调函数
   */
  constructor(config) {
    this.containerId = config.containerId || 'tariff-world-map';
    this.dataPath = config.dataPath || 'data/tariff_data.json';
    this.geoJsonPath = config.geoJsonPath || 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
    this.width = config.width || 960;
    this.height = config.height || 500;
    this.margins = config.margins || { top: 20, right: 20, bottom: 60, left: 20 };
    this.onCountryClick = config.onCountryClick || null;
    
    // 颜色比例尺 - 调整阈值以适应新的税率范围 (e.g., 0-84%)
    this.colorScale = d3.scaleThreshold()
      .domain([5, 10, 15, 25, 50, 75]) // Adjusted thresholds
      .range(d3.schemeReds[7]); // Keep 7 levels
    
    // 数据
    this.worldData = null;
    this.tariffData = null;
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化地图
   */
  init() {
    // 创建SVG容器
    this.svg = d3.select('#' + this.containerId)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
      
    // 创建地图投影
    this.projection = d3.geoMercator()
      .scale(this.width / 2 / Math.PI)
      .center([0, 20])
      .translate([this.width / 2, this.height / 2]);
      
    // 创建地理路径生成器
    this.path = d3.geoPath().projection(this.projection);
    
    // 创建地图组
    this.mapGroup = this.svg.append('g');
    
    // 创建标签组
    this.labelsGroup = this.svg.append('g');
    
    // 创建图例组
    this.legendGroup = this.svg.append('g')
      .attr('transform', `translate(40, ${this.height - 50})`);
      
    // 创建提示框
    this.tooltip = d3.select('body').append('div')
      .attr('class', 'tariff-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('box-shadow', '0 1px 3px rgba(0,0,0,0.12)')
      .style('pointer-events', 'none')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '12px');
      
    // 加载数据
    this.loadData();
  }
  
  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 并行加载世界地图数据和关税数据
      const [worldData, tariffData] = await Promise.all([
        d3.json(this.geoJsonPath),
        d3.json(this.dataPath)
      ]);
      
      this.worldData = worldData;
      this.tariffData = tariffData;
      
      this.drawMap();
      this.createLegend();
      this.setupTooltips();
      
      console.log('世界关税地图数据加载完成');
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }
  
  /**
   * 绘制地图
   */
  drawMap() {
    if (!this.worldData || !this.tariffData) {
      console.error('地图数据未加载');
      return;
    }
    
    // 创建国家数据映射 (使用 code3 作为 key)
    const countryTariffMap = {};
    this.tariffData.countries.forEach(country => {
      if (country.code3) { // Use code3 if available
          countryTariffMap[country.code3] = country;
      }
    });
    
    // 绘制国家
    this.mapGroup.selectAll('path.country') // Select existing paths if any
      .data(this.worldData.features, d => d.id) // Use GeoJSON ID (alpha-3) as key
      .join(
        enter => enter.append('path') // How to add new paths
          .attr('d', this.path)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .attr('class', 'country')
          .attr('data-country-code3', d => d.id) // Store alpha-3 code
          .attr('fill', d => {
            const country = countryTariffMap[d.id]; // Match using alpha-3 (d.id)
            // Use a specific color for US, otherwise use scale or default
            if (d.id === 'USA') return '#6b7280'; // Gray for US
            return country ? this.colorScale(country.tariffRate) : '#f0f0f0'; // Default light gray
          })
          .on('mouseover', this.handleMouseOver.bind(this))
          .on('mousemove', this.handleMouseMove.bind(this))
          .on('mouseout', this.handleMouseOut.bind(this))
          .on('click', this.handleClick.bind(this)),
        update => update // How to update existing paths
          .attr('fill', d => {
            const country = countryTariffMap[d.id];
            if (d.id === 'USA') return '#6b7280';
            return country ? this.colorScale(country.tariffRate) : '#f0f0f0';
          })
          // Re-attach event listeners if needed, though D3 join usually handles this
          .on('mouseover', this.handleMouseOver.bind(this))
          .on('mousemove', this.handleMouseMove.bind(this))
          .on('mouseout', this.handleMouseOut.bind(this))
          .on('click', this.handleClick.bind(this)),
         exit => exit.remove() // How to remove paths no longer in data (unlikely for world map)
      );
      
    // 为主要国家添加标签 (use code3 for lookup if needed)
    this.addCountryLabels(countryTariffMap);
  }
  
  /**
   * 添加国家标签
   * @param {Object} countryTariffMap 国家关税数据映射
   */
  addCountryLabels(countryTariffMap) {
    // 过滤主要国家
    const majorCountries = this.tariffData.countries.filter(c => c.isMajor);
    
    // 添加标签
    this.labelsGroup.selectAll('text')
      .data(majorCountries)
      .enter()
      .append('text')
      .attr('x', d => this.projection([d.longitude, d.latitude])[0])
      .attr('y', d => this.projection([d.longitude, d.latitude])[1])
      .attr('dy', -8)
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('fill', '#333');
  }
  
  /**
   * 创建图例
   */
  createLegend() {
    const legendWidth = 300;
    const legendHeight = 15;
    const legendColors = this.colorScale.range();
    // Get the actual domain thresholds used in the color scale
    const colorDomain = this.colorScale.domain(); 
    // Define the legend scale domain based on actual data range (0 to max threshold or a bit beyond)
    const legendMin = 0;
    const legendMax = Math.max(80, colorDomain[colorDomain.length - 1] + 5); // Go up to at least 80 or slightly above the max threshold
    
    // 创建图例标题
    this.legendGroup.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .text('关税率 (%)')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold');
    
    // 创建颜色矩形对应的线性比例尺
    const legendScale = d3.scaleLinear()
      .domain([legendMin, legendMax]) // Use dynamic min/max
      .range([0, legendWidth]);
      
    // Generate tick values based on the color scale domain, plus 0 and potentially max
    let tickValues = [0, ...colorDomain]; 
    if (legendMax > colorDomain[colorDomain.length - 1]) {
        // Add a tick near the max if it extends beyond the last color threshold
        // tickValues.push(legendMax); // Option 1: Tick at the very end
        // Option 2: Add a sensible tick like 80 if max is >= 80
         if (legendMax >= 80 && !tickValues.includes(80)) tickValues.push(80);
    }
    tickValues = [...new Set(tickValues)].sort((a,b) => a-b); // Unique and sorted
      
    const legendAxis = d3.axisBottom(legendScale)
      .tickValues(tickValues) // Use dynamic tick values
      .tickFormat(d => d);
      
    // 添加图例矩形
    // Create segments based on color domain + 0 and legendMax
    const legendSegments = [legendMin, ...colorDomain, legendMax].filter((v, i, a) => a.indexOf(v) === i).sort((a,b)=>a-b);
    
    for (let i = 0; i < legendSegments.length - 1; i++) {
      const segmentStart = legendSegments[i];
      const segmentEnd = legendSegments[i+1];
      const xPos = legendScale(segmentStart);
      let rectWidth = legendScale(segmentEnd) - xPos;
      
       // Ensure width is non-negative (should be fine with sorted segments)
      if (rectWidth < 0) {
          console.error(`Calculated negative legend rect width (${rectWidth}) for segment ${segmentStart}-${segmentEnd}. Skipping.`);
          continue;
      }
      
      // Determine color for this segment (use the color corresponding to the start value)
      const segmentColor = this.colorScale(segmentStart);

      this.legendGroup.append('rect')
        .attr('x', xPos)
        .attr('y', 0)
        .attr('width', rectWidth)
        .attr('height', legendHeight)
        .attr('fill', segmentColor);
    }
    
    // 添加图例轴
    this.legendGroup.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .select('.domain')
      .attr('stroke', '#333');
  }
  
  /**
   * 设置提示框
   */
  setupTooltips() {
    // 已在init方法中创建提示框
  }
  
  /**
   * 处理鼠标悬停事件
   * @param {Event} event 事件对象
   * @param {Object} d 数据对象 (GeoJSON feature)
   */
  handleMouseOver(event, d) {
    // 查找国家数据 using GeoJSON ID (alpha-3)
    const countryCode3 = d.id;
    const country = this.tariffData.countries.find(c => c.code3 === countryCode3);
    
    if (!country) return; // Don't show tooltip if no data
    
    // 高亮国家
    d3.select(event.currentTarget)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);
      
    // 显示提示框
    this.tooltip.transition()
      .duration(200)
      .style('opacity', 0.9);
      
    // 设置提示框内容 (add details)
    this.tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 5px;">${country.name}</div>
      <div>税率: <span style="font-weight: bold;">${country.tariffRate !== null ? country.tariffRate + '%' : 'N/A'}</span></div>
      ${country.details ? `<div style="font-size: 11px; color: #555; margin-top: 3px;">${country.details}</div>` : ''}
      <div style="margin-top: 8px; font-size: 11px; border-top: 1px solid #eee; padding-top: 5px;">
        ${this.getResponseHtml(country.response)}
      </div>
    `);
  }
  
  /**
   * 处理鼠标移动事件
   * @param {Event} event 事件对象
   */
  handleMouseMove(event) {
    this.tooltip
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 20) + 'px');
  }
  
  /**
   * 处理鼠标离开事件
   * @param {Event} event 事件对象
   */
  handleMouseOut(event) {
    // 恢复国家样式
    d3.select(event.currentTarget)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);
      
    // 隐藏提示框
    this.tooltip.transition()
      .duration(500)
      .style('opacity', 0);
  }
  
  /**
   * 处理点击事件
   * @param {Event} event 事件对象
   * @param {Object} d 数据对象 (GeoJSON feature)
   */
  handleClick(event, d) {
    if (this.onCountryClick) {
      // Find the country data using GeoJSON ID (alpha-3)
      const countryCode3 = d.id;
      const countryData = this.tariffData.countries.find(c => c.code3 === countryCode3);
      if (countryData) {
          this.onCountryClick(countryData); // Pass the data object from tariff_data.json
      }
    }
  }
  
  /**
   * 生成反制措施的HTML
   * @param {Array} responses 反制措施数组
   * @returns {string} HTML字符串
   */
  getResponseHtml(responses) {
    if (!responses || responses.length === 0) {
      return '<span>无明确反制措施记录</span>';
    }
    let html = '<div style="font-weight: bold; margin-bottom: 3px;">反制措施:</div><ul style="list-style: none; padding-left: 0; margin: 0;">';
    responses.forEach(res => {
      html += `<li style="margin-bottom: 4px;"><strong>${res.type}:</strong> ${res.details} ${res.effectiveDate ? '(' + res.effectiveDate + ')' : ''}</li>`;
    });
    html += '</ul>';
    return html;
  }
  
  /**
   * 更新关税数据
   * @param {Object} newTariffData 新关税数据
   */
  updateTariffData(newTariffData) {
    this.tariffData = newTariffData;
    
    // 创建国家数据映射
    const countryTariffMap = {};
    this.tariffData.countries.forEach(country => {
      countryTariffMap[country.code] = country;
    });
    
    // 更新国家颜色
    this.mapGroup.selectAll('path.country')
      .transition()
      .duration(750)
      .attr('fill', d => {
        const countryCode = d.id;
        const country = countryTariffMap[countryCode];
        return country ? this.colorScale(country.tariffRate) : '#f0f0f0';
      });
      
    // 更新标签
    this.labelsGroup.selectAll('text').remove();
    this.addCountryLabels(countryTariffMap);
  }
  
  /**
   * 调整地图大小
   * @param {number} width 新宽度
   * @param {number} height 新高度
   */
  resize(width, height) {
    this.width = width || document.getElementById(this.containerId)?.clientWidth || 960;
    this.height = height || 500;
    
    // 更新SVG尺寸
    this.svg.attr('width', this.width).attr('height', this.height);
    
    // 更新投影
    this.projection
      .scale(this.width / 2 / Math.PI) // Adjust scale based on new width
      .translate([this.width / 2, this.height / 2]);
      
    // 重绘地图路径
    this.mapGroup.selectAll('path.country')
      .attr('d', this.path);
      
    // 更新标签位置
    this.labelsGroup.selectAll('text')
       .attr('x', d => this.projection([d.longitude, d.latitude])[0])
       .attr('y', d => this.projection([d.longitude, d.latitude])[1]);
       
    // 更新图例位置
    this.legendGroup.attr('transform', `translate(40, ${this.height - 50})`);
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TariffWorldMap;
} 