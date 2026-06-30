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
  - 8 種關鍵字意圖匹配（愛情、動作、懸疑、動畫...）
  - 6 個快捷鍵（盲盒抽片、9.5分神作...）
  - ⚙️ **LLM 設定** — 支援 OpenAI / Gemini / Grok API Key
  - 電影詳情卡片 + 打字機效果
- 🖼️ **圖片代理** — 自動繞過熱鏈封鎖，演員/導演照完整載入
- 📦 **一行嵌入** — `<script src="components/chatbot.js">` 即可在任何頁面加入

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
