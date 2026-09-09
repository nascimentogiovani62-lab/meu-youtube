const form = document.getElementById("video-form");
const submitBtn = document.getElementById("submit-btn");
const statusMsg = document.getElementById("status-msg");
const videoList = document.getElementById("video-list");

document.getElementById("published-at").valueAsDate = new Date();

function extractYoutubeId(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function showStatus(message, ok) {
  statusMsg.textContent = message;
  statusMsg.className = "status-msg " + (ok ? "ok" : "error");
}

async function loadList() {
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    videoList.textContent = "Erro ao carregar. Confira a configuração do Supabase.";
    return;
  }

  if (!data || data.length === 0) {
    videoList.textContent = "Nenhum vídeo cadastrado ainda.";
    return;
  }

  videoList.innerHTML = "";
  data.forEach(video => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span>${video.title} — ${video.category}</span>
      <button data-id="${video.id}">Remover</button>
    `;
    row.querySelector("button").addEventListener("click", () => deleteVideo(video.id));
    videoList.appendChild(row);
  });
}

async function deleteVideo(id) {
  const { error } = await sb.from("videos").delete().eq("id", id);
  if (error) {
    showStatus("Não deu pra remover. Tenta de novo.", false);
    return;
  }
  loadList();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const youtubeUrl = document.getElementById("youtube-url").value.trim();
  const youtubeId = extractYoutubeId(youtubeUrl);

  if (!youtubeId) {
    showStatus("Não reconheci esse link do YouTube. Confira e tenta de novo.", false);
    submitBtn.disabled = false;
    return;
  }

  const newVideo = {
    title: document.getElementById("title").value.trim(),
    youtube_id: youtubeId,
    category: document.getElementById("category").value.trim(),
    description: document.getElementById("description").value.trim(),
    published_at: document.getElementById("published-at").value
  };

  const { error } = await sb.from("videos").insert([newVideo]);

  submitBtn.disabled = false;

  if (error) {
    showStatus("Não deu pra salvar. Confira a configuração do Supabase.", false);
    console.error(error);
    return;
  }

  showStatus("Vídeo salvo! Já aparece no site.", true);
  form.reset();
  document.getElementById("published-at").valueAsDate = new Date();
  loadList();
});

loadList();
