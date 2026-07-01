# CHANGELOG — HOT MOVIE小幫手

## 2026-07-01 改善紀錄

### 1. 電影詳情頁重構
**問題**: 原本 `/detail/{id}` 透過 proxy 抓取 scrape.center 整頁 HTML，導致 CSS/字體跨域載入失敗，排版與原站不同。

**解決**:
- 移除 proxy 方式，改為自建詳情頁面（`main.py` 伺服器端渲染）
- 新增 `dist/components/detail.css` 獨立樣式
- 頁面包含：海報、標題、類別、評分、劇情簡介、導演、演員
- 所有圖片使用 direct URL + proxy fallback（`onerror` 自動切換）
- 新增「← 返回電影列表」按鈕

### 2. 返回導航功能
**問題**: 進入詳情頁後無法回到主頁或 AI 小幫手。

**解決**:
- 詳情頁 header 新增「🤖 返回AI小幫手」按鈕（連結 `/?open=chatbot`）
- 主頁 chatbot.js 偵測 URL 參數 `?open=chatbot`，自動開啟聊天視窗
- HF Space：同頁導航（`target="_self"`）
- GitHub Pages：新分頁開啟（`target="_blank"`）

### 3. Chatbot 詳情連結
**問題**: chatbot 內的電影詳情無法查看完整資訊。

**解決**:
- chatbot 詳情視圖新增「🔍 查看完整詳情（導演/演員/劇情）▸」按鈕
- 點擊後新分頁開啟完整詳情頁

### 4. 圖片載入優化
**問題**: 導演/演員照片無法全數呈現（proxy 超時）。

**解決**:
- 改用 meituan.net 直接 URL 載入
- `onerror` fallback 到 proxy（若直接載入失敗）
- 測試結果：32 張圖片全部 direct load OK

### 5. LLM 整合修正
**問題**: 選擇 Grok LLM 後，chatbot 回應不智能。

**根本原因**:
- CORS 限制：瀏覽器無法直接呼叫 Grok API
- 模型名稱錯誤：原本用 `grok-2`，正確為 `grok-3-mini` / `grok-3`

**解決**:
- 新增 `/api/llm` 後端 proxy 端點（`main.py`）
- chatbot.js 改為呼叫 `/api/llm` 而非直接呼叫外部 API
- 修正模型名稱：`grok-3-mini`、`grok-3`
- 改善 system prompt：加入同義詞理解（如「可怕」=「驚悚/恐怖」）
- LLM 回應格式改用 `[[movie_ids]]` 標籤，更可靠解析
- max_tokens 從 200 提升至 500

### 6. LLM Model 名稱對照表

| Provider | 正確 Model 名稱 |
|----------|-----------------|
| OpenAI   | gpt-4o-mini, gpt-4o, gpt-3.5-turbo |
| Gemini   | gemini-2.0-flash, gemini-2.5-pro, gemini-1.5-pro |
| Grok     | grok-3-mini, grok-3 |

### 7. 部署紀錄
- GitHub Pages: 自動部署（push to `main`）
- HF Space: 手動上傳（`huggingface_hub` API）
- HF Space URL: https://selinawang-MovieMind-AI.hf.space/
- GitHub Pages URL: https://miccowang66-max.github.io/VideoChatbot/

### 8. 已知待處理事項
- [ ] Grok API Key 需用戶自行到 https://console.x.ai 申請
- [ ] LLM 功能需要有效的 API Key 才能運作
- [ ] 目前 Grok API 回報 "Incorrect API key"，用戶需確認 Key 格式為 `xai-...` 開頭
