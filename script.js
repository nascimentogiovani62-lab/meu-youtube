const grid = document.getElementById("video-grid");
const filtersWrap = document.getElementById("filters");
const loadingMsg = document.getElementById("loading-msg");
const heroPlayer = document.getElementById("hero-player");

let allVideos = [];
let heroHls = null;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function loadIntoPlayer(video) {
  if (heroHls) {
    heroHls.destroy();
    heroHls = null;
  }

  if (Hls.isSupported()) {
    heroHls = new Hls();
    heroHls.loadSource(video.stream_url);
    heroHls.attachMedia(heroPlayer);
  } else if (heroPlayer.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari toca HLS nativamente
    heroPlayer.src = video.stream_url;
  }

  if (video.thumbnail_url) heroPlayer.poster = video.thumbnail_url;

  document.getElementById("hero-title").textContent = video.title;
  document.getElementById("hero-desc").textContent = video.description || "";
  document.getElementById("hero-meta").innerHTML =
    `<span>Publicado em ${formatDate(video.published_at)}</span><span class="dot-sep">•</span><span>${video.category}</span>`;

  document.getElementById("hero").scrollIntoView({ behavior: "smooth" });
}

function renderFilters(categories) {
  filtersWrap.innerHTML = `<button class="filter active" data-filter="todos">Todos</button>`;
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "filter";
    btn.dataset.filter = cat;
    btn.textContent = cat;
    filtersWrap.appendChild(btn);
  });

  filtersWrap.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      filtersWrap.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGrid(btn.dataset.filter);
    });
  });
}

function renderGrid(filter) {
  const list = filter === "todos" ? allVideos : allVideos.filter(v => v.category === filter);
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = `<p class="empty-msg">Nenhum vídeo nessa categoria ainda.</p>`;
    return;
  }

  list.forEach(video => {
    const card = document.createElement("article");
    card.className = "video-card";
    card.innerHTML = `
      <div class="thumb-frame">
        ${video.thumbnail_url ? `<img src="${video.thumbnail_url}" alt="Thumbnail: ${video.title}">` : `<div class="no-thumb">▶</div>`}
      </div>
      <h3>${video.title}</h3>
      <div class="card-meta">${formatDate(video.published_at)} · ${video.category}</div>
    `;
    card.addEventListener("click", () => loadIntoPlayer(video));
    grid.appendChild(card);
  });
}

async function loadVideos() {
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    loadingMsg.textContent = "Não deu pra carregar os vídeos agora. Confira a configuração do Supabase.";
    console.error(error);
    return;
  }

  allVideos = (data || []).filter(v => v.stream_url);

  if (allVideos.length === 0) {
    loadingMsg.textContent = "Nenhum vídeo cadastrado ainda. Adicione pelo painel /admin.html.";
    return;
  }

  const categories = [...new Set(allVideos.map(v => v.category))];
  renderFilters(categories);
  loadIntoPlayer(allVideos[0]);
  renderGrid("todos");
}

loadVideos();

