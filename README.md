# My Automation App

自動化專案：【自動爬蟲 → 資料清洗與整理 → 儲存資料 → 產出 Chatbot 與 HTML 互動 APP】

## 目錄結構

```
my-automation-app/
├── config/                  # 設定檔（爬蟲 Header、資料庫連線、API Key）
├── src/
│   ├── scrapers/            # 爬蟲模組（spider_*.py）
│   ├── processors/          # 資料處理模組（process_*.py）
│   └── chatbot/             # Chatbot 後端邏輯與 API 服務
├── data/
│   ├── raw/                 # 原始資料（唯讀，不可修改）
│   ├── processed/           # 清洗後資料（JSON/CSV）
│   └── vector_store/        # 向量資料庫（RAG 用）
├── dist/
│   ├── html/                # 互動網頁、Dashboard
│   └── components/          # 靜態資源（CSS, JS）
└── README.md
```

## 執行順序

1. **爬蟲** — `src/scrapers/` 寫入 `data/raw/`
2. **清洗** — `src/processors/` 讀取 `data/raw/`，寫入 `data/processed/`
3. **Chatbot** — `src/chatbot/` 讀取 `data/processed/`
4. **前端** — `dist/html/` 讀取 `data/processed/`

## 資料流原則

- 禁止跨級讀寫
- 前端唯讀（僅存取 `data/processed/`）
