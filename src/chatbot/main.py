import json
import os
import re
from pathlib import Path
from urllib.parse import quote, unquote

import requests
import urllib3
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_PATH = PROJECT_ROOT / "data" / "processed" / "clean_movies_20260630.json"

with open(PROCESSED_PATH, "r", encoding="utf-8") as f:
    MOVIES = json.load(f)

app = FastAPI(title="Movie Browser + MovieMind AI Chatbot")

app.mount("/components", StaticFiles(directory=str(PROJECT_ROOT / "dist" / "components")), name="components")
app.mount("/data", StaticFiles(directory=str(PROJECT_ROOT / "dist" / "data")), name="data")


@app.get("/")
def serve_index():
    return FileResponse(str(PROJECT_ROOT / "dist" / "index.html"))


@app.get("/api/movies")
def get_movies(sort: str = Query("category", pattern="^(category|date)$")):
    if sort == "category":
        cats: dict[str, list] = {}
        for m in MOVIES:
            for cat in m["categories"]:
                cats.setdefault(cat, []).append(m)
        result = {}
        for cat in sorted(cats.keys()):
            result[cat] = sorted(cats[cat], key=lambda m: m["score_num"], reverse=True)
        return result
    else:
        def sort_key(m):
            rd = m.get("release_date_clean", "")
            return rd if rd else "0000-00-00"
        sorted_movies = sorted(MOVIES, key=sort_key, reverse=True)
        return {"movies": sorted_movies}


# ── Intent configuration ──────────────────────────────────────
INTENTS = {
    "sadness":  {"words":["想哭","哭","悲傷","難過","感人","眼淚","虐心","催淚","悲劇","抑鬱","治癒","感動","痛哭","流淚","感傷"], "category":"剧情", "reply":"為您挑選感人至深的經典劇情神作 😢"},
    "romance":  {"words":["愛情","戀愛","浪漫","情侶","甜蜜","相愛","初戀","約會","真愛","閃光","心動"], "category":"爱情", "reply":"精選浪漫動人的愛情經典 🍿❤️"},
    "action":   {"words":["刺激","打架","爽片","熱血","動作","犯罪","槍戰","爆破","打鬥","警匪","黑幫","格鬥","冒險","打殺"], "category":"动作", "reply":"腎上腺素飆升的動作大片 🥋💥"},
    "comedy":   {"words":["搞笑","喜劇","幽默","爆笑","歡樂","放鬆","開心","有趣","無厘頭","笑死"], "category":"喜剧", "reply":"讓您大笑開懷的經典喜劇 🎭😂"},
    "scifi":    {"words":["科幻","宇宙","未來","外星人","末日","時空","機器人","高科技","AI"], "category":"科幻", "reply":"探索未知的科幻神作 🚀"},
    "suspense": {"words":["懸疑","燒腦","推理","解謎","驚悚","恐怖","反轉","心理","暗黑","謀殺","嚇人"], "category":"悬疑", "reply":"挑戰腦力的高分懸疑神作 🔍"},
    "animation":{"words":["動畫","卡通","宮崎駿","吉卜力","童年","溫馨","龍貓","千尋","動漫"], "category":"动画", "reply":"走進奇幻童真的動畫世界 🎨✨"},
    "war":      {"words":["戰爭","歷史","和平","軍事","二戰","史詩","納粹","將軍","士兵"], "category":"战争", "reply":"震撼人心的史詩戰爭大片 🎖️"},
}


class ChatRequest(BaseModel):
    message: str
    top_k: int = 3


class LLMRequest(BaseModel):
    provider: str
    model: str
    api_key: str
    messages: list


