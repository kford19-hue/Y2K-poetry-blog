/* Y2K Poetry Blog (no build tools)
   - LocalStorage CRUD for poems
   - Search + tag filtering
   - Simple routing via location.hash
*/

const STORAGE_KEY = "y2k_poetry_posts_v1";

const els = {
  view: document.getElementById("view"),
  postList: document.getElementById("postList"),
  countText: document.getElementById("countText"),
  tagList: document.getElementById("tagList"),
  searchInput: document.getElementById("searchInput"),
  newBtn: document.getElementById("newBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  scrollTop: document.getElementById("scrollTop"),
};

let state = {
  posts: [],
  activeTag: null,
  query: "",
  selectedId: null,
};

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "poem";
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function save(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function seedIfEmpty() {
  const posts = load();
  if (posts.length) return posts;

  const demo = [
    {
      id: uid(),
      title: "glitter in my teeth",
      body:
        "i swallowed a constellation\n" +
        "and now my laughter\n" +
        "sounds like dial-up\n" +
        "trying to reach heaven.\n",
      tags: ["y2k", "soft", "stars"],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      slug: "glitter-in-my-teeth",
    },
    {
      id: uid(),
      title: "typewriter loveletter",
      body:
        "tap tap tap\n" +
        "my feelings\n" +
        "arrive in ink-stained boots\n" +
        "and refuse to leave.\n",
      tags: ["typewriter", "love"],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      slug: "typewriter-loveletter",
    },
  ];

  save(demo);
  return demo;
}

function getAllTags(posts) {
  const set = new Set();
  posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function matches(post, query, activeTag) {
  const q = (query || "").trim().toLowerCase();
  const hasTag = !activeTag || (post.tags || []).includes(activeTag);

  if (!q) return hasTag;

  const hay = [
    post.title || "",
    post.body || "",
    (post.tags || []).join(" "),
  ]
    .join("\n")
    .toLowerCase();

  return hasTag && hay.includes(q);
}

function filteredPosts() {
  return state.posts
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .filter((p) => matches(p, state.query, state.activeTag));
}

function setHashForPost(post) {
  if (!post) {
    history.replaceState(null, "", "#");
    return;
  }
  history.replaceState(null, "", `#post-${post.slug || slugify(post.title)}`);
}

function findByHash() {
  const h = (location.hash || "").replace("#", "");
  if (!h.startsWith("post-")) return null;
  const slug = h.slice(5);
  return state.posts.find((p) => p.slug === slug) || null;
}

function renderTags() {
  const tags = getAllTags(state.posts);
  const parts = [];

  parts.push(
    `<button class="tag ${state.activeTag === null ? "active" : ""}" data-tag="">
      all
     </button>`
  );

  tags.forEach((t) => {
    parts.push(
      `<button class="tag ${state.activeTag === t ? "active" : ""}" data-tag="${escapeHtml(t)}">
        #${escapeHtml(t)}
      </button>`
    );
  });

  els.tagList.innerHTML = parts.join("");

  els.tagList.querySelectorAll(".tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.getAttribute("data-tag") || "";
      state.activeTag = tag ? tag : null;
      render();
    });
  });
}

