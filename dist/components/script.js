let MOVIES = [];
let currentSort = "category";

async function loadMovies() {
  if (MOVIES.length > 0) return MOVIES;
  const res = await fetch("data/clean_movies_20260630.json");
  MOVIES = await res.json();
  return MOVIES;
}

function getCategoryView(movies) {
  const cats = {};
  movies.forEach(m => {
    (m.categories || []).forEach(cat => {
      cats[cat] = cats[cat] || [];
      cats[cat].push(m);
    });
  });
  return cats;
}

function getDateView(movies) {
  return [...movies].sort((a, b) => {
    const da = a.release_date_clean || "0000-00-00";
    const db = b.release_date_clean || "0000-00-00";
    return db.localeCompare(da);
  });
}

function buildCategoryView(cats) {
  let html = "";
  const sortedCats = Object.keys(cats).sort();
  for (const cat of sortedCats) {
    const movies = cats[cat].sort((a, b) => b.score_num - a.score_num);
    html += `<section class="category-section">`;
    html += `<h2 class="category-title">${cat} <span style="font-size:14px;color:#6e7681">(${movies.length}部)</span></h2>`;
    html += `<div class="movie-grid">`;
    movies.forEach(m => { html += renderCard(m); });
    html += `</div></section>`;
  }
  return html;
}

function buildDateView(movies) {
  let html = `<section class="category-section">`;
  html += `<h2 class="category-title">依上映時間排序</h2>`;
  html += `<div class="movie-grid">`;
  movies.forEach(m => { html += renderCard(m); });
  html += `</div></section>`;
  return html;
}

function renderCard(m) {
  const poster = m.id ? `components/posters/${m.id}.jpg` : "";
  const title = m.title || "";
  const score = m.score || "";
  const date = m.release_date_clean || "未提供";
  return `
    <div class="movie-card">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
      <div class="movie-info">
        <div class="movie-title" title="${title}">${title}</div>
        <div class="movie-meta">
          <span class="movie-score">${score}</span>
          <span class="movie-date">${date}</span>
        </div>
      </div>
    </div>`;
}

async function switchSort(sort) {
  currentSort = sort;
  document.getElementById("btn-category").classList.toggle("active", sort === "category");
  document.getElementById("btn-date").classList.toggle("active", sort === "date");

  document.getElementById("content").innerHTML = `<div class="loading">載入中...</div>`;
  const movies = await loadMovies();

  if (sort === "category") {
    const cats = getCategoryView(movies);
    document.getElementById("content").innerHTML = buildCategoryView(cats);
  } else {
    const sorted = getDateView(movies);
    document.getElementById("content").innerHTML = buildDateView(sorted);
  }
}

(async () => {
  const movies = await loadMovies();
  const cats = getCategoryView(movies);
  document.getElementById("content").innerHTML = buildCategoryView(cats);
})();
