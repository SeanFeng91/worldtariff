
# 全球关税数据可视化项目

## 项目简介

这是一个专注于展示全球关税政策和各国反制措施的可视化平台。项目通过直观的地图、图表和数据表格，帮助用户了解美国关税政策及其对全球贸易体系的影响。

## 功能特点

- **世界关税地图**：通过交互式世界地图直观展示各国关税情况
- **关税数据表格**：详细列出各国关税详情和反制措施
- **柱状图比较**：直观对比主要贸易伙伴的关税率
- **时间轴展示**：跟踪美国对华关税政策的历史变化
- **详情面板**：点击国家可查看详细的关税政策和反制措施
- **趋势分析**：展示区域关税变化和各类反制措施使用情况

## 项目结构

```
/
├── index.html            # 主页面
├── components/           # 可视化组件
│   ├── TariffWorldMap.js   # 世界地图组件
│   ├── TariffBarChart.js   # 柱状图组件
│   └── TariffDataTable.js  # 数据表格组件
├── data/                 # 数据文件
│   └── tariff_data.json    # 关税数据
└── favicon.ico           # 网站图标
```

## 技术栈

- **HTML5/CSS3** - 页面结构和样式
- **JavaScript** - 交互逻辑
- **Tailwind CSS** - 界面样式和组件
- **D3.js** - 数据可视化图表
- **Leaflet.js** - 交互式地图

## 如何使用

1. **克隆项目**：
   ```bash
   git clone [项目仓库URL]
   cd 全球关税数据可视化项目
   ```

2. **启动本地服务器**：
   ```bash
   # 使用Python启动简易服务器
   python -m http.server 8000
   # 或使用Node.js的http-server
   npx http-server
   ```

3. **在浏览器中访问**：
   - 打开浏览器，访问 `http://localhost:8000`

## 数据说明

项目使用`data/tariff_data.json`存储关税数据，包含：

- 全球关税概览数据
- 各国具体关税率信息
- 各国对美国关税政策的反制措施
- 关税事件时间轴数据
- 区域关税变化情况
- 各类反制措施使用趋势

数据格式示例：

```json
{
  "summary": {
    "averageTariff": 13.5,
    "highestTariff": {
      "country": "中国",
      "rate": 25,
      "targetSectors": "电子产品、机械设备"
    }
  },
  "countries": [
    {
      "name": "中国",
      "code": "CN",
      "tariffRate": 7.5,
      "response": [
        {
          "type": "关税反制",
          "details": "对美国农产品加征25%关税",
          "targetedSectors": ["农业", "汽车制造"]
        }
      ]
    }
  ]
}
```

## 定制与扩展

- 更新`data/tariff_data.json`以反映最新的关税数据
- 在`components/`目录添加新的可视化组件
- 修改`index.html`中的样式以适应不同的展示需求

## 浏览器兼容性

项目支持所有现代浏览器（Chrome、Firefox、Safari、Edge等），需要启用JavaScript。

---

*数据最后更新：2025年4月10日*
