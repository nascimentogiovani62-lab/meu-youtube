const grid = document.getElementById("video-grid");
const filtersWrap = document.getElementById("filters");
const loadingMsg = document.getElementById("loading-msg");
const heroPlayer = document.getElementById("hero-player");
const qualityBar = document.getElementById("quality-bar");
const qualityDropdown = document.getElementById("quality-dropdown");
const qualityTrigger = document.getElementById("quality-trigger");
const qualityTriggerLabel = document.getElementById("quality-trigger-label");
const qualityMenu = document.getElementById("quality-menu");

let allVideos = [];
let heroHls = null;
let currentVideoId = null;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function formatViews(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "mil";
  return String(n);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  return formatDate(dateStr);
}

function closeQualityMenu() {
  qualityMenu.hidden = true;
  qualityTrigger.setAttribute("aria-expanded", "false");
}

qualityTrigger.addEventListener("click", () => {
  const isOpen = !qualityMenu.hidden;
  if (isOpen) {
    closeQualityMenu();
  } else {
    qualityMenu.hidden = false;
    qualityTrigger.setAttribute("aria-expanded", "true");
  }
});

document.addEventListener("click", (e) => {
  if (!qualityDropdown.contains(e.target)) closeQualityMenu();
});

function selectQualityOption(value, label) {
  qualityTriggerLabel.textContent = label;
  qualityMenu.querySelectorAll("li").forEach(li => {
    li.classList.toggle("selected", li.dataset.value === String(value));
  });
  closeQualityMenu();
  if (heroHls) heroHls.currentLevel = parseInt(value, 10);
}

function setupQualityMenu(hls) {
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (hls.levels.length <= 1) {
      qualityBar.hidden = true;
      return;
    }

    qualityMenu.innerHTML = "";

    const autoItem = document.createElement("li");
    autoItem.dataset.value = "-1";
    autoItem.textContent = "Automático";
    autoItem.className = "selected";
    autoItem.addEventListener("click", () => selectQualityOption(-1, "Automático"));
    qualityMenu.appendChild(autoItem);

    hls.levels.forEach((level, index) => {
      const item = document.createElement("li");
      item.dataset.value = index;
      item.textContent = level.height + "p";
      item.addEventListener("click", () => selectQualityOption(index, level.height + "p"));
      qualityMenu.appendChild(item);
    });

    qualityTriggerLabel.textContent = "Automático";
    qualityBar.hidden = false;
  });
}

function loadIntoPlayer(video) {
  if (heroHls) {
    heroHls.destroy();
    heroHls = null;
  }
  qualityBar.hidden = true;
  closeQualityMenu();
  currentVideoId = video.id;

  if (Hls.isSupported()) {
    heroHls = new Hls();
    setupQualityMenu(heroHls);
    heroHls.loadSource(video.stream_url);
    heroHls.attachMedia(heroPlayer);
  } else if (heroPlayer.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari toca HLS nativamente e já tem seletor de qualidade embutido
    heroPlayer.src = video.stream_url;
  }

  if (video.thumbnail_url) heroPlayer.poster = video.thumbnail_url;

  document.getElementById("hero-title").textContent = video.title;
  document.getElementById("hero-desc").textContent = video.description || "";
  document.getElementById("hero-meta").innerHTML =
    `<span>${formatViews(video.views || 0)} visualizações</span><span class="dot-sep">•</span><span>Publicado em ${formatDate(video.published_at)}</span><span class="dot-sep">•</span><span>${video.category}</span>`;

  document.getElementById("hero").scrollIntoView({ behavior: "smooth" });

  registerView(video);
  renderSidebar(video.id);
  loadComments(video.id);
}

async function registerView(video) {
  const newViews = (video.views || 0) + 1;
  video.views = newViews;
  await sb.from("videos").update({ views: newViews }).eq("id", video.id);
}

function renderSidebar(currentId) {
  const sidebarList = document.getElementById("sidebar-list");
  const others = allVideos.filter(v => v.id !== currentId);
  sidebarList.innerHTML = "";

  others.forEach(video => {
    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.innerHTML = `
      <div class="sidebar-thumb">
        ${video.thumbnail_url ? `<img src="${video.thumbnail_url}" alt="Thumbnail: ${video.title}">` : ""}
      </div>
      <div class="sidebar-info">
        <h4>${video.title}</h4>
        <div class="card-meta">${formatViews(video.views || 0)} views · ${video.category}</div>
      </div>
    `;
    item.addEventListener("click", () => loadIntoPlayer(video));
    sidebarList.appendChild(item);
  });
}

async function loadComments(videoId) {
  const commentsList = document.getElementById("comments-list");
  const commentsCount = document.getElementById("comments-count");
  commentsList.innerHTML = "";

  const { data, error } = await sb
    .from("comments")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    commentsCount.textContent = "Comentários";
    return;
  }

  commentsCount.textContent = `${data.length} comentário${data.length === 1 ? "" : "s"}`;

  data.forEach(comment => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <div class="comment-author">${comment.author_name}<span class="comment-date">${timeAgo(comment.created_at)}</span></div>
      <div class="comment-body">${comment.body}</div>
    `;
    commentsList.appendChild(item);
  });
}

document.getElementById("comment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentVideoId) return;

  const nameInput = document.getElementById("comment-name");
  const bodyInput = document.getElementById("comment-body");

  const { error } = await sb.from("comments").insert([{
    video_id: currentVideoId,
    author_name: nameInput.value.trim(),
    body: bodyInput.value.trim()
  }]);

  if (!error) {
    bodyInput.value = "";
    loadComments(currentVideoId);
  }
});

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

function startPreview(card, video) {
  const frame = card.querySelector(".thumb-frame");
  const img = frame.querySelector("img");
  const previewVideo = document.createElement("video");
  previewVideo.className = "hover-preview";
  previewVideo.muted = true;
  previewVideo.loop = true;
  previewVideo.playsInline = true;
  frame.appendChild(previewVideo);

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(video.stream_url);
    hls.attachMedia(previewVideo);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.currentLevel = 0;
      previewVideo.play().catch(() => {});
    });
    card._previewHls = hls;
  } else {
    previewVideo.src = video.stream_url;
    previewVideo.play().catch(() => {});
  }

  if (img) img.style.visibility = "hidden";
}

function stopPreview(card) {
  const frame = card.querySelector(".thumb-frame");
  const previewVideo = frame.querySelector(".hover-preview");

  if (card._previewHls) {
    card._previewHls.destroy();
    card._previewHls = null;
  }
  if (previewVideo) previewVideo.remove();

  const img = frame.querySelector("img");
  if (img) img.style.visibility = "visible";
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
      <div class="card-meta">${formatViews(video.views || 0)} views · ${formatDate(video.published_at)} · ${video.category}</div>
    `;

    let hoverTimer = null;
    card.addEventListener("mouseenter", () => {
      hoverTimer = setTimeout(() => startPreview(card, video), 400);
    });
    card.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
      stopPreview(card);
    });

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
