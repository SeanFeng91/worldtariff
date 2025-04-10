/**
 * 关税柱状图组件
 * 用于可视化展示各国关税率对比数据
 */
class TariffBarChart {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   * @param {string} config.containerId 容器ID
   * @param {string} config.dataPath 数据路径
   * @param {number} config.width 图表宽度
   * @param {number} config.height 图表高度
   * @param {Object} config.margins 图表边距
   * @param {Function} config.onBarClick 柱状图点击回调
   */
  constructor(config) {
    this.containerId = config.containerId || 'tariff-bar-chart';
    this.dataPath = config.dataPath || 'data/tariff_data.json';
    this.width = config.width || 800;
    this.height = config.height || 400;
    this.margins = config.margins || { top: 40, right: 20, bottom: 80, left: 60 };
    this.onBarClick = config.onBarClick || null;
    
    // 数据
    this.data = null;
    this.processedChartData = null;
    
    // 颜色比例尺
    this.colorScale = d3.scaleThreshold()
      .domain([5, 7.5, 10, 15, 20, 25])
      .range(d3.schemeReds[7]);
      
    // 初始化
    this.init();
  }
  
  /**
   * 初始化图表
   */
  init() {
    // 创建SVG容器
    this.svg = d3.select('#' + this.containerId)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
      
    // 计算内部尺寸
    this.innerWidth = this.width - this.margins.left - this.margins.right;
    this.innerHeight = this.height - this.margins.top - this.margins.bottom;
    
    // 创建内部图表组
    this.chartGroup = this.svg.append('g')
      .attr('transform', `translate(${this.margins.left}, ${this.margins.top})`);
      
    // 创建X轴组
    this.xAxisGroup = this.chartGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${this.innerHeight})`);
      
    // 创建Y轴组
    this.yAxisGroup = this.chartGroup.append('g')
      .attr('class', 'y-axis');
      
    // 创建标题
    this.svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', this.width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('美国对主要贸易伙伴关税率对比');
      
    // 创建Y轴标签
    this.svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('关税率 (%)');
      
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
      const response = await d3.json(this.dataPath);
      this.data = response;
      
      // 提取并排序国家数据 - **MODIFIED LOGIC**
      this.processedChartData = this.processDataForChart(this.data.countries);
      
      this.drawChart();
      
      console.log('关税柱状图数据加载完成');
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }
  
  /**
   * Process country data specifically for this bar chart's purpose
   * (Showing US tariffs ON other countries)
   * @param {Array} countries Original country data array
   * @returns {Array} Processed data array for the chart
   */
  processDataForChart(countries) {
      const usTariffsOnCountries = countries
          .filter(c => c.code !== 'US') // Exclude the US itself
          .map(country => {
              let usTariffRate = 10; // Default to baseline

              // Try to extract the most relevant rate from usTariffHistory first
              if (country.usTariffHistory && country.usTariffHistory.length > 0) {
                   // Find the latest entry or the most representative one
                   // Simple approach: find the entry with the highest rate mentioned in description/details
                   let maxRateFound = 0;
                   country.usTariffHistory.forEach(entry => {
                       const desc = entry.description || '';
                       const details = entry.details || '';
                       const textToSearch = desc + ' ' + details;
                       const rateMatch = textToSearch.match(/(\d{1,3})%/);
                       if (rateMatch) {
                            const rate = parseInt(rateMatch[1], 10);
                            if (rate > maxRateFound) {
                                maxRateFound = rate;
                            }
                       }
                   });
                   // If a rate > baseline was found in history, use it.
                   // Otherwise, stick to baseline unless specific code logic overrides.
                    if (maxRateFound > 10) { 
                       usTariffRate = maxRateFound;
                   } 
                   // We might still need specific overrides for codes if history is ambiguous
              }

              // Fallback/Override logic based on country code (using latest verified rates)
              switch (country.code) {
                  case 'CN':
                      usTariffRate = 125; // Highest priority override
                      break;
                  case 'CA':
                       // Search results suggested 25%, history mentions 25% or 30%
                      usTariffRate = 25; // Use 25% based on latest check
                      break;
                  case 'MX':
                       // Search results suggested 25%
                      usTariffRate = 25; 
                      break;
                  case 'EU':
                       // Search results suggested 25%
                      usTariffRate = 25; 
                      break;
                   case 'JP':
                       // Search results suggested 24%
                      usTariffRate = 24; 
                      break;
                  case 'IN':
                       // Search results suggested 26%
                      usTariffRate = 26;
                      break;
                  // No default needed as baseline is set initially
              }
              
              // Return a new object structure suitable for the chart
              return {
                  code: country.code,
                  name: country.name,
                  usTariffRate: usTariffRate, // The rate US imposes ON this country
                  originalData: country // Keep reference if needed for clicks etc.
              };
          });
          
      // Sort by the US tariff rate, descending
      usTariffsOnCountries.sort((a, b) => b.usTariffRate - a.usTariffRate);
      
      return usTariffsOnCountries;
  }
  
  /**
   * 绘制图表
   */
  drawChart() {
    if (!this.data || !this.processedChartData) {
      console.error('图表数据未加载或处理');
      return;
    }
    
    // 过滤显示的国家数量 (use processed data)
    const visibleCountries = this.processedChartData.slice(0, 10);
    
    // 创建X比例尺
    this.xScale = d3.scaleBand()
      .domain(visibleCountries.map(c => c.code))
      .range([0, this.innerWidth])
      .padding(0.2);
      
    // 创建Y比例尺 (use usTariffRate)
    this.yScale = d3.scaleLinear()
      .domain([0, d3.max(visibleCountries, d => d.usTariffRate) * 1.1])
      .range([this.innerHeight, 0]);
      
    // 绘制X轴
    this.xAxisGroup.call(
      d3.axisBottom(this.xScale)
        .tickFormat(code => {
          const country = visibleCountries.find(c => c.code === code);
          return country ? country.name : code;
        })
    )
    .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('font-size', '10px');
      
    // 绘制Y轴
    this.yAxisGroup.call(
      d3.axisLeft(this.yScale)
        .tickFormat(d => d + '%')
        .ticks(5)
    );
    
    // 绘制柱状图
    this.chartGroup.selectAll('.bar')
      .data(visibleCountries)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => this.xScale(d.code))
      .attr('y', d => this.yScale(d.usTariffRate))
      .attr('width', this.xScale.bandwidth())
      .attr('height', d => this.innerHeight - this.yScale(d.usTariffRate))
      .attr('fill', d => this.colorScale(d.usTariffRate))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', this.handleMouseOver.bind(this))
      .on('mousemove', this.handleMouseMove.bind(this))
      .on('mouseout', this.handleMouseOut.bind(this))
      .on('click', this.handleClick.bind(this));
      
    // 添加数值标签
    this.chartGroup.selectAll('.bar-label')
      .data(visibleCountries)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => this.xScale(d.code) + this.xScale.bandwidth() / 2)
      .attr('y', d => this.yScale(d.usTariffRate) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => d.usTariffRate + '%');
      
    // 添加全球平均线 (This average might be less relevant now, consider removing or changing)
    // const avgTariff = this.data.summary.averageTariff; 
    // Temporarily removing the average line as it represents something different
     this.chartGroup.selectAll('.avg-line').remove();
     this.chartGroup.selectAll('.avg-line-label').remove();
  }
  
  /**
   * 处理鼠标悬停事件
   * @param {Event} event 事件对象
   * @param {Object} d 数据对象
   */
  handleMouseOver(event, d) {
    // 高亮柱状图
    d3.select(event.currentTarget)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);
      
    // 显示提示框
    this.tooltip.transition()
      .duration(200)
      .style('opacity', 0.9);
      
    // 设置提示框内容 (**MODIFIED**)
    this.tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 5px;">${d.name}</div>
      <div>美国对其关税率: ${d.usTariffRate}%</div>
      ${this.getResponseHtml(d.originalData.response)} 
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
    // 恢复柱状图样式
    d3.select(event.currentTarget)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
      
    // 隐藏提示框
    this.tooltip.transition()
      .duration(500)
      .style('opacity', 0);
  }
  
  /**
   * 处理点击事件
   * @param {Event} event 事件对象
   * @param {Object} d 数据对象 (processed chart data)
   */
  handleClick(event, d) {
    if (this.onBarClick && d.originalData) {
      this.onBarClick(d.originalData); // Pass the original country data object
    }
  }
  
  /**
   * 获取响应措施HTML
   * @param {Array} responses 响应措施数组
   * @returns {string} HTML字符串
   */
  getResponseHtml(responses) {
    if (!responses || responses.length === 0) {
      return '<div>无反制措施</div>';
    }
    
    let html = '<div style="margin-top: 5px;"><strong>反制措施:</strong></div><ul style="margin: 5px 0 0 15px; padding: 0;">';
    
    responses.slice(0, 2).forEach(response => {
      html += `<li>${response.type}</li>`;
    });
    
    if (responses.length > 2) {
      html += `<li>...共${responses.length}项措施</li>`;
    }
    
    html += '</ul>';
    return html;
  }
  
  /**
   * 更新数据
   * @param {Object} newData 新数据
   */
  updateData(newData) {
    this.data = newData;
    
    // 提取并排序国家数据 - **MODIFIED LOGIC**
    this.processedChartData = this.processDataForChart(this.data.countries);
    
    // 清除现有图表元素
    this.chartGroup.selectAll('.bar').remove();
    this.chartGroup.selectAll('.bar-label').remove();
    this.chartGroup.selectAll('.avg-line').remove();
    this.chartGroup.selectAll('.avg-line-label').remove();
    
    // 重新绘制图表
    this.drawChart();
  }
  
  /**
   * 更新图表排序
   * @param {string} sortBy 排序字段
   * @param {boolean} ascending 是否升序
   */
  updateSort(sortBy = 'tariffRate', ascending = false) {
     // **MODIFIED LOGIC** - Sort processedChartData based on usTariffRate
    if (!this.processedChartData) return;

    const direction = ascending ? 1 : -1;
    this.processedChartData.sort((a, b) => {
       // Assuming sorting is primarily by the displayed rate (usTariffRate)
       const valA = a.usTariffRate;
       const valB = b.usTariffRate;
       
       if (valA < valB) return -1 * direction;
       if (valA > valB) return 1 * direction;
       // Secondary sort by name if rates are equal
       return a.name.localeCompare(b.name);
    });
    
    this.drawChart(); // Redraw after sorting
  }
  
  /**
   * 调整图表大小
   * @param {number} width 新宽度
   * @param {number} height 新高度
   */
  resize(width, height) {
    this.width = width || this.width;
    this.height = height || this.height;
    
    // 更新内部尺寸
    this.innerWidth = this.width - this.margins.left - this.margins.right;
    this.innerHeight = this.height - this.margins.top - this.margins.bottom;
    
    // 更新SVG尺寸
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);
      
    // 更新标题位置
    this.svg.select('.chart-title')
      .attr('x', this.width / 2);
      
    // 更新Y轴标签位置
    this.svg.select('.y-axis-label')
      .attr('x', -this.height / 2);
      
    // 清除现有图表元素
    this.chartGroup.selectAll('.bar').remove();
    this.chartGroup.selectAll('.bar-label').remove();
    this.chartGroup.selectAll('.avg-line').remove();
    this.chartGroup.selectAll('.avg-line-label').remove();
    
    // 重新绘制图表
    this.drawChart();
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TariffBarChart;
} 