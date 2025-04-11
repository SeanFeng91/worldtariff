# fetch_stock_data.py

import requests
import json
import os
from datetime import datetime
import time

# --- 配置 ---
# 替换为你自己的 Alpha Vantage API Key
# 你可以从 https://www.alphavantage.co/support/#api-key 获取免费的 API Key
ALPHA_VANTAGE_API_KEY = 'SFQWOYE7LHWY8WMC' # 强烈建议从环境变量或配置文件读取

# 需要获取数据的股票/ETF代码
SYMBOLS = {
    'SPY': 'S&P 500 (SPY)',
    'QQQ': 'Nasdaq (QQQ)',
    'EXS1.DE': 'DAX (EXS1.DE)',      # DAX ETF (XETRA) - 确保文件名与 index.html 中一致
    'ASHR': 'China A50 (ASHR)',   # CSI 300 ETF (US Listed)
    'EWJ': 'Japan (EWJ)'         # MSCI Japan ETF (US Listed)
}

# 数据保存目录 (相对于脚本所在位置)
OUTPUT_DIR = 'data/stock'

# Alpha Vantage API 设置
BASE_URL = 'https://www.alphavantage.co/query'
FUNCTION = 'TIME_SERIES_DAILY'
OUTPUT_SIZE = 'compact' # 'compact' 获取最近100天, 'full' 获取更长时间序列

# --- 脚本逻辑 ---

def fetch_and_save_stock_data():
    """获取 Alpha Vantage 数据并保存到本地 JSON 文件。"""
    print(f"开始获取股市数据...")
    if not os.path.exists(OUTPUT_DIR):
        try:
            os.makedirs(OUTPUT_DIR)
            print(f"创建目录: {OUTPUT_DIR}")
        except OSError as e:
            print(f"错误：无法创建目录 {OUTPUT_DIR}: {e}")
            return

    # Alpha Vantage 免费 API 有频率限制 (例如每分钟5次调用)
    # 添加延迟以避免超出限制
    call_interval_seconds = 15 # 每两次调用之间等待 15 秒

    symbols_processed = 0
    total_symbols = len(SYMBOLS)

    for symbol, description in SYMBOLS.items():
        print(f"\n[{symbols_processed + 1}/{total_symbols}] 正在处理: {symbol} ({description})")

        # 构建 API 请求 URL
        params = {
            'function': FUNCTION,
            'symbol': symbol,
            'outputsize': OUTPUT_SIZE,
            'apikey': ALPHA_VANTAGE_API_KEY,
            'datatype': 'json' # 明确指定json格式
        }

        try:
            # 发起 API 请求
            response = requests.get(BASE_URL, params=params)
            response.raise_for_status() # 如果 HTTP 请求失败 (例如 404, 500), 抛出异常

            data = response.json()

            # 检查 Alpha Vantage 返回的错误或提示信息
            if "Error Message" in data:
                print(f"  错误 (来自 Alpha Vantage): {data['Error Message']}")
                continue # 跳过这个 symbol
            if "Note" in data and "API call frequency" in data["Note"]:
                 print(f"  警告: 达到 Alpha Vantage API 频率限制。请稍后再试或升级 API Key。")
                 print(f"  提示: {data['Note']}")
                 # 脚本将继续尝试下一个，但可能也会失败
                 # 可以考虑在这里增加更长的等待时间或停止脚本
                 # time.sleep(60) # 例如等待一分钟
                 continue
            if "Information" in data: # 有时会返回信息而不是错误
                print(f"  信息 (来自 Alpha Vantage): {data['Information']}")
                continue

            # 提取时间序列数据
            time_series_key = 'Time Series (Daily)'
            if time_series_key not in data:
                print(f"  错误: 在返回的数据中未找到 '{time_series_key}'。")
                # print("  收到的数据:", json.dumps(data, indent=2)) # 取消注释以查看完整响应
                continue

            time_series_data = data[time_series_key]

            # 构建输出文件路径 - 确保文件名与 index.html 中使用的完全一致
            # 对于包含 '.' 的代码 (如 'EXS1.DE'), 文件名也应包含 '.'
            file_name = f"{symbol}.json"
            output_path = os.path.join(OUTPUT_DIR, file_name)

            # 保存数据到 JSON 文件
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(time_series_data, f, ensure_ascii=False, indent=4)
                print(f"  成功: 数据已保存到 {output_path}")
                symbols_processed += 1

            except IOError as e:
                print(f"  错误: 无法写入文件 {output_path}: {e}")

        except requests.exceptions.RequestException as e:
            print(f"  错误: 请求 Alpha Vantage API 失败: {e}")
        except json.JSONDecodeError:
            print(f"  错误: 解析 Alpha Vantage API 响应失败 (可能不是有效的 JSON)。")
            print(f"  响应内容:\n{response.text[:500]}...") # 打印部分响应内容帮助调试
        except Exception as e:
            print(f"  发生未知错误: {e}")

        # 在每次调用后等待，避免超出频率限制
        if symbols_processed < total_symbols: # 不是最后一个 symbol 才需要等待
             print(f"  等待 {call_interval_seconds} 秒...")
             time.sleep(call_interval_seconds)


    print(f"\n处理完成。成功获取并保存了 {symbols_processed}/{total_symbols} 个指数的数据。")

if __name__ == "__main__":
    fetch_and_save_stock_data()