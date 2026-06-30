---
title: MovieMind AI 影音特工
emoji: 🎬
colorFrom: blue
colorTo: orange
sdk: docker
pinned: false
---

# 🎬 MovieMind AI 影音特工 — Movie Browser + Chatbot

> 自動化專案：【爬蟲 → 清洗 → 儲存 → FastAPI 後端 → HTML 互動前端 + Chatbot 插件】
>
> 🌐 **Live Demo (GitHub Pages):** [https://miccowang66-max.github.io/VideoChatbot/](https://miccowang66-max.github.io/VideoChatbot/)
>
> 🤗 **Hugging Face Space:** _(deploy via Docker)_

---

## 功能

- ✅ 100 部電影瀏覽，附海報、評分、上映時間
- ✅ 兩種排序：**類別**（預設）/ **上映時間**
- ✅ **MovieMind AI 影音特工** Chatbot 浮動插件
  - 關鍵字意圖匹配（8 種場景）
  - 盲盒抽片、9.5 分神作等 6 個快捷鍵
  - ⚙️ **Gear 設定介面** — 支援使用者自訂 LLM API Key（OpenAI / OpenRouter）
  - 打字機效果、玻璃擬態 UI
- ✅ 一行嵌入：`<script src="chatbot.js"></script>` 即可在任何頁面加入 Chatbot
- ✅ FastAPI `POST /api/chat` 端點（後端意圖匹配）
- ✅ Docker 化部署（GitHub Pages + Hugging Face Spaces）

---

## 🚀 快速啟動

```bash
pip install -r requirements.txt
python src/processors/process_movies.py
uvicorn src.chatbot.main:app --reload
```

瀏覽器開啟 `http://localhost:8000`

---

## 📁 目錄結構

```
├── config/                  # 設定檔（Header、DB 連線、API Key）
├── src/
│   ├── scrapers/            # 爬蟲模組
│   ├── processors/          # 資料處理
│   └── chatbot/             # FastAPI 後端 + Chatbot API
├── data/
│   ├── raw/                 # 原始資料（唯讀）
│   ├── processed/           # 清洗後資料
│   └── vector_store/        # 向量資料庫（RAG）
├── dist/                    # 前端產出
│   ├── index.html           # 主頁面
│   └── components/
│       ├── chatbot.css      # Chatbot 插件樣式
│       ├── chatbot.js       # Chatbot 插件（含 LLM Gear 設定）
│       ├── script.js        # 電影瀏覽器邏輯
│       ├── style.css        # 主頁樣式
│       └── posters/         # 100 張海報
├── Dockerfile               # Hugging Face Spaces 部署
└── .github/workflows/       # GitHub Pages CI/CD
```

---

## 🔌 API 端點

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | 前端頁面 |
| GET | `/api/movies?sort=category\|date` | 電影列表（類別/時間排序） |
| POST | `/api/chat` | Chatbot 意圖匹配（`{"message":"..."}` → `{"reply":"...", "movies":[...]}`） |

---

## 🤖 Chatbot 插件使用方式

在任意 HTML 頁面加入兩行即可：

```html
<link rel="stylesheet" href="components/chatbot.css">
<script src="components/chatbot.js"></script>
```

插件會自動注入浮動按鈕 + 聊天面板 + ⚙️ LLM 設定介面。

---

## 🛠️ Tech Stack

| Layer | Tool |
|-------|------|
| Backend | FastAPI + Uvicorn |
| Frontend | Vanilla HTML/CSS/JS |
| Chatbot Plugin | Self-contained JS (keyword + LLM dual-mode) |
| LLM | OpenAI / OpenRouter (user-configured) |
| Deployment | Docker → Hugging Face Spaces, GitHub Pages |
| Runtime | Python ≥ 3.9 |
