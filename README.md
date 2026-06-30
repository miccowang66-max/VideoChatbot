---
title: HOT MOVIE小幫手
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# 🎬 HOT MOVIE小幫手 — Movie Browser + AI Chatbot

> 自動化專案：【爬蟲 → 清洗 → 儲存 → FastAPI 後端 → HTML 互動前端 + Chatbot 插件】

## 🌐 Live Demo

| Platform | URL |
|----------|-----|
| **Hugging Face** | [https://selinawang-MovieMind-AI.hf.space](https://selinawang-MovieMind-AI.hf.space) |
| **GitHub Pages** | [https://miccowang66-max.github.io/VideoChatbot/](https://miccowang66-max.github.io/VideoChatbot/) |
| **GitHub Repo** | [https://github.com/miccowang66-max/VideoChatbot](https://github.com/miccowang66-max/VideoChatbot) |

---

## 功能

- 🎬 **100 部經典電影瀏覽** — 附海報、評分、上映時間
- 📊 **類別 / 評分篩選** — 動態類別按鈕 + 6分以下/6-8分/9分以上過濾
- 📅 **兩種排序** — 類別分組 / 上映時間
- 🤖 **HOT MOVIE小幫手** Chatbot 浮動插件
  - Smart Search：自然語言解析 評分＋類別＋國家（如 `8分以上的日本動畫`）
  - 8 種關鍵字意圖匹配 + 6 個快捷鍵
  - ⚙️ **LLM 設定** — OpenAI / Gemini / Grok 三選一，儲存自動關閉面板
  - 電影詳情卡片 + 打字機效果
- 🖼️ **詳情頁代理** — HF 後端代理 scrape.center，圖片走 proxy 繞過熱鏈
- 🔗 **雙平台路由** — HF 用本地 `/detail/{id}`，GitHub Pages 自動導向 HF
- 📦 **一行嵌入** — `<script src="components/chatbot.js">` 即可在任何頁面加入

---

## ⚠️ 平台差異

| 功能 | Hugging Face | GitHub Pages |
|------|-------------|--------------|
| 電影主頁 + Chatbot | ✅ | ✅ |
| `/detail/{id}` 詳情頁 | ✅ FastAPI 代理 | ⚠️ 自動導向 HF |
| `/api/chat` | ✅ | ❌ 無後端 |
| 圖片代理 | ✅ | ❌ 無後端 |

---

## 🚀 本地啟動

```bash
pip install -r requirements.txt
python src/processors/process_movies.py
uvicorn src.chatbot.main:app --reload
# → http://localhost:8000
```

---

## 🔌 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | 主頁面 |
| GET | `/api/movies?sort=category\|date` | 電影列表 |
| POST | `/api/chat` | Chatbot 意圖匹配 |
| GET | `/detail/{id}` | 代理詳情頁（圖片重寫） |
| GET | `/proxy/image?url=...` | 圖片代理 |
| GET | `/api/movie/{id}/detail` | 導演資訊 |

---

## 🛠️ Tech Stack

| Layer | Tool |
|-------|------|
| Backend | FastAPI + Uvicorn |
| Scraping | Requests + BeautifulSoup |
| Frontend | Vanilla HTML/CSS/JS |
| Chatbot | Self-contained JS (keyword + LLM) |
| LLM | OpenAI / Gemini / Grok |
| Deployment | Docker → Hugging Face Spaces + GitHub Pages |
