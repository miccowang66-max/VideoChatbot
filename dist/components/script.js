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
    html += `<h2 class="category-title">${cat} <span class="cat-count">(${movies.length}部)</span></h2>`;
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
  const isHF = window.location.hostname.includes("hf.space");
  const url = m.id ? (isHF ? `/detail/${m.id}` : `https://selinawang-MovieMind-AI.hf.space/detail/${m.id}`) : "#";
  const target = isHF ? "_self" : "_blank";
  return `
    <a href="${url}" target="${target}" class="movie-card" data-movie-id="${m.id}" style="text-decoration:none;color:inherit;display:block;">
      <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy" 
           onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%23111827%22 width=%22300%22 height=%22450%22 rx=%228%22/><text fill=%22%236b7280%22 font-family=%22sans-serif%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>${escapeHtml(title.substring(0,8))}...</text></svg>';">
      <div class="movie-info">
        <div class="movie-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="movie-meta">
          <span class="movie-score">${score}</span>
          <span class="movie-date">${date}</span>
        </div>
      </div>
    </a>`;
}

function escapeHtml(text) {
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ── Movie Detail Modal ──────────────────────────────────────
async function showMovieDetail(movieId) {
  if (document.getElementById("movie-detail-modal")) return;

  let movie = MOVIES.find(m => m.id === movieId);
  if (!movie && MOVIES.length === 0) {
    await loadMovies();
    movie = MOVIES.find(m => m.id === movieId);
  }
  if (!movie) return;

  const poster = movie.cover || `components/posters/${movie.id}.jpg`;
  const title = (movie.title || "").split(" - ")[0];
  const enTitle = (movie.title || "").split(" - ")[1] || "";
  const score = movie.score_num || 0;
  const categories = (movie.categories || []).join(", ");
  const country = movie.country || "未知";
  const runtime = movie.runtime || "未知";
  const release = movie.release_date_clean || "未提供";
  const stars = Array.from({length:5}, (_,s) => s < Math.min(5,Math.max(1,Math.round(score/2))) ? "★" : "☆").join("");

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "movie-detail-modal";
  overlay.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" onclick="closeMovieDetail()">✕</button>
      <div class="modal-poster">
        <img src="${poster}" alt="${escapeHtml(title)}" onerror="this.style.display='none'">
      </div>
      <div class="modal-body">
        <h2 class="modal-title">${escapeHtml(title)}</h2>
        ${enTitle ? `<p class="modal-en">${escapeHtml(enTitle)}</p>` : ""}
        <div class="modal-stars"><span style="color:#fbbf24">${stars}</span> ${score.toFixed(1)}</div>
        <div class="modal-meta">
          <div class="modal-row"><span>類別</span><span>${escapeHtml(categories)}</span></div>
          <div class="modal-row"><span>國家</span><span>${escapeHtml(country)}</span></div>
          <div class="modal-row"><span>片長</span><span>${escapeHtml(runtime)}</span></div>
          <div class="modal-row"><span>上映</span><span>${escapeHtml(release)}</span></div>
          <div class="modal-row"><span>導演</span><span id="modal-director">載入中...</span></div>
        </div>
      </div>
    </div>`;
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeMovieDetail();
  });
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  // Fetch director info
  try {
    const resp = await fetch(`/api/movie/${movieId}/detail`);
    if (resp.ok) {
      const detail = await resp.json();
      const directorEl = document.getElementById("modal-director");
      if (directorEl) directorEl.textContent = detail.director || "暫無資料";
    }
  } catch(e) {
    const directorEl = document.getElementById("modal-director");
    if (directorEl) directorEl.textContent = "暫無資料";
  }

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") { closeMovieDetail(); document.removeEventListener("keydown", escHandler); }
  });
}

function closeMovieDetail() {
  const modal = document.getElementById("movie-detail-modal");
  if (modal) modal.remove();
  document.body.style.overflow = "";
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
    const el = document.getElementById("btn-cat-" + cat);
    if (el) el.classList.add("active");
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
