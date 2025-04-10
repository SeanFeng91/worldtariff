/**
 * 关税数据表格组件
 * 用于以表格形式显示和分析各国关税数据
 */
class TariffDataTable {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   * @param {string} config.containerId 容器ID
   * @param {string} config.dataPath 数据路径
   * @param {number} config.pageSize 每页显示条数
   * @param {Array} config.columns 表格列配置
   * @param {Function} config.onRowClick 行点击回调
   */
  constructor(config) {
    this.containerId = config.containerId || 'tariff-data-table';
    this.dataPath = config.dataPath || 'data/tariff_data.json';
    this.pageSize = config.pageSize || 10;
    this.currentPage = 1;
    this.sortField = 'tariffRate';
    this.sortDirection = 'desc';
    this.filterRegion = 'all';
    this.searchQuery = '';
    this.onRowClick = config.onRowClick || null;
    
    // 默认列配置
    this.columns = config.columns || [
      { field: 'name', label: '国家/地区', sortable: true, width: '20%' },
      { field: 'tariffRate', label: '关税率(%)', sortable: true, width: '15%', type: 'number' },
      { field: 'response', label: '反制措施', sortable: false, width: '35%', type: 'array' },
      { field: 'effectiveDate', label: '生效日期', sortable: true, width: '15%', type: 'date' },
      { field: 'yearChange', label: '同比变化', sortable: true, width: '15%', type: 'change' }
    ];
    
    // 区域分组
    this.regions = [
      { id: 'all', name: '全部' },
      { id: 'asia', name: '亚洲' },
      { id: 'europe', name: '欧洲' },
      { id: 'america', name: '美洲' },
      { id: 'others', name: '其他' }
    ];
    
    // 国家区域映射
    this.countryRegions = {
      'CHN': 'asia', 'JPN': 'asia', 'KOR': 'asia', 'IND': 'asia', 'VNM': 'asia',
      'EU': 'europe', 'GBR': 'europe', 'RUS': 'europe',
      'USA': 'america', 'CAN': 'america', 'MEX': 'america', 'BRA': 'america',
      'AUS': 'others'
    };
    
    // 数据
    this.data = null;
    this.filteredData = null;
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化表格
   */
  init() {
    // 创建表格布局
    this.createLayout();
    
    // 添加样式
    this.addStyles();
    
    // 加载数据
    this.loadData();
    
    // 添加事件监听
    this.addEventListeners();
  }
  
  /**
   * 创建表格布局
   */
  createLayout() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`未找到ID为${this.containerId}的容器元素`);
      return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建表格组件
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'tariff-table-wrapper';
    
    // 创建工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'tariff-table-toolbar';
    
    // 创建搜索框
    const searchBox = document.createElement('div');
    searchBox.className = 'tariff-search-box';
    searchBox.innerHTML = `
      <input type="text" id="${this.containerId}-search" placeholder="搜索国家/地区..." />
      <button id="${this.containerId}-search-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    `;
    
    // 创建区域筛选
    const regionFilter = document.createElement('div');
    regionFilter.className = 'tariff-region-filter';
    regionFilter.innerHTML = `
      <span>区域筛选:</span>
      <select id="${this.containerId}-region">
        ${this.regions.map(region => `<option value="${region.id}">${region.name}</option>`).join('')}
      </select>
    `;
    
