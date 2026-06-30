let currentSort = "category";

async function fetchMovies(sort) {
  const res = await fetch(`/api/movies?sort=${sort}`);
  return res.json();
}

function buildCategoryView(data) {
  let html = "";
  for (const [cat, movies] of Object.entries(data)) {
    html += `<section class="category-section">`;
    html += `<h2 class="category-title">${cat} <span style="font-size:14px;color:#6e7681">(${movies.length}部)</span></h2>`;
    html += `<div class="movie-grid">`;
    movies.forEach(m => { html += renderCard(m); });
    html += `</div></section>`;
  }
  return html;
}

function buildDateView(data) {
  let html = `<section class="category-section">`;
  html += `<h2 class="category-title">依上映時間排序</h2>`;
  html += `<div class="movie-grid">`;
  data.movies.forEach(m => { html += renderCard(m); });
  html += `</div></section>`;
  return html;
}

function renderCard(m) {
  const poster = m.id ? `/posters/${m.id}.jpg` : "";
  const title = m.title || "";
  const score = m.score || "";
  const date = m.release_date_clean || "未提供";
  return `
    <div class="movie-card">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect fill=%22%2321262d%22 width=%22200%22 height=%22300%22/><text fill=%22%238b949e%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>No Image</text></svg>'">
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
  const data = await fetchMovies(sort);
  document.getElementById("content").innerHTML = sort === "category"
    ? buildCategoryView(data)
    : buildDateView(data);
}

(async () => {
  const data = await fetchMovies("category");
  document.getElementById("content").innerHTML = buildCategoryView(data);
})();
