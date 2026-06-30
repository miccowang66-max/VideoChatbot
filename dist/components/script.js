let MOVIES = [];
let currentSort = "category";
let currentScore = "all";
let currentCategory = null;

async function loadMovies() {
  if (MOVIES.length > 0) return MOVIES;
  const res = await fetch("data/clean_movies_20260630.json");
  MOVIES = await res.json();
  return MOVIES;
}

// ── Filters ─────────────────────────────────────────────────
function filterByScore(movies) {
  if (currentScore === "all") return movies;
  return movies.filter(m => {
    const s = m.score_num || 0;
    if (currentScore === "low") return s < 6;
    if (currentScore === "mid") return s >= 6 && s < 9;
    if (currentScore === "high") return s >= 9;
    return true;
  });
}

function filterByCategory(movies) {
  if (!currentCategory) return movies;
  return movies.filter(m => {
    const cats = m.categories || [];
    return cats.includes(currentCategory);
  });
}

function getAllCategories() {
  const catSet = new Set();
  MOVIES.forEach(m => (m.categories || []).forEach(c => catSet.add(c)));
  return [...catSet].sort();
}

function applyFilters(movies) {
  let result = filterByScore(movies);
  result = filterByCategory(result);
  return result;
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

// ── Render ──────────────────────────────────────────────────
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
  if (!sortedCats.length) html = `<div class="loading">沒有符合條件的電影</div>`;
  return html;
}

function buildDateView(movies) {
  if (!movies.length) return `<div class="loading">沒有符合條件的電影</div>`;
  let html = `<section class="category-section">`;
  html += `<h2 class="category-title">依上映時間排序</h2>`;
  html += `<div class="movie-grid">`;
  movies.forEach(m => { html += renderCard(m); });
  html += `</div></section>`;
  return html;
}

function renderCard(m) {
  const poster = m.cover || (m.id ? `components/posters/${m.id}.jpg` : "");
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

// ── Render category buttons ─────────────────────────────────
function renderCategoryButtons() {
  const cats = getAllCategories();
  let html = `<button class="sort-btn active" onclick="setCategoryFilter(null)" id="btn-cat-all">全部</button>`;
  cats.forEach(cat => {
    html += `<button class="sort-btn" onclick="setCategoryFilter('${cat}')" id="btn-cat-${cat}">${cat}</button>`;
  });
  document.getElementById("category-btns").innerHTML = html;
}

// ── Actions ─────────────────────────────────────────────────
function rerender() {
  const movies = applyFilters(MOVIES);
  if (currentSort === "category") {
    const cats = getCategoryView(movies);
    document.getElementById("content").innerHTML = buildCategoryView(cats);
  } else {
    const sorted = getDateView(movies);
    document.getElementById("content").innerHTML = buildDateView(sorted);
  }
}

function switchSort(sort) {
  currentSort = sort;
  document.getElementById("btn-category").classList.toggle("active", sort === "category");
  document.getElementById("btn-date").classList.toggle("active", sort === "date");
  rerender();
}

function setScoreFilter(filter) {
  currentScore = filter;
  document.querySelectorAll("#btn-score-all, #btn-score-low, #btn-score-mid, #btn-score-high").forEach(b => b.classList.remove("active"));
  document.getElementById("btn-score-" + filter).classList.add("active");
  rerender();
}

function setCategoryFilter(cat) {
  currentCategory = cat;
  document.querySelectorAll("#category-btns .sort-btn").forEach(b => b.classList.remove("active"));
  if (cat) {
    document.getElementById("btn-cat-" + cat).classList.add("active");
  } else {
    document.getElementById("btn-cat-all").classList.add("active");
  }
  rerender();
}

// ── Init ────────────────────────────────────────────────────
(async () => {
  await loadMovies();
  renderCategoryButtons();
  rerender();
})();
