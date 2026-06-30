import json
from pathlib import Path

def main():
    project_root = Path(__file__).resolve().parent.parent.parent
    raw_path = project_root / "data" / "raw" / "raw_scrape_center_20260630.json"
    processed_path = project_root / "data" / "processed" / "clean_movies_20260630.json"

    with open(raw_path, "r", encoding="utf-8") as f:
        movies = json.load(f)

    for movie in movies:
        movie["id"] = int(movie["detail_url"].rstrip("/").split("/")[-1])

        rd = movie.get("release_date", "").replace(" 上映", "").strip()
        movie["release_date_clean"] = rd if rd else ""
        movie["score_num"] = float(movie.get("score", "0"))

    with open(processed_path, "w", encoding="utf-8") as f:
        json.dump(movies, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(movies)} movies -> {processed_path}")

if __name__ == "__main__":
    main()
