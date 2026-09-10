const form = document.getElementById("video-form");
const submitBtn = document.getElementById("submit-btn");
const statusMsg = document.getElementById("status-msg");
const videoList = document.getElementById("video-list");

document.getElementById("published-at").valueAsDate = new Date();

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

  const streamUrl = document.getElementById("stream-url").value.trim();

  if (!streamUrl.endsWith(".m3u8")) {
    showStatus("O link precisa terminar em .m3u8 (o arquivo que o ffmpeg gerou).", false);
    submitBtn.disabled = false;
    return;
  }

  const newVideo = {
    title: document.getElementById("title").value.trim(),
    stream_url: streamUrl,
    thumbnail_url: document.getElementById("thumbnail-url").value.trim() || null,
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

  showStatus("Vídeo salvo! Já pode gozar.", true);
  form.reset();
  document.getElementById("published-at").valueAsDate = new Date();
  loadList();
});

loadList();
