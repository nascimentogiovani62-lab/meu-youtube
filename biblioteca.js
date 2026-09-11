const muralGrid = document.getElementById("mural-grid");
const bookGrid = document.getElementById("book-grid");
const bookFilters = document.getElementById("book-filters");

let allBooks = [];

async function loadMural() {
  const { data, error } = await sb.from("figures").select("*").order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    muralGrid.innerHTML = `<p class="loading-msg">Nenhuma referência cadastrada ainda.</p>`;
    return;
  }

  muralGrid.innerHTML = "";
  data.forEach(fig => {
    const card = document.createElement("div");
    card.className = "figure-card";
    card.innerHTML = `
      <div class="figure-photo-frame">
        ${fig.photo_url ? `<img src="${fig.photo_url}" alt="${fig.name}">` : ""}
      </div>
      <p class="figure-name">${fig.name}</p>
      ${fig.role ? `<div class="figure-role">${fig.role}</div>` : ""}
    `;
    muralGrid.appendChild(card);
  });
}

function renderBooks(filter) {
  const list = filter === "todos" ? allBooks : allBooks.filter(b => b.status === filter);
  bookGrid.innerHTML = "";

  if (list.length === 0) {
    bookGrid.innerHTML = `<p class="loading-msg">Nenhum livro aqui ainda.</p>`;
    return;
  }

  list.forEach(book => {
    const card = document.createElement("div");
    card.className = "book-card";
    card.innerHTML = `
      <div class="book-cover-frame">
        ${book.cover_url ? `<img src="${book.cover_url}" alt="Capa de ${book.title}">` : ""}
        <span class="book-status-badge">${book.status === "lido" ? "Lido" : "Quero ler"}</span>
      </div>
      <p class="book-title">${book.title}</p>
      ${book.author ? `<div class="book-author">${book.author}</div>` : ""}
    `;
    bookGrid.appendChild(card);
  });
}

async function loadBooks() {
  const { data, error } = await sb.from("books").select("*").order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    bookGrid.innerHTML = `<p class="loading-msg">Nenhum livro cadastrado ainda.</p>`;
    return;
  }

  allBooks = data;
  renderBooks("todos");
}

bookFilters.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    bookFilters.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderBooks(btn.dataset.filter);
  });
});

loadMural();
loadBooks();