@app.post("/api/llm")
def llm_proxy(req: LLMRequest):
    """Proxy LLM calls to avoid CORS issues in the browser."""
    try:
        if req.provider == "gemini":
            model = req.model or "gemini-2.0-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={req.api_key}"
            # Convert messages to Gemini format
            parts = []
            for msg in req.messages:
                parts.append({"text": f"[{msg['role']}]: {msg['content']}"})
            resp = requests.post(url, json={
                "contents": [{"parts": parts}],
                "generationConfig": {"maxOutputTokens": 500, "temperature": 0.8},
            }, timeout=30)
            if resp.status_code != 200:
                return JSONResponse({"error": resp.text}, status_code=resp.status_code)
            data = resp.json()
            content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return JSONResponse({"content": content})
        else:
            # OpenAI / Grok (OpenAI-compatible)
            urls = {
                "openai": "https://api.openai.com/v1/chat/completions",
                "grok": "https://api.x.ai/v1/chat/completions",
            }
            url = urls.get(req.provider, urls["openai"])
            model = req.model or ("gpt-4o-mini" if req.provider == "openai" else "grok-3-mini")
            resp = requests.post(url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {req.api_key}",
                },
                json={
                    "model": model,
                    "messages": req.messages,
                    "max_tokens": 500,
                    "temperature": 0.8,
                },
                timeout=30,
            )
            if resp.status_code != 200:
                return JSONResponse({"error": resp.text}, status_code=resp.status_code)
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return JSONResponse({"content": content})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    msg = req.message.strip().lower()
    if not msg:
        return JSONResponse({"reply": "請輸入您的需求", "movies": []})

    # 1. Intent matching
    best_key, best_count = None, 0
    for key, cfg in INTENTS.items():
        count = sum(1 for w in cfg["words"] if w in msg)
        if count > best_count:
            best_count = count
            best_key = key

    if best_key and best_count > 0:
        cfg = INTENTS[best_key]
        matched = [m for m in MOVIES if cfg["category"] in ", ".join(m.get("categories", []))]
        matched.sort(key=lambda m: m.get("score_num", 0), reverse=True)
        return JSONResponse({"reply": cfg["reply"], "movies": matched[:req.top_k]})

    # 2. Fuzzy search
    fuzzy = []
    for m in MOVIES:
        title = m.get("title", "").lower()
        cats = ", ".join(m.get("categories", [])).lower()
        country = m.get("country", "").lower()
        if msg in title or msg in cats or msg in country:
            fuzzy.append(m)
    fuzzy.sort(key=lambda m: m.get("score_num", 0), reverse=True)

    if fuzzy:
        return JSONResponse({
            "reply": f"🔍 找到 {len(fuzzy)} 部相關影片，推薦最佳 {min(len(fuzzy), req.top_k)} 部：",
            "movies": fuzzy[:req.top_k]
        })

    # 3. Fallback
    return JSONResponse({
        "reply": f"抱歉，沒有找到與「{req.message}」相關的電影。<br>試試 🍿 盲盒抽片或 🔥 9.5分神作吧！",
        "movies": []
    })


# ── Movie detail scraper (director, actors, synopsis) ─────────
DETAIL_CACHE = {}


def scrape_detail(movie_id: int) -> dict:
    if movie_id in DETAIL_CACHE:
        return DETAIL_CACHE[movie_id]

    result = {"director": "", "director_photo": "", "synopsis": "", "actors": []}
    try:
        url = f"https://ssr1.scrape.center/detail/{movie_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10, verify=False)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract synopsis
        drama_el = soup.select_one(".drama p")
        if drama_el:
            result["synopsis"] = drama_el.get_text(strip=True)

        # Extract director
        director_section = soup.select_one(".directors")
        if director_section:
            director_cards = director_section.select(".director")
            if director_cards:
                d = director_cards[0]
                name_el = d.select_one(".name")
                img_el = d.select_one("img")
                if name_el:
                    result["director"] = name_el.get_text(strip=True)
                if img_el:
                    src = img_el.get("src", "")
                    if src and not src.startswith("http"):
                        src = "https://ssr1.scrape.center" + src
                    result["director_photo"] = src

        if not result["director"]:
            for el in soup.select(".item"):
                text = el.get_text(strip=True)
                if "導演" in text or "导演" in text:
                    result["director"] = text.split(":")[-1].split("：")[-1].strip()
                    break

        # Extract actors
        actors_section = soup.select_one(".actors")
        if actors_section:
            for actor_el in actors_section.select(".actor"):
                name_el = actor_el.select_one(".name")
                role_el = actor_el.select_one(".role")
                img_el = actor_el.select_one("img")
                photo = ""
                if img_el:
                    photo = img_el.get("src", "")
                    if photo and not photo.startswith("http"):
                        photo = "https://ssr1.scrape.center" + photo
                actor = {
                    "name": name_el.get_text(strip=True) if name_el else "",
                    "role": role_el.get_text(strip=True).replace("饰：", "") if role_el else "",
                    "photo": photo,
                }
                if actor["name"]:
                    result["actors"].append(actor)

    except Exception:
        pass

    DETAIL_CACHE[movie_id] = result
    return result


@app.get("/api/movie/{movie_id}/detail")
def movie_detail(movie_id: int):
    return JSONResponse(scrape_detail(movie_id))


