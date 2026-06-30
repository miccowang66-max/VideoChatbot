(function(){
  "use strict";

  /* ================================================================
     MovieMind AI Chatbot Plugin v2 — chatbot.js
     Include anywhere: <script src="chatbot.js"></script>
     Auto-injects floating button + chat panel + optional LLM support.
     ================================================================ */

  // ── CONFIG ─────────────────────────────────────────────────────
  const CONFIG = {
    botName: "HOT MOVIE小幫手",
    dataUrl: "data/clean_movies_20260630.json",
    posterBase: null, // null = use m.cover (remote URL) or fallback to local
    defaultMsg: "哈囉！我是您的 <b>HOT MOVIE小幫手</b>。🎬<br>點擊下方快捷鍵或輸入喜好，我為您推薦好片！",
    llmProvider: "openai",
    llmModel: "gpt-4o-mini",
  };

  // ── STATE ──────────────────────────────────────────────────────
  let movieData = [];
  let isOpen = false;
  let isSettingsOpen = false;
  let useLLM = false;
  let llmApiKey = localStorage.getItem("moviebot_llm_key") || "";
  let llmModel = localStorage.getItem("moviebot_llm_model") || "gpt-4o-mini";
  let llmProvider = localStorage.getItem("moviebot_llm_provider") || "openai";
  let moviesLoaded = false;

  if (llmApiKey) useLLM = true;

  // ── INTENT CONFIG ──────────────────────────────────────────────
  const INTENTS = {
    sadness:  { words:["想哭","哭","悲傷","難過","感人","眼淚","虐心","催淚","悲劇","抑鬱","治癒","感動","痛哭","流淚","感傷"], category:"剧情", reply:"為您挑選感人至深的經典劇情神作 😢" },
    romance:  { words:["愛情","戀愛","浪漫","情侶","甜蜜","相愛","初戀","約會","真愛","閃光","心動"], category:"爱情", reply:"精選浪漫動人的愛情經典 🍿❤️" },
    action:   { words:["刺激","打架","爽片","熱血","動作","犯罪","槍戰","爆破","打鬥","警匪","黑幫","格鬥","冒險","打殺"], category:"动作", reply:"腎上腺素飆升的動作大片 🥋💥" },
    comedy:   { words:["搞笑","喜劇","幽默","爆笑","歡樂","放鬆","開心","有趣","無厘頭","笑死"], category:"喜剧", reply:"讓您大笑開懷的經典喜劇 🎭😂" },
    scifi:    { words:["科幻","宇宙","未來","外星人","末日","時空","機器人","高科技","AI"], category:"科幻", reply:"探索未知的科幻神作 🚀" },
    suspense: { words:["懸疑","燒腦","推理","解謎","驚悚","恐怖","反轉","心理","暗黑","謀殺","嚇人"], category:"悬疑", reply:"挑戰腦力的高分懸疑神作 🔍" },
    animation:{ words:["動畫","卡通","宮崎駿","吉卜力","童年","溫馨","龍貓","千尋","動漫"], category:"动画", reply:"走進奇幻童真的動畫世界 🎨✨" },
    war:      { words:["戰爭","歷史","和平","軍事","二戰","史詩","納粹","將軍","士兵"], category:"战争", reply:"震撼人心的史詩戰爭大片 🎖️" }
  };

  const QUICK_ACTIONS = [
    { label:"🍿 盲盒抽片", cls:"cb-quick--blind", action:"blind" },
    { label:"🔥 9.5分神作", cls:"cb-quick--top", action:"top" },
    { label:"🎭 愛情", cls:"cb-quick--love", action:"romance" },
    { label:"🥋 動作", cls:"cb-quick--action", action:"action" },
    { label:"🧠 懸疑", cls:"cb-quick--suspense", action:"suspense" },
    { label:"😢 劇情", cls:"cb-quick--drama", action:"sadness" },
  ];

  // ── BUILD DOM ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("cb-plugin-css")) return;
    const link = document.createElement("link");
    link.id = "cb-plugin-css";
    link.rel = "stylesheet";
    link.href = "components/chatbot.css";
    document.head.appendChild(link);
  }

  function injectFonts() {
    if (document.getElementById("cb-fonts")) return;
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect"; pre1.href = "https://fonts.googleapis.com";
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect"; pre2.href = "https://fonts.gstatic.com"; pre2.crossOrigin = "";
    const fontLink = document.createElement("link");
    fontLink.id = "cb-fonts";
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap";
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(fontLink);
  }

  function buildDOM() {
    const body = document.body;

    // Toggle button
    const toggleBtn = document.createElement("div");
    toggleBtn.id = "chatbot-toggle-btn";
    toggleBtn.className = "cb-anim-float";
    toggleBtn.innerHTML = `
      <div id="chatbot-badge">AI</div>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>`;
    toggleBtn.onclick = togglePanel;
    body.appendChild(toggleBtn);

    // "Return to App" top-right button
    const appBtn = document.createElement("div");
    appBtn.id = "cb-app-btn";
    appBtn.innerHTML = `📋 電影列表`;
    appBtn.onclick = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (isOpen) togglePanel();
    };
    body.appendChild(appBtn);

    // Window panel
    const windowEl = document.createElement("div");
    windowEl.id = "chatbot-window";
    windowEl.className = "cb-hidden";
    windowEl.innerHTML = `
      <!-- Header -->
      <div class="cb-header">
        <div class="cb-header-left">
          <span class="cb-header-icon">🤖</span>
          <div>
             <div class="cb-header-title">HOT MOVIE<span class="cb-header-brand">小幫手</span></div>
            <div class="cb-header-status">
              <span class="cb-status-dot live"></span>
              <span class="cb-status-text">100 部神作連線中</span>
            </div>
          </div>
        </div>
        <div class="cb-header-actions">
          <button id="cb-gear-btn" class="cb-icon-btn" title="LLM 設定">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
          <button id="cb-close-btn" class="cb-icon-btn" title="關閉">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Settings panel (hidden by default) -->
      <div id="cb-settings" class="cb-settings" style="display:none;">
        <h3 class="cb-settings-title">⚙️ LLM 設定</h3>
        <div class="cb-settings-grid">
          <div>
            <label class="cb-field-label">LLM Provider</label>
             <select id="cb-llm-provider" class="cb-select">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
            </select>
          </div>
          <div>
            <label class="cb-field-label">Model</label>
            <select id="cb-llm-model" class="cb-select">
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
          </div>
          <div>
            <label class="cb-field-label">API Key</label>
            <input type="password" id="cb-llm-key" class="cb-input" placeholder="sk-...">
          </div>
          <div class="cb-btn-row">
            <button id="cb-save-settings" class="cb-btn cb-btn-primary">儲存</button>
            <button id="cb-clear-settings" class="cb-btn cb-btn-ghost">清除</button>
          </div>
          <p id="cb-llm-status" class="cb-settings-status"></p>
        </div>
      </div>

      <!-- Chat logs -->
      <div id="chatbot-logs" class="cb-logs cb-scroll">
        <div class="cb-msg cb-msg--bot">
          <div class="cb-avatar cb-avatar--bot">🤖</div>
          <div class="cb-bubble">
            <span class="cb-bubble-label">MOVIEMIND BOT</span>
            <div class="cb-bubble-body cb-bubble-body--bot">${CONFIG.defaultMsg}</div>
          </div>
        </div>
      </div>

      <!-- Quick bar -->
      <div class="cb-quick-bar" id="cb-quick-bar"></div>

      <!-- Input bar -->
      <div class="cb-input-bar">
        <input type="text" id="chatbot-user-input" placeholder="想看什麼電影呢？">
        <button id="chatbot-send-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9-2-9-15-9 15 9-2zm0 0v-8"/></svg>
        </button>
      </div>`;
    body.appendChild(windowEl);

    // Build quick action buttons
    const quickBar = document.getElementById("cb-quick-bar");
    QUICK_ACTIONS.forEach(q => {
      const btn = document.createElement("button");
      btn.className = `cb-quick ${q.cls}`;
      btn.textContent = q.label;
      btn.onclick = () => handleQuickAction(q.action);
      quickBar.appendChild(btn);
    });

    // Bind events
    document.getElementById("cb-close-btn").onclick = togglePanel;
    document.getElementById("chatbot-send-btn").onclick = sendMessage;
    document.getElementById("chatbot-user-input").onkeydown = (e) => { if(e.key==="Enter") sendMessage(); };
    document.getElementById("cb-gear-btn").onclick = toggleSettings;
    document.getElementById("cb-save-settings").onclick = saveSettings;
    document.getElementById("cb-clear-settings").onclick = clearSettings;
    document.getElementById("cb-llm-provider").onchange = updateModelOptions;

    // Restore saved settings UI
    if (llmApiKey) {
      document.getElementById("cb-llm-key").value = llmApiKey;
      document.getElementById("cb-llm-provider").value = llmProvider;
      document.getElementById("cb-llm-model").value = llmModel;
      document.getElementById("cb-llm-status").textContent = "✅ LLM 已啟用 — " + llmProvider + " / " + llmModel;
    }
  }

  // ── DATA LOADING ───────────────────────────────────────────────
  async function loadMovieData() {
    if (moviesLoaded) return;
    try {
      // Try local data first
      const resp = await fetch(CONFIG.dataUrl);
      if (resp.ok) {
        movieData = await resp.json();
      } else {
        // Fallback: try API
        const apiResp = await fetch("/api/movies?sort=date");
        if (apiResp.ok) {
          const apiData = await apiResp.json();
          movieData = apiData.movies || [];
        }
      }
    } catch (e) {
      // Last resort: try API
      try {
        const apiResp = await fetch("/api/movies?sort=date");
        if (apiResp.ok) {
          const apiData = await apiResp.json();
          movieData = apiData.movies || [];
        }
      } catch(e2) {
        console.warn("MovieBot: Could not load movie data. Chatbot will have limited functionality.");
      }
    }
    moviesLoaded = true;
  }

  // ── UI HELPERS ─────────────────────────────────────────────────
  function togglePanel() {
    const win = document.getElementById("chatbot-window");
    const badge = document.getElementById("chatbot-badge");
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.remove("cb-hidden");
      if (badge) badge.style.display = "none";
      if (!moviesLoaded) loadMovieData();
    } else {
      win.classList.add("cb-hidden");
      if (badge) badge.style.display = "";
    }
  }

  function toggleSettings() {
    const panel = document.getElementById("cb-settings");
    isSettingsOpen = !isSettingsOpen;
    panel.style.display = isSettingsOpen ? "block" : "none";
  }

  function updateModelOptions() {
    const provider = document.getElementById("cb-llm-provider").value;
    const modelSelect = document.getElementById("cb-llm-model");
    modelSelect.innerHTML = "";
    const models = {
      openai: ["gpt-4o-mini","gpt-4o","gpt-3.5-turbo"],
      gemini: ["gemini-2.0-flash","gemini-2.5-pro","gemini-1.5-pro"],
      grok: ["grok-3-mini","grok-3"],
    };
    (models[provider] || ["gpt-4o-mini"]).forEach(m => {
      const opt = document.createElement("option");
      opt.value = m; opt.textContent = m;
      modelSelect.appendChild(opt);
    });
  }

  function saveSettings() {
    llmApiKey = document.getElementById("cb-llm-key").value.trim();
    llmModel = document.getElementById("cb-llm-model").value;
    llmProvider = document.getElementById("cb-llm-provider").value;
    if (llmApiKey) {
      localStorage.setItem("moviebot_llm_key", llmApiKey);
      localStorage.setItem("moviebot_llm_model", llmModel);
      localStorage.setItem("moviebot_llm_provider", llmProvider);
      useLLM = true;
      document.getElementById("cb-llm-status").textContent = "✅ LLM 已啟用 — " + llmProvider + " / " + llmModel;
    } else {
      useLLM = false;
      document.getElementById("cb-llm-status").textContent = "⚠️ 未設定 API Key，使用關鍵字匹配模式";
    }
  }

  function clearSettings() {
    localStorage.removeItem("moviebot_llm_key");
    localStorage.removeItem("moviebot_llm_model");
    localStorage.removeItem("moviebot_llm_provider");
    llmApiKey = "";
    useLLM = false;
    document.getElementById("cb-llm-key").value = "";
    document.getElementById("cb-llm-status").textContent = "🗑️ 已清除，恢復關鍵字匹配模式";
  }

  function scrollToBottom() {
    const logs = document.getElementById("chatbot-logs");
    logs.scrollTo({ top: logs.scrollHeight, behavior: "smooth" });
  }

  function escapeHtml(text) {
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // ── MESSAGE RENDERING ──────────────────────────────────────────
  function appendUserMessage(text) {
    const html = `
      <div class="cb-msg cb-msg--user">
        <div class="cb-bubble">
          <span class="cb-bubble-label user">YOU</span>
          <div class="cb-bubble-body cb-bubble-body--user">${escapeHtml(text)}</div>
        </div>
        <div class="cb-avatar cb-avatar--user">👤</div>
      </div>`;
    document.getElementById("chatbot-logs").insertAdjacentHTML("beforeend", html);
    scrollToBottom();
  }

  function createTypingIndicator() {
    const id = "cb-typing-" + Date.now();
    const html = `
      <div id="${id}" class="cb-msg cb-msg--bot cb-anim-fade-in">
        <div class="cb-avatar cb-avatar--bot">🤖</div>
        <div class="cb-bubble">
          <span class="cb-bubble-label">MOVIEMIND BOT</span>
          <div class="cb-bubble-body cb-bubble-body--bot"><div class="cb-typing"><span></span><span></span><span></span></div></div>
        </div>
      </div>`;
    document.getElementById("chatbot-logs").insertAdjacentHTML("beforeend", html);
    scrollToBottom();
    return id;
  }

  function removeTyping(id) { const el = document.getElementById(id); if (el) el.remove(); }

  function appendBotMessage(introText, movies) {
    const id = "cb-msg-" + Date.now();
    let cardsHtml = "";
    if (movies && movies.length > 0) {
      cardsHtml = '<div class="cb-mcards" style="display:flex;flex-direction:column;gap:12px;margin-top:10px;">';
      movies.forEach((m, i) => {
        const stars = Array.from({length:5}, (_,s) => s < Math.min(5,Math.max(1,Math.round((m.score_num||m.score||0)/2))) ? "★" : "☆").join("");
        const badges = (m.categories ? (Array.isArray(m.categories) ? m.categories : m.categories.split(",")) : [])
          .slice(0,2).map(c => `<span class="cb-mcard-badge">${c.trim()}</span>`).join("");
        const poster = m.cover || m.poster || (CONFIG.posterBase && m.id ? `${CONFIG.posterBase}${m.id}.jpg` : "");
        const title = (m.title||"").split(" - ")[0];
        const score = m.score_num || m.score || 0;
        const url = m.detail_url || m.url || "#";
        cardsHtml += `
          <div class="cb-mcard cb-anim-fade-in" style="animation-delay:${i*100}ms">
            <div class="cb-mcard-poster"><img src="${poster}" alt="${escapeHtml(title)}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2290%22><rect fill=%22%23e5e7eb%22 width=%2260%22 height=%2290%22/><text fill=%22%239ca3af%22 font-size=%228%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>No Img</text></svg>'"></div>
            <div class="cb-mcard-info">
              <div class="cb-mcard-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              <div class="cb-mcard-row"><span class="cb-mcard-stars">${stars}</span><span class="cb-mcard-score">${Number(score).toFixed(1)}</span></div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;"><div class="cb-mcard-badges">${badges}</div><button onclick="chatbotShowDetail(${m.id})" class="cb-mcard-link">詳情 ▸</button></div>
            </div>
          </div>`;
      });
      cardsHtml += '</div>';
    }
    const html = `
      <div id="${id}" class="cb-msg cb-msg--bot cb-anim-fade-in">
        <div class="cb-avatar cb-avatar--bot">🤖</div>
        <div class="cb-bubble">
          <span class="cb-bubble-label">MOVIEMIND BOT</span>
          <div class="cb-bubble-body cb-bubble-body--bot">${introText}${cardsHtml}</div>
        </div>
      </div>`;
    document.getElementById("chatbot-logs").insertAdjacentHTML("beforeend", html);
    scrollToBottom();
  }

  function typewriterReply(introText, movies) {
    const typingId = createTypingIndicator();
    setTimeout(() => {
      removeTyping(typingId);
      appendBotMessage(introText, movies);
    }, 600);
  }

  // ── MOVIE MATCHING ─────────────────────────────────────────────
  function pickRandom(arr, count) {
    const temp = [...arr];
    const result = [];
    for (let i = 0; i < count && temp.length > 0; i++) {
      const r = Math.floor(Math.random() * temp.length);
      result.push(temp.splice(r, 1)[0]);
    }
    return result;
  }

  function matchByCategory(category) {
    const matched = movieData.filter(m => {
      const cats = Array.isArray(m.categories) ? m.categories.join(",") : (m.categories||"");
      return cats.includes(category);
    });
    matched.sort((a,b) => (b.score_num||b.score||0) - (a.score_num||a.score||0));
    return pickRandom(matched.slice(0, 15), 3);
  }

  function fuzzySearch(query) {
    const q = query.toLowerCase();
    return movieData.filter(m => {
      const title = (m.title||"").toLowerCase();
      const cats = Array.isArray(m.categories) ? m.categories.join(",").toLowerCase() : (m.categories||"").toLowerCase();
      const country = (m.country||"").toLowerCase();
      return title.includes(q) || cats.includes(q) || country.includes(q);
    }).sort((a,b) => (b.score_num||b.score||0) - (a.score_num||a.score||0));
  }

  function detectIntent(query) {
    const q = query.toLowerCase().trim();
    let bestKey = null, bestCount = 0;
    for (const [key, cfg] of Object.entries(INTENTS)) {
      let count = 0;
      cfg.words.forEach(w => { if (q.includes(w)) count++; });
      if (count > bestCount) { bestCount = count; bestKey = key; }
    }
    return bestKey && bestCount > 0 ? bestKey : null;
  }

  // ── Smart Search: parse natural language for score + category ──
  function smartSearch(query) {
    const q = query;
    let filtered = [...movieData];
    let applied = false;
    let replyParts = [];

    // 1. Parse score range
    const scorePatterns = [
      { regex: /(\d+\.?\d*)\s*分\s*以\s*上/, fn: (m, arr) => { const min=parseFloat(m[1]); replyParts.push(`${min}分以上`); return arr.filter(x=>(x.score_num||0)>=min); } },
      { regex: /(\d+\.?\d*)\s*分\s*以\s*下/, fn: (m, arr) => { const max=parseFloat(m[1]); replyParts.push(`${max}分以下`); return arr.filter(x=>(x.score_num||0)<=max); } },
      { regex: /(\d+)\s*[-~至到]\s*(\d+)\s*分/, fn: (m, arr) => { const lo=parseFloat(m[1]), hi=parseFloat(m[2]); replyParts.push(`${lo}-${hi}分`); return arr.filter(x=>{const s=x.score_num||0;return s>=lo&&s<=hi;}); } },
      { regex: /評?分\s*[高大]/, fn: (m, arr) => { replyParts.push("高分"); return arr.filter(x=>(x.score_num||0)>=9); } },
    ];
    for (const p of scorePatterns) {
      const m = q.match(p.regex);
      if (m) {
        const prev = filtered.length;
        filtered = p.fn(m, filtered);
        if (filtered.length < prev) applied = true;
        break; // only apply first matching score pattern
      }
    }

    // 2. Parse category from known category list
    const allCats = [...new Set(movieData.flatMap(m => m.categories||[]))];
    const foundCats = allCats.filter(cat => q.includes(cat));
    if (foundCats.length > 0) {
      const prev = filtered.length;
      filtered = filtered.filter(m => {
        const cats = m.categories || [];
        return foundCats.some(c => cats.includes(c));
      });
      if (filtered.length < prev) { applied = true; replyParts.push(foundCats.join("、")); }
    }

    // 3. Parse country
    const countries = [...new Set(movieData.map(m => m.country||"").filter(Boolean))];
    for (const c of countries) {
      const short = c.split("、")[0];
      if (q.includes(c) || q.includes(short)) {
        const prev = filtered.length;
        filtered = filtered.filter(m => (m.country||"").includes(c) || (m.country||"").includes(short));
        if (filtered.length < prev) { applied = true; replyParts.push(c); }
        break;
      }
    }

    if (!applied) return null;

    filtered.sort((a,b) => (b.score_num||0) - (a.score_num||0));
    const selected = filtered.slice(0, 5);
    const random3 = pickRandom(selected.length > 3 ? selected : filtered, Math.min(3, filtered.length));
    const reply = "🔍 " + (replyParts.length ? replyParts.join(" · ") + " " : "") + `找到 ${filtered.length} 部，推薦：`;
    return { movies: random3, intro: reply };
  }

  function handleQuickAction(act) {
    const labels = { blind:"🍿 盲盒抽片", top:"🔥 9.5分神作", romance:"🎭 愛情", action:"🥋 動作", suspense:"🧠 懸疑", sadness:"😢 劇情" };
    const label = labels[act] || act;
    appendUserMessage(label);

    if (act === "blind") {
      const movie = movieData[Math.floor(Math.random() * movieData.length)];
      const title = (movie.title||"").split(" - ")[0];
      typewriterReply(`🎉 盲抽神作：<b>《${title}》</b>，評分 ${movie.score_num||movie.score} 分！`, [movie]);
    } else if (act === "top") {
      const top = movieData.filter(m => (m.score_num||m.score||0) >= 9.5);
      const selected = pickRandom(top, 3);
      typewriterReply("🔥 評分 9.5+ 的傳奇神作：", selected);
    } else {
      const intent = INTENTS[act];
      const selected = matchByCategory(intent.category);
      typewriterReply(intent.reply, selected);
    }
  }

  // ── LLM CALL ────────────────────────────────────────────────────
  async function callLLM(userQuery) {
    if (!llmApiKey || !useLLM) return null;

    const movieList = movieData.slice(0, 100).map(m => {
      const title = (m.title||"").split(" - ")[0];
      const cats = Array.isArray(m.categories) ? m.categories.join(", ") : (m.categories||"");
      return `[${m.id}] ${title} | 評分:${m.score_num||m.score} | 類別:${cats} | 國家:${m.country||""}`;
    }).join("\n");

    const systemPrompt = `你是 HOT MOVIE小幫手，一個電影推薦助手。你擁有 100 部經典電影的資料庫。根據使用者輸入，從資料庫中推薦最合適的 3 部電影。只回覆電影編號(用逗號分隔，如: 1,5,23)和一句簡短推薦語。格式：\n電影: 1,5,23\n推薦語: [你的推薦]`;
    const userPrompt = `電影資料庫：\n${movieList}\n\n使用者查詢: ${userQuery}`;

    try {
      let resp, data, content;

      if (llmProvider === "gemini") {
        const model = llmModel || "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${llmApiKey}`;
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
          }),
        });
        if (!resp.ok) return null;
        data = await resp.json();
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // OpenAI / OpenCode (OpenAI-compatible API)
        const urls = {
          openai: "https://api.openai.com/v1/chat/completions",
          grok: "https://api.x.ai/v1/chat/completions",
        };
        const url = urls[llmProvider] || urls.openai;
        const model = llmModel || "gpt-4o-mini";
        resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${llmApiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });
        if (!resp.ok) return null;
        data = await resp.json();
        content = data.choices?.[0]?.message?.content || "";
      }

      if (!content) return null;

      // Parse movie IDs
      const idMatch = content.match(/電影[：:]\s*([\d,\s]+)/) || content.match(/(\d+)[,\s]*(\d+)[,\s]*(\d+)/);
      if (idMatch) {
        const ids = (idMatch[1] + (idMatch[2]||"") + (idMatch[3]||"")).split(/[,\s]+/).map(Number).filter(n=>n>0);
        const recMovies = ids.map(id => movieData.find(m => (m.id||0) === id)).filter(Boolean);
        if (recMovies.length > 0) {
          const recText = content.match(/推薦語[：:]\s*(.+)/)?.[1] || "AI 為您挑選：";
          return { movies: recMovies.slice(0,3), intro: recText };
        }
      }
      return null;
    } catch(e) {
      console.warn("LLM call failed:", e);
      return null;
    }
  }

  // ── MAIN PROCESS ────────────────────────────────────────────────
  async function sendMessage() {
    const input = document.getElementById("chatbot-user-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    appendUserMessage(text);

    if (!moviesLoaded) await loadMovieData();
    if (movieData.length === 0) {
      typewriterReply("⚠️ 電影資料庫載入失敗，請重新整理頁面。", []);
      return;
    }

    // Try LLM first if enabled
    if (useLLM && llmApiKey) {
      const llmResult = await callLLM(text);
      if (llmResult && llmResult.movies.length > 0) {
        typewriterReply("🤖 AI: " + llmResult.intro, llmResult.movies);
        return;
      }
    }

    // Try smart search (natural language score + category + country)
    const smart = smartSearch(text);
    if (smart) {
      typewriterReply(smart.intro, smart.movies);
      return;
    }

    // Fallback to keyword matching
    const intent = detectIntent(text);
    if (intent) {
      const cfg = INTENTS[intent];
      const matched = matchByCategory(cfg.category);
      typewriterReply(cfg.reply, matched);
      return;
    }

    // Fuzzy search
    const fuzzy = fuzzySearch(text);
    if (fuzzy.length > 0) {
      const selected = fuzzy.slice(0, 3);
      typewriterReply(`🔍 找到 ${fuzzy.length} 部相關影片，推薦最佳 ${selected.length} 部：`, selected);
    } else {
      typewriterReply(`抱歉，沒有找到與「${escapeHtml(text)}」相關的電影。<br>試試 🍿 盲盒抽片或 🔥 9.5分神作吧！`, []);
    }
  }

  // ── MOVIE DETAIL VIEW ──────────────────────────────────────────
  let chatLogsBackup = null;

  window.chatbotShowDetail = async function(movieId) {
    const movie = movieData.find(m => (m.id || 0) === movieId);
    if (!movie) return;

    const logs = document.getElementById("chatbot-logs");
    if (!chatLogsBackup) chatLogsBackup = logs.innerHTML;

    const poster = movie.cover || movie.poster || "";
    const title = (movie.title || "").split(" - ")[0];
    const enTitle = (movie.title || "").split(" - ")[1] || "";
    const score = movie.score_num || movie.score || 0;
    const categories = Array.isArray(movie.categories) ? movie.categories.join(", ") : (movie.categories || "");
    const country = movie.country || "未知";
    const runtime = movie.runtime || "未知";
    const release = movie.release_date_clean || "未提供";
    const stars = Array.from({length:5}, (_,s) => s < Math.min(5,Math.max(1,Math.round(score/2))) ? "★" : "☆").join("");

    logs.innerHTML = `
      <div class="cb-detail">
        <button class="cb-detail-back" onclick="chatbotGoBack()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>
        <div class="cb-detail-poster">
          <img src="${poster}" alt="${escapeHtml(title)}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%23e5e7eb%22 width=%22300%22 height=%22450%22 rx=%2214%22/><text fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>No Poster</text></svg>'">
        </div>
        <h2 class="cb-detail-title">${escapeHtml(title)}</h2>
        ${enTitle ? `<p class="cb-detail-en">${escapeHtml(enTitle)}</p>` : ""}
        <div class="cb-detail-meta">
          <div class="cb-detail-row"><span class="cb-detail-label">評分</span><span class="cb-detail-value"><span style="color:#fbbf24">${stars}</span> ${score.toFixed(1)}</span></div>
          <div class="cb-detail-row"><span class="cb-detail-label">類別</span><span class="cb-detail-value">${escapeHtml(categories)}</span></div>
          <div class="cb-detail-row"><span class="cb-detail-label">國家</span><span class="cb-detail-value">${escapeHtml(country)}</span></div>
          <div class="cb-detail-row"><span class="cb-detail-label">片長</span><span class="cb-detail-value">${escapeHtml(runtime)}</span></div>
          <div class="cb-detail-row"><span class="cb-detail-label">上映</span><span class="cb-detail-value">${escapeHtml(release)}</span></div>
          <div class="cb-detail-row"><span class="cb-detail-label">導演</span><span class="cb-detail-value" id="cb-detail-director">載入中...</span></div>
        </div>
      </div>`;
    logs.scrollTo({ top: 0, behavior: "smooth" });

    // Fetch director info
    try {
      const resp = await fetch(`/api/movie/${movieId}/detail`);
      if (resp.ok) {
        const detail = await resp.json();
        const dirEl = document.getElementById("cb-detail-director");
        if (dirEl) dirEl.textContent = detail.director || "暫無資料";
      }
    } catch(e) {
      const dirEl = document.getElementById("cb-detail-director");
      if (dirEl) dirEl.textContent = "暫無資料";
    }
  };

  window.chatbotGoBack = function() {
    const logs = document.getElementById("chatbot-logs");
    if (chatLogsBackup) {
      logs.innerHTML = chatLogsBackup;
      chatLogsBackup = null;
      scrollToBottom();
    }
  };

  // ── INIT ────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectFonts();
    buildDOM();
    loadMovieData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