    // 添加到工具栏
    toolbar.appendChild(searchBox);
    toolbar.appendChild(regionFilter);
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'tariff-table';
    table.innerHTML = `
      <thead>
        <tr>
          ${this.columns.map(column => `
            <th style="width: ${column.width}" class="${column.sortable ? 'sortable' : ''}">
              ${column.label}
              ${column.sortable ? `<span class="sort-icon" data-field="${column.field}"></span>` : ''}
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody id="${this.containerId}-tbody">
        <tr>
          <td colspan="${this.columns.length}" class="loading">加载中...</td>
        </tr>
      </tbody>
    `;
    
    // 创建分页
    const pagination = document.createElement('div');
    pagination.className = 'tariff-pagination';
    pagination.id = `${this.containerId}-pagination`;
    
    // 组装组件
    tableWrapper.appendChild(toolbar);
    tableWrapper.appendChild(table);
    tableWrapper.appendChild(pagination);
    container.appendChild(tableWrapper);
  }
  
  /**
   * 添加样式
   */
  addStyles() {
    // 检查是否已存在样式
    if (document.getElementById('tariff-table-styles')) {
      return;
    }
    
    // 创建样式元素
    const style = document.createElement('style');
    style.id = 'tariff-table-styles';
    style.textContent = `
      .tariff-table-wrapper {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      
      .tariff-table-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #eee;
      }
      
      .tariff-search-box {
        position: relative;
        width: 250px;
      }
      
