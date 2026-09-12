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
    card.style.cursor = "pointer";
    card.addEventListener("click", () => openFigureModal(fig));
    muralGrid.appendChild(card);
  });
}

const figureModal = document.getElementById("figure-modal");
const modalClose = document.getElementById("modal-close");
const modalPhotoFrame = document.getElementById("modal-photo-frame");
const modalName = document.getElementById("modal-name");
const modalRole = document.getElementById("modal-role");
const modalNotes = document.getElementById("modal-notes");
const modalSave = document.getElementById("modal-save");
const modalStatus = document.getElementById("modal-status");

let currentFigureId = null;

function openFigureModal(fig) {
  currentFigureId = fig.id;
  modalPhotoFrame.innerHTML = fig.photo_url ? `<img src="${fig.photo_url}" alt="${fig.name}">` : "";
  modalName.textContent = fig.name;
  modalRole.textContent = fig.role || "";
  modalNotes.value = fig.notes || "";
  modalStatus.textContent = "";
  figureModal.hidden = false;
}

function closeFigureModal() {
  figureModal.hidden = true;
  currentFigureId = null;
}

modalClose.addEventListener("click", closeFigureModal);
figureModal.addEventListener("click", (e) => {
  if (e.target === figureModal) closeFigureModal();
});

modalSave.addEventListener("click", async () => {
  if (!currentFigureId) return;
  modalSave.disabled = true;

  const { error } = await sb
    .from("figures")
    .update({ notes: modalNotes.value })
    .eq("id", currentFigureId);

  modalSave.disabled = false;

  if (error) {
    modalStatus.textContent = "Não deu pra salvar.";
    modalStatus.className = "modal-status";
    return;
  }

  modalStatus.textContent = "Salvo!";
  modalStatus.className = "modal-status ok";
});

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