# ── Detail page (self-contained) ─────────────────────────────
def _escape(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _img_tag(url: str, base: str, alt: str = "", css_class: str = "") -> str:
    if not url:
        return ""
    proxy = f"{base}/proxy/image?url={quote(url, safe='')}"
    cls = f' class="{css_class}"' if css_class else ""
    return (f'<img src="{url}" alt="{_escape(alt)}"{cls} loading="lazy" '
            f'onerror="this.onerror=null;this.src=\'{proxy}\';">')


def _stars_html(score_num: float) -> str:
    full = int(score_num // 2)
    half = 1 if (score_num % 2) >= 1 else 0
    empty = 5 - full - half
    return "★" * full + ("½" if half else "") + "☆" * empty


def _detail_page_html(movie: dict, detail: dict, base: str) -> str:
    title = _escape(movie.get("title", ""))
    cover_url = movie.get("cover", "")
    categories = movie.get("categories", [])
    country = _escape(movie.get("country", ""))
    runtime = _escape(movie.get("runtime", ""))
    release = _escape(movie.get("release_date_clean", movie.get("release_date", "")))
    score = movie.get("score", "")
    score_num = movie.get("score_num", 0)
    synopsis = _escape(detail.get("synopsis", ""))
    director = _escape(detail.get("director", ""))
    director_photo_url = detail.get("director_photo", "")
    actors = detail.get("actors", [])

    cat_html = "".join(
        f'<span class="dtag">{_escape(c)}</span>' for c in categories
    )

    cover_img = _img_tag(cover_url, base, title, "cover-img")

    actors_html = ""
    for a in actors:
        name = _escape(a.get("name", ""))
        role = _escape(a.get("role", ""))
        img = _img_tag(a.get("photo", ""), base, name)
        actors_html += f'''<div class="person-card">
          {img}
          <p class="person-name">{name}</p>
          <p class="person-role">{role}</p>
        </div>'''

    director_html = ""
    if director:
        d_img = _img_tag(director_photo_url, base, director)
        director_html = f'''<div class="detail-section">
        <h2>導演</h2>
        <div class="persons-row">
          <div class="person-card">
            {d_img}
            <p class="person-name">{director}</p>
          </div>
        </div>
      </div>'''

    actors_section = ""
    if actors_html:
        actors_section = f'''<div class="detail-section">
        <h2>演員</h2>
        <div class="persons-row">{actors_html}</div>
      </div>'''

    synopsis_html = ""
    if synopsis:
        synopsis_html = f'''<div class="synopsis">
          <h3>劇情簡介</h3>
          <p>{synopsis}</p>
        </div>'''

    return f'''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - 電影詳情</title>
  <link rel="stylesheet" href="/components/detail.css">
</head>
<body>
  <header class="detail-header">
    <div class="header-left">
      <a href="/" class="back-btn">&#8592; 返回電影列表</a>
      <a href="/?open=chatbot" class="back-btn back-btn--ai">🤖 返回AI小幫手</a>
    </div>
    <span class="header-title">🎬 HOT MOVIE小幫手</span>
  </header>

  <main class="detail-container">
    <div class="detail-card">
      <div class="detail-main">
        <div class="detail-poster">
          {cover_img}
        </div>
        <div class="detail-info">
          <h1 class="detail-title">{title}</h1>
          <div class="detail-categories">{cat_html}</div>
          <div class="detail-meta">
            <span class="meta-item">{country}</span>
            <span class="meta-sep">/</span>
            <span class="meta-item">{runtime}</span>
          </div>
          <div class="detail-release">{release} 上映</div>
          {synopsis_html}
        </div>
        <div class="detail-score-box">
          <p class="big-score">{score}</p>
          <p class="stars">{_stars_html(score_num)}</p>
        </div>
      </div>
    </div>

    {director_html}
    {actors_section}
  </main>

  <footer class="detail-footer">
    <p>&copy; 🎬 Movie Browser 電影瀏覽器. All Rights Reserved.</p>
  </footer>
</body>
</html>'''


@app.get("/detail/{movie_id}", response_class=HTMLResponse)
def detail_page(movie_id: int, request: Request):
    movie = next((m for m in MOVIES if m.get("id") == movie_id), None)
    if not movie:
        return HTMLResponse(content="<h2>找不到該電影</h2><p><a href='/'>返回首頁</a></p>", status_code=404)

    detail = scrape_detail(movie_id)
    base = str(request.base_url).rstrip("/")
    return HTMLResponse(content=_detail_page_html(movie, detail, base))


# ── Image proxy ───────────────────────────────────────────────
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://ssr1.scrape.center/",
}


@app.get("/proxy/image")
def proxy_image(url: str):
    """Proxy individual images to avoid hotlink/blocking."""
    try:
        resp = requests.get(url, headers=SCRAPE_HEADERS, timeout=(10, 30), verify=False, stream=True)
        return StreamingResponse(
            resp.iter_content(chunk_size=8192),
            media_type=resp.headers.get("Content-Type", "image/jpeg"),
            headers={
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception:
        # Return a 1x1 transparent pixel as fallback
        return StreamingResponse(
            iter([b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x00\x00\x02\x00\x01\xe5\x27\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82"]),
            media_type="image/png",
        )


# ── Hugging Face Spaces entry ─────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
