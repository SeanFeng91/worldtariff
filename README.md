# 全球关税数据可视化项目

这是一个用于展示全球关税数据和各国反制措施的可视化项目。

## 文件结构

- `tariff_dashboard.html` - 主要仪表盘界面，提供关税数据的综合展示
- `tariff_map.html` - 基于地图的关税数据可视化界面
- `components/` - 包含用于数据可视化的JavaScript组件
  - `TariffWorldMap.js` - 基于D3.js的世界地图组件
  - `TariffBarChart.js` - 柱状图组件，用于比较各国关税率
  - `TariffDataTable.js` - 数据表格组件，用于详细展示关税数据
- `data/` - 包含关税数据的JSON文件
  - `tariff_data.json` - 主要关税数据
  - `tariff_map_data.json` - 用于地图可视化的数据
  - `tariff_data_2025update.md` - 数据更新文档

## 如何使用

1. 启动本地服务器：

```bash
python -m http.server 8000
```

2. 在浏览器中访问：

- 仪表盘页面：http://localhost:8000/tariff_dashboard.html
- 地图页面：http://localhost:8000/tariff_map.html

## 数据格式

### tariff_data.json

```json
{
  "summary": {
    "averageTariff": 13.5,
    "highestTariff": {
      "country": "中国",
      "rate": 25
    },
    "responseCountries": 12
  },
  "countries": [
    {
      "name": "中国",
      "code": "CN",
      "region": "亚洲",
      "tariffRate": 7.5,
      "response": [
        {
          "type": "关税反制",
          "details": "对美国农产品和汽车加征25%的关税",
          "effectiveDate": "2025-01-15",
          "targetedSectors": ["农业", "汽车制造"]
        }
      ]
    }
  ]
}
```

### tariff_map_data.json

```json
{
  "countries": [
    {
      "name": "美国",
      "code": "US",
      "center": [37.0902, -95.7129],
      "policy": "对等关税政策",
      "measures": [
        {
          "type": "全球基准关税",
          "rate": "10%",
          "target": "所有进口商品",
          "date": "2025-04-02"
        }
      ]
    },
    {
      "name": "中国",
      "code": "CN",
      "center": [35.8617, 104.1954],
      "targets": [
        {
          "rate": "25%",
          "products": "价值500亿美元的半导体、关键矿产和医疗设备",
          "date": "2025-03-15"
        }
      ],
      "responses": [
        {
          "type": "精准反制",
          "content": "对同等价值的美国高科技产品加征25-30%关税",
          "date": "2025-03-20"
        }
      ]
    }
  ]
}
```

## 技术栈

- HTML5/CSS3
- JavaScript
- D3.js - 用于数据可视化
- Leaflet.js - 用于地图可视化
- Tailwind CSS - 用于界面样式 