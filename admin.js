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
      <span class="row-actions">
        <input type="file" accept="image/*" class="thumb-input" data-id="${video.id}">
        <button class="thumb-btn" data-id="${video.id}">Trocar thumb</button>
        <button data-id="${video.id}">Remover</button>
      </span>
    `;
    row.querySelector(".thumb-btn").addEventListener("click", () => updateThumbnail(video.id, row));
    row.querySelector("button:not(.thumb-btn)").addEventListener("click", () => deleteVideo(video.id));
    videoList.appendChild(row);
  });
}

async function updateThumbnail(id, row) {
  const fileInput = row.querySelector(".thumb-input");
  const file = fileInput.files[0];

  if (!file) {
    showStatus("Escolhe uma imagem primeiro, antes de clicar em Trocar thumb.", false);
    return;
  }

  const filePath = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await sb.storage.from("thumbnails").upload(filePath, file);

  if (uploadError) {
    showStatus("Não deu pra subir a imagem nova.", false);
    return;
  }

  const { data: publicUrlData } = sb.storage.from("thumbnails").getPublicUrl(filePath);

  const { error: updateError } = await sb
    .from("videos")
    .update({ thumbnail_url: publicUrlData.publicUrl })
    .eq("id", id);

  if (updateError) {
    showStatus("Imagem subiu, mas não deu pra atualizar o vídeo.", false);
    return;
  }

  showStatus("Thumb atualizada!", true);
  fileInput.value = "";

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

  let thumbnailUrl = null;
  const thumbFile = document.getElementById("thumbnail-file").files[0];

  if (thumbFile) {
    const filePath = `${Date.now()}-${thumbFile.name}`;
    const { error: uploadError } = await sb.storage.from("thumbnails").upload(filePath, thumbFile);

    if (uploadError) {
      showStatus("Não deu pra subir a thumbnail. Confira se o bucket 'thumbnails' existe e é público.", false);
      submitBtn.disabled = false;
      return;
    }

    const { data: publicUrlData } = sb.storage.from("thumbnails").getPublicUrl(filePath);
    thumbnailUrl = publicUrlData.publicUrl;
  }

  const newVideo = {
    title: document.getElementById("title").value.trim(),
    stream_url: streamUrl,
    thumbnail_url: thumbnailUrl,
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
