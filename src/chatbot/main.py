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


# ── Movie detail scraper (director info) ──────────────────────
DETAIL_CACHE = {}


def scrape_detail(movie_id: int) -> dict:
    if movie_id in DETAIL_CACHE:
        return DETAIL_CACHE[movie_id]

    result = {"director": ""}
    try:
        url = f"https://ssr1.scrape.center/detail/{movie_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10, verify=False)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract director from detail page
        for el in soup.select(".item"):
            text = el.get_text(strip=True)
            if "導演" in text or "导演" in text:
                result["director"] = text.split(":")[-1].split("：")[-1].strip()
                break

        # Also try director span
        director_el = soup.select_one(".director") or soup.select_one("[class*='director']")
        if not result["director"] and director_el:
            result["director"] = director_el.get_text(strip=True)

        if not result["director"]:
            for el in soup.select(".el-row"):
                txt = el.get_text(strip=True)
                if "導演" in txt:
                    m = re.search(r"導演[：:]\s*(.+)", txt)
                    if m:
                        result["director"] = m.group(1).strip()

    except Exception:
        pass

    DETAIL_CACHE[movie_id] = result
    return result


@app.get("/api/movie/{movie_id}/detail")
def movie_detail(movie_id: int):
    return JSONResponse(scrape_detail(movie_id))


# ── Detail page proxy ─────────────────────────────────────────
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Referer": "https://ssr1.scrape.center/",
}


@app.get("/detail/{movie_id}", response_class=HTMLResponse)
def proxy_detail(movie_id: int, request: Request):
    """Proxy the detail page and rewrite asset/image URLs."""
    try:
        url = f"https://ssr1.scrape.center/detail/{movie_id}"
        resp = requests.get(url, headers=SCRAPE_HEADERS, timeout=15, verify=False)
        resp.encoding = "utf-8"
        html = resp.text

        base = str(request.base_url).rstrip("/")
        origin = "https://ssr1.scrape.center"

        # Rewrite relative asset URLs to absolute origin
        html = re.sub(r'(href|src)="/', rf'\1="{origin}/', html)
        html = re.sub(r"(href|src)='/", rf"\1='{origin}/", html)

        # Rewrite CSS url() for static resources
        html = re.sub(r'url\(["\']?/([^"\')\s]*\.(?:css|js|png|svg|ico|woff2?|ttf)[^"\')\s]*)["\']?\)',
                      lambda m: f'url("{origin}/{m.group(1)}")', html)

        # Rewrite image src to use our proxy
        html = re.sub(r'src="(https?://[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"',
                      lambda m: f'src="{base}/proxy/image?url={quote(m.group(1), safe="")}"', html)
        html = re.sub(r"src='(https?://[^']+\.(?:jpg|jpeg|png|webp|gif)[^']*)'",
                      lambda m: f"src='{base}/proxy/image?url={quote(m.group(1), safe='')}'", html)

        # Rewrite CSS url() image references
        html = re.sub(r'url\(["\']?(https?://[^"\')\s]+\.(?:jpg|jpeg|png|webp|gif)[^"\')\s]*)["\']?\)',
                      lambda m: f'url("{base}/proxy/image?url={quote(m.group(1), safe="")}")', html)

        # Inject <base> tag for relative paths
        html = html.replace("<head>", f'<head>\n  <base href="{origin}/">', 1)

        return HTMLResponse(content=html)
    except Exception as e:
        return HTMLResponse(content=f"<h2>無法載入詳情頁</h2><p>{e}</p>", status_code=502)


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
