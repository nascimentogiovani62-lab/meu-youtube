const videos = [
  {
    title: "Migrando o SSGF de sb.from() pra um padrão sbREST",
    category: "dev",
    categoryLabel: "Desenvolvimento",
    duration: "18:32",
    date: "28 ago",
    thumb: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "O que eu aprendi estudando Green Belt aplicado a software",
    category: "qualidade",
    categoryLabel: "Qualidade",
    duration: "09:14",
    date: "22 ago",
    thumb: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Um dia inteiro tocando SSAP sozinho",
    category: "bastidores",
    categoryLabel: "Bastidores",
    duration: "14:05",
    date: "15 ago",
    thumb: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Por que troquei a arquitetura de módulos do SSAP",
    category: "dev",
    categoryLabel: "Desenvolvimento",
    duration: "21:47",
    date: "08 ago",
    thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Mapeando processo com ferramentas de qualidade na prática",
    category: "qualidade",
    categoryLabel: "Qualidade",
    duration: "11:58",
    date: "01 ago",
    thumb: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Como decido o que construir a seguir",
    category: "bastidores",
    categoryLabel: "Bastidores",
    duration: "07:39",
    date: "24 jul",
    thumb: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Ser dono do seu meio de produção como dev solo",
    category: "politica",
    categoryLabel: "Política",
    duration: "16:21",
    date: "09 set",
    thumb: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=800&auto=format&fit=crop"
  }
];

const grid = document.getElementById("video-grid");
const filterButtons = document.querySelectorAll(".filter");

function renderVideos(filter) {
  grid.innerHTML = "";
  const list = filter === "todos" ? videos : videos.filter(v => v.category === filter);

  list.forEach(video => {
    const card = document.createElement("article");
    card.className = "video-card";
    card.innerHTML = `
      <div class="thumb-frame">
        <img src="${video.thumb}" alt="Thumbnail: ${video.title}">
        <span class="duration">${video.duration}</span>
      </div>
      <h3>${video.title}</h3>
      <div class="card-meta">${video.date} · ${video.categoryLabel}</div>
    `;
    grid.appendChild(card);
  });
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderVideos(btn.dataset.filter);
  });
});

renderVideos("todos");