      .tariff-search-box input {
        width: 100%;
        padding: 8px 12px;
        padding-right: 35px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .tariff-search-box button {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
      }
      
      .tariff-region-filter {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .tariff-region-filter span {
        font-size: 14px;
        color: #666;
      }
      
      .tariff-region-filter select {
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .tariff-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .tariff-table th,
      .tariff-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }
      
      .tariff-table th {
        background-color: #f9f9f9;
        font-weight: 600;
        font-size: 14px;
      }
      
      .tariff-table tbody tr:hover {
        background-color: #f5f5f5;
        cursor: pointer;
      }
      
      .sortable {
        cursor: pointer;
        position: relative;
      }
      
      .sort-icon {
        position: relative;
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-left: 5px;
      }
      
      .sort-icon.asc::after {
        content: '↑';
        position: absolute;
        right: 0;
      }
      
      .sort-icon.desc::after {
        content: '↓';
        position: absolute;
        right: 0;
      }
      
      .tariff-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-top: 1px solid #eee;
      }
      
      .tariff-pagination-info {
        font-size: 14px;
        color: #666;
      }
      
      .tariff-pagination-buttons {
        display: flex;
        gap: 5px;
      }
      
      .tariff-pagination-buttons button {
        padding: 5px 10px;
        border: 1px solid #ddd;
        background-color: white;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .tariff-pagination-buttons button:hover {
        background-color: #f5f5f5;
      }
      
      .tariff-pagination-buttons button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tariff-pagination-buttons button.active {
        background-color: #1e40af;
        color: white;
        border-color: #1e40af;
      }
      
      .tariff-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .tariff-badge-red {
        background-color: #fee2e2;
        color: #dc2626;
      }
      
      .tariff-badge-green {
        background-color: #dcfce7;
        color: #16a34a;
      }
      
      .loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      
      .tariff-change-positive {
        color: #16a34a;
      }
      
      .tariff-change-negative {
        color: #dc2626;
      }
    `;
    
    // 添加到文档头部
    document.head.appendChild(style);
  }
  
  /**
   * 添加事件监听
   */
  addEventListeners() {
    // 搜索按钮点击事件
    const searchBtn = document.getElementById(`${this.containerId}-search-btn`);
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const searchInput = document.getElementById(`${this.containerId}-search`);
        this.search(searchInput.value);
      });
    }
    
    // 搜索框回车事件
    const searchInput = document.getElementById(`${this.containerId}-search`);
    if (searchInput) {
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.search(searchInput.value);
        }
      });
    }
    
    // 区域筛选事件
    const regionSelect = document.getElementById(`${this.containerId}-region`);
    if (regionSelect) {
      regionSelect.addEventListener('change', () => {
        this.filterRegion = regionSelect.value;
        this.currentPage = 1;
        this.filterAndRenderData();
      });
    }
    
    // 表头排序事件
    const tableHeaders = document.querySelectorAll(`#${this.containerId} .sortable`);
    tableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.querySelector('.sort-icon').dataset.field;
        this.sortData(field);
      });
    });
  }
  
  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 加载数据
      const response = await fetch(this.dataPath);
      const jsonData = await response.json();
      this.data = jsonData.countries;
      
      // 添加同比变化数据（模拟数据）
      this.data.forEach(country => {
        country.yearChange = Math.random() > 0.5 ? 
          Math.round(Math.random() * 10 * 10) / 10 : 
          -Math.round(Math.random() * 5 * 10) / 10;
          
        // 添加生效日期（模拟数据）
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60));
        country.effectiveDate = date.toISOString().split('T')[0];
      });
      
      // 过滤和渲染数据
      this.filterAndRenderData();
      
      console.log('关税数据表格数据加载完成');
    } catch (error) {
      console.error('加载数据失败:', error);
      const tbody = document.getElementById(`${this.containerId}-tbody`);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${this.columns.length}" class="loading">加载数据失败</td></tr>`;
      }
    }
  }
  
  /**
   * 排序数据
   * @param {string} field 排序字段
   */
  sortData(field) {
    // 如果点击当前排序字段，切换排序方向
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    
    // 更新排序图标
    const sortIcons = document.querySelectorAll(`#${this.containerId} .sort-icon`);
    sortIcons.forEach(icon => {
      if (icon.dataset.field === field) {
        icon.className = `sort-icon ${this.sortDirection}`;
      } else {
        icon.className = 'sort-icon';
      }
    });
    
    // 重新过滤和渲染数据
    this.filterAndRenderData();
  }
  
  /**
   * 过滤和渲染数据
   */
  filterAndRenderData() {
    if (!this.data) return;
    
    // 过滤数据
    this.filteredData = [...this.data];
    
    // 区域筛选
    if (this.filterRegion !== 'all') {
      this.filteredData = this.filteredData.filter(country => 
        this.countryRegions[country.code] === this.filterRegion
      );
    }
    
    // 搜索筛选
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredData = this.filteredData.filter(country => 
        country.name.toLowerCase().includes(query) || 
        country.code.toLowerCase().includes(query)
      );
    }
    
    // 排序数据
    this.filteredData.sort((a, b) => {
      let valueA, valueB;
      
      if (this.sortField === 'response') {
        valueA = a.response ? a.response.length : 0;
        valueB = b.response ? b.response.length : 0;
      } else {
        valueA = a[this.sortField];
        valueB = b[this.sortField];
      }
      
      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    // 渲染表格
    this.renderTable();
    this.renderPagination();
  }
  
  /**
   * 渲染表格
   */
  renderTable() {
    const tbody = document.getElementById(`${this.containerId}-tbody`);
    if (!tbody || !this.filteredData) return;
    
    // 计算当前页数据
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageData = this.filteredData.slice(startIndex, endIndex);
    
    // 清空表格
    tbody.innerHTML = '';
    
    // 无数据处理
    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${this.columns.length}" class="loading">没有匹配的数据</td></tr>`;
      return;
    }
    
    // 渲染数据
    pageData.forEach(country => {
      const row = document.createElement('tr');
      row.dataset.code = country.code;
      
      // 为每一列创建单元格
      this.columns.forEach(column => {
        const cell = document.createElement('td');
        
        // 根据列类型渲染内容
        switch (column.type) {
          case 'number':
            cell.textContent = country[column.field];
            break;
            
          case 'array':
            if (column.field === 'response' && country.response) {
              const responses = country.response.slice(0, 2);
              const html = responses.map(r => `
                <div style="margin-bottom: 4px;">
                  <span class="tariff-badge tariff-badge-red">${r.type}</span>
                  <div style="font-size: 12px; margin-top: 2px;">${r.details.substring(0, 40)}${r.details.length > 40 ? '...' : ''}</div>
                </div>
              `).join('');
              
              if (country.response.length > 2) {
                cell.innerHTML = html + `<div style="font-size: 12px; color: #666;">+${country.response.length - 2}项措施</div>`;
              } else {
                cell.innerHTML = html;
              }
            } else {
              cell.textContent = '无数据';
            }
            break;
            
          case 'date':
            cell.textContent = country[column.field] || '-';
            break;
            
          case 'change':
            const change = country[column.field];
            const isPositive = change > 0;
            cell.innerHTML = `
              <span class="${isPositive ? 'tariff-change-positive' : 'tariff-change-negative'}">
                ${isPositive ? '+' : ''}${change}%
              </span>
            `;
            break;
            
          default:
            cell.textContent = country[column.field] || '-';
        }
        
        row.appendChild(cell);
      });
      
      // 添加行点击事件
      if (this.onRowClick) {
        row.addEventListener('click', () => this.onRowClick(country));
      }
      
      tbody.appendChild(row);
    });
  }
  
  /**
   * 获取排序图标
   * @param {string} field 字段名
   * @returns {string} 排序图标HTML
   */
  getSortIcon(field) {
    if (this.sortField === field) {
      return this.sortDirection === 'asc' ? '↑' : '↓';
    }
    return '';
  }
  
  /**
   * 渲染分页
   */
  renderPagination() {
    const pagination = document.getElementById(`${this.containerId}-pagination`);
    if (!pagination || !this.filteredData) return;
    
    // 计算总页数
    const totalItems = this.filteredData.length;
    const totalPages = Math.ceil(totalItems / this.pageSize);
    
    // 创建分页内容
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'tariff-pagination-info';
    
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(startItem + this.pageSize - 1, totalItems);
    
    paginationInfo.textContent = `显示 ${startItem}-${endItem} 条，共 ${totalItems} 条`;
    
    // 创建分页按钮
    const paginationButtons = document.createElement('div');
    paginationButtons.className = 'tariff-pagination-buttons';
    
    // 添加上一页按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.disabled = this.currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.setPage(this.currentPage - 1);
      }
    });
    
    // 添加页码按钮
    const pageButtons = [];
    // 确定显示的页码范围
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // 调整开始页码，确保总是显示5个页码（如果有足够的页数）
    if (endPage - startPage < 4 && totalPages > 5) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = i === this.currentPage ? 'active' : '';
      pageButton.addEventListener('click', () => this.setPage(i));
      pageButtons.push(pageButton);
    }
    
    // 添加下一页按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.disabled = this.currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (this.currentPage < totalPages) {
        this.setPage(this.currentPage + 1);
      }
    });
    
    // 组装分页
    paginationButtons.appendChild(prevButton);
    pageButtons.forEach(button => paginationButtons.appendChild(button));
    paginationButtons.appendChild(nextButton);
    
    // 清空并添加新的分页内容
    pagination.innerHTML = '';
    pagination.appendChild(paginationInfo);
    pagination.appendChild(paginationButtons);
  }
  
  /**
   * 更新数据
   * @param {Array} newData 新数据
   */
  updateData(newData) {
    if (!newData) return;
    
    this.data = newData;
    this.currentPage = 1;
    
    // 重新过滤和渲染数据
    this.filterAndRenderData();
    
    // 重置搜索框
    const searchInput = document.getElementById(`${this.containerId}-search`);
    if (searchInput) {
      searchInput.value = '';
    }
  }
  
  /**
   * 更新配置
   * @param {Object} config 新配置
   */
  updateConfig(config) {
    if (!config) return;
    
    // 更新页码大小
    if (config.pageSize) {
      this.pageSize = config.pageSize;
      this.currentPage = 1;
    }
    
    // 更新列配置
    if (config.columns) {
      this.columns = config.columns;
      
      // 重新创建表格布局
      this.createLayout();
      this.addEventListeners();
    }
    
    // 重新渲染
    this.filterAndRenderData();
  }
  
  /**
   * 设置当前页
   * @param {number} page 页码
   */
  setPage(page) {
    this.currentPage = page;
    this.renderTable();
    this.renderPagination();
    
    // 滚动到表格顶部
    const container = document.getElementById(this.containerId);
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  /**
   * 搜索
   * @param {string} query 搜索关键词
   */
  search(query) {
    this.searchQuery = query;
    this.currentPage = 1;
    this.filterAndRenderData();
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TariffDataTable;
} 