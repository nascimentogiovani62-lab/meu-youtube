// ---------- referências ----------

const figForm = document.getElementById("figure-form");
const figSubmit = document.getElementById("fig-submit");
const figStatus = document.getElementById("fig-status");
const figureList = document.getElementById("figure-list");

async function loadFigures() {
  const { data, error } = await sb.from("figures").select("*").order("created_at", { ascending: false });

  if (error) { figureList.textContent = "Erro ao carregar."; return; }
  if (!data || data.length === 0) { figureList.textContent = "Nenhuma referência ainda."; return; }

  figureList.innerHTML = "";
  data.forEach(fig => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `<span>${fig.name}${fig.role ? " — " + fig.role : ""}</span><button data-id="${fig.id}">Remover</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      await sb.from("figures").delete().eq("id", fig.id);
      loadFigures();
    });
    figureList.appendChild(row);
  });
}

figForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  figSubmit.disabled = true;

  let photoUrl = null;
  const file = document.getElementById("fig-photo").files[0];

  if (file) {
    const filePath = `figures/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from("mural").upload(filePath, file);
    if (uploadError) {
      figStatus.textContent = "Não deu pra subir a foto.";
      figStatus.className = "status-msg error";
      figSubmit.disabled = false;
      return;
    }
    const { data: urlData } = sb.storage.from("mural").getPublicUrl(filePath);
    photoUrl = urlData.publicUrl;
  }

  const { error } = await sb.from("figures").insert([{
    name: document.getElementById("fig-name").value.trim(),
    role: document.getElementById("fig-role").value.trim() || null,
    photo_url: photoUrl
  }]);

  figSubmit.disabled = false;

  if (error) {
    figStatus.textContent = "Não deu pra salvar.";
    figStatus.className = "status-msg error";
    return;
  }

  figStatus.textContent = "Referência salva!";
  figStatus.className = "status-msg ok";
  figForm.reset();
  loadFigures();
});

// ---------- livros ----------

const bookForm = document.getElementById("book-form");
const bookSubmit = document.getElementById("book-submit");
const bookStatusMsg = document.getElementById("book-status-msg");
const bookList = document.getElementById("book-list");
const bookFormTitle = document.getElementById("book-form-title");
const bookCancelEdit = document.getElementById("book-cancel-edit");

let editingBookId = null;

function enterEditMode(book) {
  editingBookId = book.id;
  document.getElementById("book-title").value = book.title;
  document.getElementById("book-author").value = book.author || "";
  document.getElementById("book-status").value = book.status;
  document.getElementById("book-cover").value = "";

  bookFormTitle.textContent = "Editar livro";
  bookSubmit.textContent = "Salvar alterações";
  bookCancelEdit.hidden = false;
  bookStatusMsg.textContent = "";
  bookForm.scrollIntoView({ behavior: "smooth" });
}

function exitEditMode() {
  editingBookId = null;
  bookForm.reset();
  bookFormTitle.textContent = "Adicionar livro";
  bookSubmit.textContent = "Salvar livro";
  bookCancelEdit.hidden = true;
  bookStatusMsg.textContent = "";
}

bookCancelEdit.addEventListener("click", exitEditMode);

async function loadBooksAdmin() {
  const { data, error } = await sb.from("books").select("*").order("created_at", { ascending: false });

  if (error) { bookList.textContent = "Erro ao carregar."; return; }
  if (!data || data.length === 0) { bookList.textContent = "Nenhum livro ainda."; return; }

  bookList.innerHTML = "";
  data.forEach(book => {
    const row = document.createElement("div");
    row.className = "admin-row";
    const statusLabel = book.status === "lido" ? "Já li" : "Quero ler";
    row.innerHTML = `
      <span>${book.title}${book.author ? " — " + book.author : ""} (${statusLabel})</span>
      <span class="row-actions">
        <button class="thumb-btn" data-id="${book.id}">Editar</button>
        <button data-id="${book.id}">Remover</button>
      </span>
    `;
    row.querySelector(".thumb-btn").addEventListener("click", () => enterEditMode(book));
    row.querySelector("button:not(.thumb-btn)").addEventListener("click", async () => {
      await sb.from("books").delete().eq("id", book.id);
      if (editingBookId === book.id) exitEditMode();
      loadBooksAdmin();
    });
    bookList.appendChild(row);
  });
}

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookSubmit.disabled = true;

  let coverUrl = undefined; // undefined = não mexe na capa atual, se estiver editando
  const file = document.getElementById("book-cover").files[0];

  if (file) {
    const filePath = `books/${Date.now()}-${file.name}`;
    const { error: uploadError } = await sb.storage.from("mural").upload(filePath, file);
    if (uploadError) {
      bookStatusMsg.textContent = "Não deu pra subir a capa.";
      bookStatusMsg.className = "status-msg error";
      bookSubmit.disabled = false;
      return;
    }
    const { data: urlData } = sb.storage.from("mural").getPublicUrl(filePath);
    coverUrl = urlData.publicUrl;
  }

  const payload = {
    title: document.getElementById("book-title").value.trim(),
    author: document.getElementById("book-author").value.trim() || null,
    status: document.getElementById("book-status").value
  };
  if (coverUrl !== undefined) payload.cover_url = coverUrl;

  let error;

  if (editingBookId) {
    ({ error } = await sb.from("books").update(payload).eq("id", editingBookId));
  } else {
    if (coverUrl === undefined) payload.cover_url = null;
    ({ error } = await sb.from("books").insert([payload]));
  }

  bookSubmit.disabled = false;

  if (error) {
    bookStatusMsg.textContent = "Não deu pra salvar.";
    bookStatusMsg.className = "status-msg error";
    return;
  }

  const wasEditing = !!editingBookId;
  bookStatusMsg.textContent = wasEditing ? "Alterações salvas!" : "Livro salvo!";
  bookStatusMsg.className = "status-msg ok";

  if (wasEditing) {
    exitEditMode();
  } else {
    bookForm.reset();
  }

  loadBooksAdmin();
});

loadFigures();
loadBooksAdmin();
