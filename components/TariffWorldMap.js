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
    
    // 颜色比例尺 - **UPDATED** to reflect US tariffs ON others (10% to 125%)
    this.colorScale = d3.scaleThreshold()
      .domain([10, 15, 25, 30, 50, 100]) // Example thresholds up to 125
      .range(d3.schemeReds[7]); // Use 7 shades of red
    
    // 数据
    this.worldData = null;
    this.tariffData = null;
    this.countryGeoMap = {}; // Map ISO A3/A2 codes to GeoJSON features/layers
    this.euData = null; // Store EU specific data for quick access
    
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

    // 创建欧盟标记组
    this.euMarkerGroup = this.svg.append('g');
    
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
      this.addEUMarker(); // 添加欧盟标记
      
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
          this.countryGeoMap[country.code3] = null; // Initialize map entry
      }
      if (country.code) { // Also map by code2 (ISO A2)
          this.countryGeoMap[country.code] = null;
      }
      if (country.code === 'EU') {
          this.euData = country; // Store EU data separately
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
          .attr('data-country-code3', d => d.id) // Store alpha-3 code (e.g., 'USA')
          .attr('data-country-code2', d => d.properties.iso_a2_eh || d.properties.iso_a2) // Store alpha-2 code (e.g., 'US')
          .attr('fill', d => {
              const countryCode3 = d.id;

              if (countryCode3 === 'USA') {
                  return '#cbd5e0'; // Neutral color (Tailwind gray-300) for the US itself
              }

              // 检查是否为欧盟成员国 (使用 ISO A3)
              if (this.isEUMember(countryCode3)) {
                  // 对欧盟成员国使用欧盟的关税率
                  return this.colorScale(this.getUsTariffOnCountry(this.euData));
              }

              const country = countryTariffMap[countryCode3];
              if (!country) {
                  return '#f7fafc'; // Very light gray (Tailwind gray-100) for countries with no data
              }
              
              // Determine the US tariff rate ON this country
              const usTariffRateOnCountry = this.getUsTariffOnCountry(country);
              return this.colorScale(usTariffRateOnCountry); // Color based on US tariff ON the country
          })
          .each((d, i, nodes) => {
              // Populate the countryGeoMap with references to the path elements
              if (d.id) this.countryGeoMap[d.id] = nodes[i];
              const countryCode2 = d.properties.iso_a2_eh || d.properties.iso_a2;
              if (countryCode2) this.countryGeoMap[countryCode2] = nodes[i];
          })
          .on('mouseover', this.handleMouseOver.bind(this))
          .on('mousemove', this.handleMouseMove.bind(this))
          .on('mouseout', this.handleMouseOut.bind(this))
          .on('click', this.handleClick.bind(this)),
        update => update // How to update existing paths
          .attr('fill', d => {
              const countryCode3 = d.id;

              if (countryCode3 === 'USA') {
                  return '#cbd5e0'; // Neutral color for US
              }

              // 检查是否为欧盟成员国 (使用 ISO A3)
              if (this.isEUMember(countryCode3)) {
                  // 对欧盟成员国使用欧盟的关税率
                  return this.colorScale(this.getUsTariffOnCountry(this.euData));
              }

              const country = countryTariffMap[countryCode3];
              if (!country) {
                  return '#f7fafc'; // No data color
              }
              const usTariffRateOnCountry = this.getUsTariffOnCountry(country);
              return this.colorScale(usTariffRateOnCountry);
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
   * 添加欧盟标记（跳动圆点）
   */
  addEUMarker() {
    if (!this.euData || !this.euData.longitude || !this.euData.latitude) {
      console.warn('欧盟数据不完整，无法添加标记');
      return;
    }

    const euPosition = this.projection([this.euData.longitude, this.euData.latitude]);
    
    // 创建外圆
    this.euMarkerGroup.append('circle')
      .attr('cx', euPosition[0])
      .attr('cy', euPosition[1])
      .attr('r', 10)
      .attr('fill', 'rgba(25, 99, 201, 0.3)')
      .attr('stroke', 'rgba(25, 99, 201, 0.8)')
      .attr('stroke-width', 1.5)
      .attr('class', 'eu-marker-outer');
    
    // 创建内圆
    this.euMarkerGroup.append('circle')
      .attr('cx', euPosition[0])
      .attr('cy', euPosition[1])
      .attr('r', 5)
      .attr('fill', 'rgba(25, 99, 201, 0.8)')
      .attr('class', 'eu-marker-inner');
    
    // 添加动画效果
    const pulseAnimation = () => {
      this.euMarkerGroup.select('.eu-marker-outer')
        .transition()
        .duration(1500)
        .attr('r', 15)
        .style('opacity', 0.1)
        .transition()
        .duration(1500)
        .attr('r', 10)
        .style('opacity', 0.6)
        .on('end', pulseAnimation);
    };
    
    // 启动动画
    pulseAnimation();
    
    // 添加鼠标事件
    this.euMarkerGroup.selectAll('circle')
      .on('mouseover', (event) => {
        this.handleEUInteraction(true);
        this.showTooltip(event, this.euData);
      })
      .on('mousemove', (event) => {
        this.tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 20) + 'px');
      })
      .on('mouseout', () => {
        this.handleEUInteraction(false);
        this.hideTooltip();
      })
      .on('click', () => {
        if (this.onCountryClick && this.euData) {
          this.onCountryClick(this.euData);
        }
      });
  }
  
  /**
   * 添加国家标签
   * @param {Object} countryTariffMap 国家关税数据映射
   */
  addCountryLabels(countryTariffMap) {
    // 过滤主要国家，排除欧盟（因为欧盟已经有自己的标记）
    const majorCountries = this.tariffData.countries.filter(c => c.isMajor && c.code !== 'EU');
    
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
    // Define the legend scale domain based on actual data range (0 or 10 up to max tariff 125)
    const legendMin = 10; // Start legend at baseline tariff
    const legendMax = 130; // Go slightly beyond the max 125
    
    // 创建图例标题
    this.legendGroup.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .text('美国对其关税率 (%)') // **UPDATED TITLE**
      .attr('font-size', '12px')
      .attr('font-weight', 'bold');
    
    // 创建颜色矩形对应的线性比例尺
    const legendScale = d3.scaleLinear()
      .domain([legendMin, legendMax]) // Use dynamic min/max
      .range([0, legendWidth]);
      
    // Generate tick values based on the color scale domain, plus 0 and potentially max
    let tickValues = [10, 25, 50, 100, 125]; 
    if (legendMax > colorDomain[colorDomain.length - 1]) {
        // Add a tick near the max if it extends beyond the last color threshold
        // tickValues.push(legendMax); // Option 1: Tick at the very end
        // Option 2: Add a sensible tick like 80 if max is >= 80
         if (legendMax >= 80 && !tickValues.includes(80)) tickValues.push(80);
    }
    tickValues = [...new Set(tickValues)].sort((a,b) => a-b); // Unique and sorted
      
    const legendAxis = d3.axisBottom(legendScale)
      .tickValues([10, 25, 50, 100, 125]) // **UPDATED TICKS** Example: Focus on key rates
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
   * 显示提示框
   * @param {Event} event 鼠标事件
   * @param {Object} countryData 国家数据
   */
  showTooltip(event, countryData) {
    if (!countryData) return;
    
    let tooltipHtml = `<strong>${countryData.name}</strong><br/>`;
    
    // **MODIFIED Tooltip Content**
    if (countryData.code === 'US') {
        // Special tooltip for US - maybe show count of countries targeting it?
        const targetingCountries = this.tariffData.countries.filter(c => c.response && c.response.length > 0);
        tooltipHtml += `<small>被 ${targetingCountries.length} 个主要经济体采取反制措施</small>`;
    } else {
        const usTariffRate = this.getUsTariffOnCountry(countryData);
        tooltipHtml += `美国对其关税率: ${usTariffRate}%<br/>`;
        
        if (countryData.tariffRate !== null && countryData.tariffRate !== undefined) {
            tooltipHtml += `该国对美反制/平均税率: ${countryData.tariffRate}%<br/>`;
        } else {
            // tooltipHtml += `该国对美反制/平均税率: N/A<br/>`;
        }
        if (countryData.response && countryData.response.length > 0) {
            tooltipHtml += `<small>有 ${countryData.response.length} 项反制措施</small>`;
        } else {
            tooltipHtml += `<small>无记录的反制措施</small>`;
        }
    }

    this.tooltip.transition()
      .duration(100)
      .style('opacity', 0.95);
      
    this.tooltip.html(tooltipHtml)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 28) + 'px');
  }
  
  /**
   * 隐藏提示框
   */
  hideTooltip() {
    this.tooltip.transition()
      .duration(200)
      .style('opacity', 0);
  }
  
  /**
   * 处理鼠标悬停事件
   * @param {Event} event 鼠标事件
   * @param {Object} d GeoJSON 数据点
   */
  handleMouseOver(event, d) {
    d3.select(event.currentTarget).raise(); // Bring path to front
    const countryCode3 = d.id;
    const countryData = this.findCountryData(countryCode3);
    
    if (this.isEUMember(countryCode3)) {
        this.handleEUInteraction(true); // Highlight all EU members
        // For EU tooltip, get the specific EU data object
        const euDataObject = this.tariffData.countries.find(c => c.code === 'EU') || {};
        this.showTooltip(event, euDataObject); // Show EU data in tooltip
    } else {
        this.handleEUInteraction(false); // Ensure EU is not highlighted if hovering over non-EU
        this.showTooltip(event, countryData); // Show data for the specific country
         // Apply hover style only to non-EU countries directly hovered
         if (countryCode3 !== 'USA') { // Don't apply stroke to US itself
             d3.select(event.currentTarget)
               .attr('stroke', '#333')
               .attr('stroke-width', 1);
         }
    }
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
   * @param {Event} event 鼠标事件
   */
  handleMouseOut(event) {
    const countryCode3 = d3.select(event.currentTarget).attr('data-country-code3');
    
    if (this.isEUMember(countryCode3)) {
        this.handleEUInteraction(false); // Remove highlight from all EU members
    } else {
        // Only reset non-EU country style if EU wasn't highlighted
         d3.select(event.currentTarget)
           .attr('stroke', '#fff')
           .attr('stroke-width', 0.5);
    }
    this.hideTooltip();
  }
  
  /**
   * 处理点击事件
   * @param {Event} event 鼠标事件
   * @param {Object} d GeoJSON 数据点
   */
  handleClick(event, d) {
    if (this.onCountryClick) {
      const countryCode3 = d.id;
      let countryData;

      if (this.isEUMember(countryCode3)) {
          countryData = this.euData; // If clicked on an EU member, show EU details
      } else {
          countryData = this.findCountryData(countryCode3);
      }
      
      if (countryData) {
          this.onCountryClick(countryData);
      } else {
           console.warn(`未找到国家数据: ${countryCode3}`);
      }
      
      // Add the calculated US tariff rate to the data passed to the click handler
       if (countryData && countryData.code !== 'US') { 
           countryData.usTariffRateOnCountry = this.getUsTariffOnCountry(countryData);
       }
       
       if (countryData) {
          this.onCountryClick(countryData);
       }
    }
  }
  
  /**
   * Helper to find country data by ISO A3 code
   * @param {string} code3 ISO A3 code
   * @returns {Object|null} Country data or null
   */
  findCountryData(code3) {
      return this.tariffData.countries.find(c => c.code3 === code3) || null;
  }
  
  /**
   * Helper to check if a country code (ISO A3) is an EU member
   * @param {string} code3 ISO A3 code
   * @returns {boolean}
   */
  isEUMember(code3) {
      return this.euData && this.euData.memberCountries && this.euData.memberCountries.includes(code3);
  }
  
  /**
   * Helper to apply/remove highlighting for EU members
   * @param {boolean} highlight True to highlight, false to remove
   */
  handleEUInteraction(highlight) {
      if (!this.euData || !this.euData.memberCountries) return;

      this.euData.memberCountries.forEach(memberCode3 => {
          const countryLayer = this.countryGeoMap[memberCode3];
          if (countryLayer) {
              d3.select(countryLayer)
                .classed('highlighted-eu-member', highlight)
                .attr('stroke', highlight ? '#1963c9' : '#fff')
                .attr('stroke-width', highlight ? 1.5 : 0.5);
              
              if (highlight) {
                  d3.select(countryLayer).raise(); // Bring highlighted paths to front
              }
          }
      });
      
      // 如果高亮，同时让欧盟标记更明显
      if (highlight) {
          this.euMarkerGroup
            .select('.eu-marker-inner')
            .transition()
            .duration(200)
            .attr('r', 7);
            
          this.euMarkerGroup
            .select('.eu-marker-outer')
            .transition()
            .duration(200)
            .style('opacity', 0.9);
      } else {
          this.euMarkerGroup
            .select('.eu-marker-inner')
            .transition()
            .duration(200)
            .attr('r', 5);
            
          this.euMarkerGroup
            .select('.eu-marker-outer')
            .transition()
            .duration(200)
            .style('opacity', 0.6);
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
      if (country.code3) {
        countryTariffMap[country.code3] = country;
      }
      if (country.code === 'EU') {
        this.euData = country;
      }
    });
    
    // 更新国家颜色
    this.mapGroup.selectAll('path.country')
      .transition()
      .duration(750)
      .attr('fill', d => {
        const countryCode3 = d.id;

        if (countryCode3 === 'USA') {
          return '#cbd5e0';
        }
        
        // 检查是否为欧盟成员国 (使用 ISO A3)
        if (this.isEUMember(countryCode3)) {
          return this.colorScale(this.getUsTariffOnCountry(this.euData));
        }
        
        const country = countryTariffMap[countryCode3];
        if (!country) {
          return '#f7fafc';
        }
        
        return this.colorScale(this.getUsTariffOnCountry(country));
      });
      
    // 更新标签
    this.labelsGroup.selectAll('text').remove();
    this.addCountryLabels(countryTariffMap);
    
    // 更新欧盟标记
    this.euMarkerGroup.selectAll('*').remove();
    this.addEUMarker();
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
       
    // 更新欧盟标记位置
    if (this.euData) {
      const euPosition = this.projection([this.euData.longitude, this.euData.latitude]);
      this.euMarkerGroup.selectAll('circle')
        .attr('cx', euPosition[0])
        .attr('cy', euPosition[1]);
    }
       
    // 更新图例位置
    this.legendGroup.attr('transform', `translate(40, ${this.height - 50})`);
  }
  
  /**
   * Helper: Calculate or retrieve the US tariff rate imposed ON a specific country.
   * Mirrors the logic in TariffBarChart.js's processDataForChart.
   * @param {Object} country Country data object from tariff_data.json
   * @returns {number} The applicable US tariff rate on this country.
   */
  getUsTariffOnCountry(country) {
      if (!country || country.code === 'US') return 0; // No self-tariff

      let usTariffRate = 10; // Default to baseline

      // Try to extract from history first (using the same simple parsing as barchart)
      if (country.usTariffHistory && country.usTariffHistory.length > 0) {
          let maxRateFound = 0;
          country.usTariffHistory.forEach(entry => {
              const textToSearch = (entry.description || '') + ' ' + (entry.details || '');
              const rateMatch = textToSearch.match(/(\d{1,3})%/);
              if (rateMatch) {
                  const rate = parseInt(rateMatch[1], 10);
                  if (rate > maxRateFound) maxRateFound = rate;
              }
          });
          if (maxRateFound > 10) usTariffRate = maxRateFound;
      }

      // Fallback/Override logic based on country code
      switch (country.code) {
          case 'CN': usTariffRate = 125; break;
          case 'CA': usTariffRate = 25; break;
          case 'MX': usTariffRate = 25; break;
          case 'EU': usTariffRate = 25; break;
          case 'JP': usTariffRate = 24; break;
          case 'IN': usTariffRate = 26; break;
      }
      
      return usTariffRate;
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TariffWorldMap;
} 