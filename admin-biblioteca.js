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

async function loadBooksAdmin() {
  const { data, error } = await sb.from("books").select("*").order("created_at", { ascending: false });

  if (error) { bookList.textContent = "Erro ao carregar."; return; }
  if (!data || data.length === 0) { bookList.textContent = "Nenhum livro ainda."; return; }

  bookList.innerHTML = "";
  data.forEach(book => {
    const row = document.createElement("div");
    row.className = "admin-row";
    const statusLabel = book.status === "lido" ? "Já li" : "Quero ler";
    row.innerHTML = `<span>${book.title}${book.author ? " — " + book.author : ""} (${statusLabel})</span><button data-id="${book.id}">Remover</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      await sb.from("books").delete().eq("id", book.id);
      loadBooksAdmin();
    });
    bookList.appendChild(row);
  });
}

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookSubmit.disabled = true;

  let coverUrl = null;
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

  const { error } = await sb.from("books").insert([{
    title: document.getElementById("book-title").value.trim(),
    author: document.getElementById("book-author").value.trim() || null,
    cover_url: coverUrl,
    status: document.getElementById("book-status").value
  }]);

  bookSubmit.disabled = false;

  if (error) {
    bookStatusMsg.textContent = "Não deu pra salvar.";
    bookStatusMsg.className = "status-msg error";
    return;
  }

  bookStatusMsg.textContent = "Livro salvo!";
  bookStatusMsg.className = "status-msg ok";
  bookForm.reset();
  loadBooksAdmin();
});

loadFigures();
loadBooksAdmin();