function renderList() {
  const posts = filteredPosts();
  els.countText.textContent = `${posts.length} showing`;

  els.postList.innerHTML = posts
    .map((p) => {
      const preview = (p.body || "").trim().split("\n").slice(0, 2).join(" / ");
      return `
        <article class="post" data-id="${p.id}">
          <h3>${escapeHtml(p.title || "untitled")}</h3>
          <p>${escapeHtml(preview || "…")}</p>
        </article>
      `;
    })
    .join("");

  els.postList.querySelectorAll(".post").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const post = state.posts.find((p) => p.id === id);
      if (!post) return;
      state.selectedId = post.id;
      setHashForPost(post);
      renderView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderView() {
  const byHash = findByHash();
  const post =
    byHash ||
    state.posts.find((p) => p.id === state.selectedId) ||
    filteredPosts()[0] ||
    null;

  if (!post) {
    els.view.innerHTML = `
      <h2 class="poem-title">no poems yet</h2>
      <p class="tiny">click <b>+ new poem</b> to start your archive ✨</p>
    `;
    return;
  }

  state.selectedId = post.id;

  const tagPills = (post.tags || [])
    .map((t) => `<span class="pill">#${escapeHtml(t)}</span>`)
    .join("");

  els.view.innerHTML = `
    <h2 class="poem-title">${escapeHtml(post.title || "untitled")}</h2>
    <div class="meta">
      <span class="pill">updated ${escapeHtml(formatDate(post.updatedAt))}</span>
      ${tagPills}
    </div>

    <div class="poem-body">${escapeHtml(post.body || "")}</div>

    <div class="actions">
      <button class="btn btn-primary" id="editBtn" type="button">edit</button>
      <button class="btn" id="copyLinkBtn" type="button">copy link</button>
      <button class="btn btn-danger" id="deleteBtn" type="button">delete</button>
    </div>
  `;

  document.getElementById("editBtn").addEventListener("click", () => openEditor(post));
  document.getElementById("deleteBtn").addEventListener("click", () => deletePost(post.id));
  document.getElementById("copyLinkBtn").addEventListener("click", () => copyLink(post));
}

function openEditor(existing = null) {
  const isEdit = Boolean(existing);
  const post = existing
    ? { ...existing }
    : {
        id: uid(),
        title: "",
        body: "",
        tags: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
        slug: "",
      };

  els.view.innerHTML = `
    <h2 class="poem-title">${isEdit ? "edit poem" : "new poem"}</h2>

    <label class="tiny">title</label>
    <input id="titleInput" class="input" placeholder="poem title..." value="${escapeAttr(post.title)}" />

    <div style="height: 10px;"></div>

    <label class="tiny">tags (comma separated)</label>
    <input id="tagsInput" class="input" placeholder="love, y2k, grief..." value="${escapeAttr((post.tags || []).join(", "))}" />

    <div style="height: 10px;"></div>

    <label class="tiny">poem</label>
    <textarea id="bodyInput" placeholder="write here...">${escapeHtml(post.body)}</textarea>

    <div class="actions">
      <button class="btn btn-primary" id="saveBtn" type="button">save</button>
      <button class="btn" id="cancelBtn" type="button">cancel</button>
    </div>

    <p class="tiny">
      pro tip: line breaks stay exactly as you write them ✿
    </p>
  `;

  const titleInput = document.getElementById("titleInput");
  const tagsInput = document.getElementById("tagsInput");
  const bodyInput = document.getElementById("bodyInput");

  document.getElementById("cancelBtn").addEventListener("click", () => render());
  document.getElementById("saveBtn").addEventListener("click", () => {
    const title = titleInput.value.trim();
    const tags = tagsInput.value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    const body = bodyInput.value.replace(/\r\n/g, "\n");

    const updatedAt = nowISO();
    const slug = slugify(title || post.slug || "poem") + "-" + post.id.slice(-4);

    const next = {
      ...post,
      title: title || "untitled",
      tags,
      body,
      updatedAt,
      slug: post.slug || slug,
    };

    upsertPost(next);
    state.selectedId = next.id;
    setHashForPost(next);
    render();
  });

  titleInput.focus();
}

function upsertPost(post) {
  const idx = state.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) state.posts[idx] = post;
  else state.posts.push(post);
  save(state.posts);
}

function deletePost(id) {
  const post = state.posts.find((p) => p.id === id);
  if (!post) return;

  const ok = confirm(`Delete "${post.title}"? This can’t be undone.`);
  if (!ok) return;

  state.posts = state.posts.filter((p) => p.id !== id);
  save(state.posts);

  const remaining = filteredPosts();
  state.selectedId = remaining[0]?.id || null;
  setHashForPost(remaining[0] || null);
  render();
}

function copyLink(post) {
  const url = `${location.origin}${location.pathname}#post-${post.slug}`;
  navigator.clipboard?.writeText(url).then(
    () => toast("link copied ✨"),
    () => toast("couldn’t copy link (your browser said no)")
  );
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "22px";
  t.style.transform = "translateX(-50%)";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "14px";
  t.style.background = "rgba(255,255,255,.92)";
  t.style.border = "1px solid rgba(17,19,33,.18)";
  t.style.boxShadow = "0 14px 40px rgba(0,0,0,.35)";
  t.style.zIndex = "999";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1200);
}

function exportPosts() {
  const payload = {
    version: 1,
    exportedAt: nowISO(),
    posts: state.posts,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "poetry-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importPosts(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const incoming = Array.isArray(parsed) ? parsed : parsed.posts;
      if (!Array.isArray(incoming)) throw new Error("bad format");

      // Light normalization
      const cleaned = incoming.map((p) => ({
        id: p.id || uid(),
        title: String(p.title || "untitled"),
        body: String(p.body || ""),
        tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()) : [],
        createdAt: p.createdAt || nowISO(),
        updatedAt: p.updatedAt || nowISO(),
        slug: p.slug || slugify(p.title || "poem") + "-" + (p.id || uid()).slice(-4),
      }));

      state.posts = cleaned;
      save(state.posts);
      state.activeTag = null;
      state.query = "";
      els.searchInput.value = "";
      setHashForPost(cleaned[0] || null);
      toast("imported ✓");
      render();
    } catch {
      alert("Could not import that file. Make sure it’s a valid JSON export.");
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function render() {
  renderTags();
  renderList();
  renderView();
}

function wire() {
  els.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderList();
  });

  els.newBtn.addEventListener("click", () => openEditor(null));

  els.exportBtn.addEventListener("click", exportPosts);

  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importPosts(f);
    e.target.value = "";
  });

  window.addEventListener("hashchange", () => renderView());

  els.scrollTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function init() {
  state.posts = seedIfEmpty();
  const byHash = findByHash();
  state.selectedId = byHash?.id || state.posts[0]?.id || null;
  wire();
  render();
}

init();
