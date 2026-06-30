# 🎬 Movie Browser — 電影瀏覽器

> 自動化專案：【爬蟲 → 清洗 → 儲存 → FastAPI 後端 → HTML 互動前端】
>
> 🌐 **Live Demo:** [https://miccowang66-max.github.io/VideoChatbot/](https://miccowang66-max.github.io/VideoChatbot/)

---

## 功能

- ✅ 100 部電影瀏覽，附海報、評分、上映時間
- ✅ 兩種排序方式：**類別**（預設） / **上映時間**
- ✅ FastAPI 後端 + 純靜態前端（可獨立部署至 GitHub Pages）
- ✅ 嚴格資料流控管（raw → processed → 前端唯讀）

---

## 🚀 快速啟動

```bash
# 安裝依賴
pip install -r requirements.txt

# 處理原始資料（raw → processed）
python src/processors/process_movies.py

# 啟動 FastAPI 伺服器
uvicorn src.chatbot.main:app --reload
```

瀏覽器開啟 `http://localhost:8000`

---

## 🖥️ Live Demo（GitHub Pages）

Demo 由 `.github/workflows/pages.yml` 自動部署。

> 首次使用請到 **Settings → Pages**：
> - Source: **Deploy from a branch**
> - Branch: **gh-pages** / **/ (root)**
> - 儲存後 workflow 會自動構建

---

## 📁 目錄結構

```
├── config/                  # 設定檔（Header、DB 連線、API Key）
├── src/
│   ├── scrapers/            # 爬蟲模組（spider_*.py）
│   ├── processors/          # 資料處理（process_*.py）
│   └── chatbot/             # FastAPI 後端 + API
├── data/
│   ├── raw/                 # 原始資料（唯讀）
│   ├── processed/           # 清洗後資料
│   └── vector_store/        # 向量資料庫（RAG）
├── dist/                    # 前端產出（靜態部署）
│   ├── index.html           # 主頁面
│   ├── components/          # CSS / JS / Posters
│   └── data/                # 靜態 JSON（供前端讀取）
└── .github/workflows/       # CI/CD（GitHub Pages 部署）
```

---

## 📐 資料流原則

```
scrapers ──(write)──▶ data/raw/
processors ──(read)──▶ data/raw/ ──(write)──▶ data/processed/
chatbot / frontend ──(read ONLY)──▶ data/processed/
```

- ❌ 禁止跨級讀寫
- ❌ 前端絕不直接呼叫爬蟲或讀取 raw 資料

---

## 🔌 API 端點

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | 前端頁面 |
| GET | `/api/movies?sort=category` | 依類別分組排序 |
| GET | `/api/movies?sort=date` | 依上映時間排序 |

---

## 🛠️ Tech Stack

| Layer | Tool |
|-------|------|
| Backend | FastAPI + Uvicorn |
| Frontend | Vanilla HTML/CSS/JS |
| Data | Pandas (cleaning), JSON |
| Deployment | GitHub Actions → GitHub Pages |
| Runtime | Python ≥ 3.9 |
