import json
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_PATH = PROJECT_ROOT / "data" / "processed" / "clean_movies_20260630.json"

with open(PROCESSED_PATH, "r", encoding="utf-8") as f:
    MOVIES = json.load(f)

app = FastAPI(title="Movie Browser")

app.mount("/static", StaticFiles(directory=str(PROJECT_ROOT / "dist" / "components")), name="static")
app.mount("/posters", StaticFiles(directory=str(PROJECT_ROOT / "dist" / "components" / "posters")), name="posters")


@app.get("/")
def serve_index():
    return FileResponse(str(PROJECT_ROOT / "dist" / "html" / "index.html"))


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
