const state = {
  manifest: [],
  current: null,
  markdown: "",
  mode: "preview",
  composeMode: "write",
  view: "home",
};

const elements = {
  shell: document.querySelector(".app-shell"),
  noteNav: document.querySelector("#noteNav"),
  currentSection: document.querySelector("#currentSection"),
  currentTitle: document.querySelector("#currentTitle"),
  postActions: document.querySelector("#postActions"),
  previewPanel: document.querySelector("#previewPanel"),
  editorPanel: document.querySelector("#editorPanel"),
  markdownInput: document.querySelector("#markdownInput"),
  noteTitleInput: document.querySelector("#noteTitleInput"),
  subjectInput: document.querySelector("#subjectInput"),
  tagInput: document.querySelector("#tagInput"),
  composeModeLabel: document.querySelector("#composeModeLabel"),
  saveStatus: document.querySelector("#saveStatus"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  writeTabButton: document.querySelector("#writeTabButton"),
  previewTabButton: document.querySelector("#previewTabButton"),
  imageButton: document.querySelector("#imageButton"),
  linkButton: document.querySelector("#linkButton"),
  linkPanel: document.querySelector("#linkPanel"),
  linkTextInput: document.querySelector("#linkTextInput"),
  linkUrlInput: document.querySelector("#linkUrlInput"),
  insertLinkButton: document.querySelector("#insertLinkButton"),
  imageInput: document.querySelector("#imageInput"),
  composePreview: document.querySelector("#composePreview"),
  viewButton: document.querySelector("#viewButton"),
  editButton: document.querySelector("#editButton"),
  deleteNoteButton: document.querySelector("#deleteNoteButton"),
  saveLocalButton: document.querySelector("#saveLocalButton"),
  saveGithubButton: document.querySelector("#saveGithubButton"),
  newNoteButton: document.querySelector("#newNoteButton"),
  homeButton: document.querySelector("#homeButton"),
  sidebarOpen: document.querySelector("#sidebarOpen"),
  sidebarClose: document.querySelector("#sidebarClose"),
};

const storageKeys = {
  draft: (path) => `ai-note:draft:${path}`,
  settings: "ai-note:github-settings",
};

boot();

async function boot() {
  await loadManifest();
  renderNav();
  bindEvents();
  await showHome();
}

async function loadManifest() {
  const response = await fetch("./notes/manifest.json");
  state.manifest = await response.json();
}

function bindEvents() {
  elements.sidebarOpen.addEventListener("click", () => setSidebar("open"));
  elements.sidebarClose.addEventListener("click", () => setSidebar("closed"));
  elements.viewButton.addEventListener("click", () => setMode("preview"));
  elements.editButton.addEventListener("click", () => setMode("edit"));
  elements.saveLocalButton.addEventListener("click", saveLocalDraft);
  elements.saveGithubButton.addEventListener("click", () => {
    commitCurrentNote().catch((error) => toast(error.message));
  });
  elements.newNoteButton.addEventListener("click", createNewNote);
  elements.homeButton.addEventListener("click", showHome);
  elements.cancelEditButton.addEventListener("click", () => setMode("preview"));
  elements.writeTabButton.addEventListener("click", () => setComposeMode("write"));
  elements.previewTabButton.addEventListener("click", () => setComposeMode("preview"));
  elements.imageButton.addEventListener("click", () => elements.imageInput.click());
  elements.linkButton.addEventListener("click", toggleLinkPanel);
  elements.insertLinkButton.addEventListener("click", insertLink);
  elements.imageInput.addEventListener("change", insertSelectedImage);
  elements.deleteNoteButton.addEventListener("click", () => {
    deleteCurrentNote().catch((error) => toast(error.message));
  });
  elements.markdownInput.addEventListener("input", updateMarkdownFromEditor);
  elements.noteTitleInput.addEventListener("input", updateTitleFromEditor);
  elements.subjectInput.addEventListener("change", updateSubjectFromEditor);
  elements.tagInput.addEventListener("input", updateTagFromEditor);
}

function setSidebar(value) {
  elements.shell.dataset.sidebar = value;
}

function setMode(mode) {
  if (!state.current && mode !== "preview") return;
  state.mode = mode;
  state.view = "post";
  const isPreview = mode === "preview";
  elements.previewPanel.classList.toggle("hidden", !isPreview);
  elements.editorPanel.classList.toggle("hidden", isPreview);
  elements.postActions.classList.remove("hidden");
  elements.viewButton.classList.toggle("active", isPreview);
  elements.editButton.classList.toggle("active", !isPreview);
  if (isPreview) {
    renderPreview();
  } else {
    elements.composeModeLabel.textContent = state.current?.isNew ? "NEW NOTE" : "EDIT NOTE";
    setComposeMode("write");
  }
}

async function showHome() {
  state.view = "home";
  state.current = null;
  state.markdown = "";
  state.mode = "preview";
  elements.currentSection.textContent = "Home";
  elements.currentTitle.textContent = "All Posts";
  elements.previewPanel.classList.remove("hidden");
  elements.editorPanel.classList.add("hidden");
  elements.postActions.classList.add("hidden");
  document.querySelectorAll(".note-link").forEach((button) => {
    button.classList.remove("active");
  });
  elements.previewPanel.innerHTML = await renderHome();
  elements.previewPanel.querySelectorAll("[data-open-note]").forEach((card) => {
    card.addEventListener("click", () => openNote(card.dataset.openNote));
  });
  if (window.matchMedia("(max-width: 820px)").matches) {
    setSidebar("closed");
  }
}

function setComposeMode(mode) {
  state.composeMode = mode;
  const isWrite = mode === "write";
  elements.markdownInput.classList.toggle("hidden", !isWrite);
  elements.composePreview.classList.toggle("hidden", isWrite);
  elements.writeTabButton.classList.toggle("active", isWrite);
  elements.previewTabButton.classList.toggle("active", !isWrite);
  if (!isWrite) {
    elements.composePreview.innerHTML = markdownBodyToHtml(state.markdown);
  }
}

function renderNav() {
  elements.noteNav.innerHTML = "";
  elements.subjectInput.innerHTML = "";
  for (const section of state.manifest) {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.title;
    elements.subjectInput.append(option);

    const wrapper = document.createElement("section");
    wrapper.className = "note-section";

    const toggle = document.createElement("button");
    toggle.className = "section-toggle";
    toggle.type = "button";
    toggle.innerHTML = `<span>${escapeHtml(section.title)}</span><span aria-hidden="true">⌄</span>`;

    const list = document.createElement("div");
    list.className = "note-list";

    toggle.addEventListener("click", () => {
      const isHidden = list.classList.toggle("hidden");
      toggle.querySelector("span:last-child").textContent = isHidden ? "›" : "⌄";
    });

    for (const note of section.notes) {
      const button = document.createElement("button");
      button.className = "note-link";
      button.type = "button";
      button.textContent = note.title;
      button.dataset.path = note.path;
      button.addEventListener("click", () => openNote(note.path));
      list.append(button);
    }

    wrapper.append(toggle, list);
    elements.noteNav.append(wrapper);
  }
}

async function openNote(path) {
  const note = findNote(path);
  if (!note) return;

  const draft = localStorage.getItem(storageKeys.draft(path));
  if (draft) {
    state.markdown = draft;
  } else {
    const response = await fetch(`./${path}`);
    state.markdown = await response.text();
  }

  state.current = note;
  state.view = "post";
  elements.postActions.classList.remove("hidden");
  elements.currentSection.textContent = note.sectionTitle;
  elements.currentTitle.textContent = note.title;
  elements.noteTitleInput.value = note.title;
  elements.subjectInput.value = note.section;
  elements.tagInput.value = note.tags || "";
  elements.composeModeLabel.textContent = "EDIT NOTE";
  elements.saveStatus.textContent = localStorage.getItem(storageKeys.draft(path)) ? "임시저장됨" : "저장 전";
  elements.markdownInput.value = state.markdown;
  document.querySelectorAll(".note-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.path === path);
  });
  renderPreview();
  if (window.matchMedia("(max-width: 820px)").matches) {
    setSidebar("closed");
  }
}

function findNote(path) {
  for (const section of state.manifest) {
    const note = section.notes.find((item) => item.path === path);
    if (note) {
      return { ...note, section: section.id, sectionTitle: section.title };
    }
  }
  return null;
}

function updateMarkdownFromEditor() {
  state.markdown = elements.markdownInput.value;
  elements.saveStatus.textContent = "저장 전";
}

function updateTitleFromEditor() {
  if (!state.current) return;
  state.current.title = elements.noteTitleInput.value.trim() || "Untitled note";
  elements.currentTitle.textContent = state.current.title;
  syncCurrentNoteIntoManifest();
  renderNav();
  elements.subjectInput.value = state.current.section;
  elements.saveStatus.textContent = "저장 전";
}

function updateSubjectFromEditor() {
  if (!state.current) return;
  const section = state.manifest.find((item) => item.id === elements.subjectInput.value);
  if (!section) return;
  moveCurrentNoteToSection(section);
  elements.currentSection.textContent = section.title;
  elements.saveStatus.textContent = "저장 전";
}

function updateTagFromEditor() {
  if (!state.current) return;
  state.current.tags = elements.tagInput.value.trim();
  syncCurrentNoteIntoManifest();
  elements.saveStatus.textContent = "저장 전";
}

function saveLocalDraft() {
  if (!state.current) return;
  localStorage.setItem(storageKeys.draft(state.current.path), state.markdown);
  elements.saveStatus.textContent = "임시저장됨";
  toast("브라우저에 임시저장했어요.");
}

function createNewNote() {
  const title = "";
  const note = {
    title: "새 노트",
    path: `notes/draft-${Date.now()}.md`,
    section: "paper-review",
    sectionTitle: "Paper Review",
    tags: "",
    isNew: true,
  };
  state.current = note;
  state.markdown = "";
  syncCurrentNoteIntoManifest();
  renderNav();
  elements.currentSection.textContent = note.sectionTitle;
  elements.currentTitle.textContent = "새 노트 작성";
  elements.noteTitleInput.value = title;
  elements.noteTitleInput.placeholder = "노트 제목";
  elements.subjectInput.value = note.section;
  elements.tagInput.value = "";
  elements.composeModeLabel.textContent = "NEW NOTE";
  elements.saveStatus.textContent = "저장 전";
  elements.markdownInput.value = state.markdown;
  setMode("edit");
  toast("새 노트를 작성해보세요.");
}

async function commitCurrentNote() {
  if (!state.current) return;
  prepareCurrentNoteForSave();

  const settings = getSettings();
  if (!settings.owner || !settings.repo || !settings.branch || !settings.token) {
    saveLocalDraft();
    toast("GitHub 토큰이 없어 브라우저에 저장했어요.");
    return;
  }

  const path = state.current.path;
  const apiBase = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;
  let sha;

  const existing = await fetch(`${apiBase}?ref=${settings.branch}`, {
    headers: githubHeaders(settings.token),
  });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    throw new Error(`GitHub could not read the file: ${existing.status}`);
  }

  const body = {
    message: `Update ${state.current.title}`,
    content: toBase64(state.markdown),
    branch: settings.branch,
    ...(sha ? { sha } : {}),
  };

  const saved = await fetch(apiBase, {
    method: "PUT",
    headers: githubHeaders(settings.token),
    body: JSON.stringify(body),
  });

  if (!saved.ok) {
    const detail = await saved.text();
    throw new Error(`GitHub commit failed: ${detail}`);
  }

  await commitManifest(settings);
  localStorage.removeItem(storageKeys.draft(path));
  state.current.isNew = false;
  elements.saveStatus.textContent = "저장됨";
  toast("GitHub에 저장했어요.");
}

async function deleteCurrentNote() {
  if (!state.current) return;
  const ok = confirm(`'${state.current.title}' 글을 삭제할까요?`);
  if (!ok) return;

  const deletedPath = state.current.path;
  const previousManifest = structuredClone(state.manifest);
  removeNoteFromManifest(deletedPath);
  localStorage.removeItem(storageKeys.draft(deletedPath));

  try {
    await persistLocalDelete(deletedPath);
  } catch (error) {
    state.manifest = previousManifest;
    renderNav();
    throw error;
  }

  renderNav();
  const nextNote = state.manifest.flatMap((section) => section.notes)[0];
  if (nextNote) {
    await openNote(nextNote.path);
    setMode("preview");
  } else {
    state.current = null;
    state.markdown = "";
    await showHome();
  }
}

async function persistLocalDelete(path) {
  if (!("showDirectoryPicker" in window)) {
    throw new Error(
      "이 브라우저는 로컬 파일 삭제를 지원하지 않아요. Chrome에서 열고 다시 시도해 주세요.",
    );
  }

  const root = await window.showDirectoryPicker({
    id: "ai-note-root",
    mode: "readwrite",
  });
  const notesDirectory = await root.getDirectoryHandle("notes");
  const manifestHandle = await notesDirectory.getFileHandle("manifest.json");

  if (!path.includes("/draft-")) {
    const filename = path.replace(/^notes\//, "");
    await notesDirectory.removeEntry(filename).catch((error) => {
      if (error.name !== "NotFoundError") {
        throw error;
      }
    });
  }

  const manifestWritable = await manifestHandle.createWritable();
  await manifestWritable.write(`${JSON.stringify(state.manifest, null, 2)}\n`);
  await manifestWritable.close();
  toast("로컬 파일에서 삭제했어요. 이제 git add/commit/push 하면 공개 사이트에 반영돼요.");
}

function prepareCurrentNoteForSave() {
  if (!state.current) return;
  const title = elements.noteTitleInput.value.trim();
  if (!title) {
    throw new Error("노트 제목을 먼저 입력해 주세요.");
  }
  state.current.title = title;
  elements.currentTitle.textContent = title;
  const previousPath = state.current.path;
  if (state.current.isNew || state.current.path.includes("/draft-")) {
    state.current.path = `notes/${createSlug(title)}.md`;
  }
  if (previousPath !== state.current.path) {
    removeNoteFromManifest(previousPath);
  }
  syncCurrentNoteIntoManifest();
}

async function commitManifest(settings) {
  syncCurrentNoteIntoManifest();
  const path = "notes/manifest.json";
  const apiBase = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;
  let sha;

  const existing = await fetch(`${apiBase}?ref=${settings.branch}`, {
    headers: githubHeaders(settings.token),
  });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    throw new Error(`GitHub could not read the note list: ${existing.status}`);
  }

  const body = {
    message: "Update note list",
    content: toBase64(`${JSON.stringify(state.manifest, null, 2)}\n`),
    branch: settings.branch,
    ...(sha ? { sha } : {}),
  };

  const saved = await fetch(apiBase, {
    method: "PUT",
    headers: githubHeaders(settings.token),
    body: JSON.stringify(body),
  });

  if (!saved.ok) {
    const detail = await saved.text();
    throw new Error(`GitHub note list update failed: ${detail}`);
  }
}

function syncCurrentNoteIntoManifest() {
  if (!state.current) return;

  const section =
    state.manifest.find((item) => item.id === state.current.section) ||
    state.manifest.find((item) => item.id === "paper-review");
  if (!section) return;

  const existing = section.notes.find((note) => note.path === state.current.path);
  const note = { title: state.current.title, path: state.current.path };
  if (state.current.tags) {
    note.tags = state.current.tags;
  }
  if (existing) {
    existing.title = note.title;
    if (note.tags) {
      existing.tags = note.tags;
    } else {
      delete existing.tags;
    }
  } else {
    section.notes.push(note);
  }
}

function moveCurrentNoteToSection(section) {
  const previousSection = state.manifest.find((item) => item.id === state.current.section);
  if (previousSection) {
    previousSection.notes = previousSection.notes.filter((note) => note.path !== state.current.path);
  }
  state.current.section = section.id;
  state.current.sectionTitle = section.title;
  syncCurrentNoteIntoManifest();
  renderNav();
  elements.subjectInput.value = section.id;
}

function removeNoteFromManifest(path) {
  for (const section of state.manifest) {
    section.notes = section.notes.filter((note) => note.path !== path);
  }
}

function createSlug(value) {
  const fallback = `note-${Date.now()}`;
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function renderPreview() {
  elements.previewPanel.innerHTML = renderBlogPost();
}

async function renderHome() {
  const notes = getAllNotes();
  const cards = await Promise.all(
    notes.map(async (note) => {
      const markdown = await loadNoteMarkdown(note.path);
      const excerpt = createExcerpt(markdown, note.title);
      const tags = parseTags(note.tags)
        .slice(0, 4)
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("");
      return `
        <button class="post-card" type="button" data-open-note="${escapeHtml(note.path)}">
          <div class="post-card-section">${escapeHtml(note.sectionTitle)}</div>
          <h2>${escapeHtml(note.title)}</h2>
          <p>${escapeHtml(excerpt)}</p>
          ${tags ? `<div class="post-card-tags">${tags}</div>` : ""}
        </button>
      `;
    }),
  );

  return `
    <section class="home-view">
      <header class="home-hero">
        <span>AI NOTE</span>
        <h1>All Posts</h1>
        <p>논문 리뷰, AI 기초, 데이터 공부를 한 곳에 모아두는 개인 공부 블로그.</p>
      </header>
      <div class="post-grid">
        ${cards.join("") || `<p class="empty-posts">아직 작성된 글이 없습니다.</p>`}
      </div>
    </section>
  `;
}

function getAllNotes() {
  return state.manifest.flatMap((section) =>
    section.notes.map((note) => ({
      ...note,
      section: section.id,
      sectionTitle: section.title,
    })),
  );
}

async function loadNoteMarkdown(path) {
  const draft = localStorage.getItem(storageKeys.draft(path));
  if (draft) return draft;
  try {
    const response = await fetch(`./${path}`);
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function createExcerpt(markdown, title = "") {
  const text = stripMarkdown(removeLeadingTitle(markdown, title))
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 130 ? `${text.slice(0, 130)}...` : text || "아직 본문이 없습니다.";
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/^!\[[^\]]*]\([^)]+\)$/gm, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/[`*_]/g, "");
}

function removeLeadingTitle(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  if (title && lines[0]?.trim() === `# ${title}`) {
    return lines.slice(1).join("\n");
  }
  return markdown;
}

function renderBlogPost() {
  if (!state.current) return "";
  const tags = parseTags(state.current.tags)
    .map((tag) => `<span class="post-tag">${escapeHtml(tag)}</span>`)
    .join("");
  return `
    <header class="post-header">
      <h1>${escapeHtml(state.current.title)}</h1>
      <div class="post-meta">
        <span>AI Note</span>
        <span>${escapeHtml(state.current.sectionTitle)}</span>
      </div>
      ${tags ? `<div class="post-tags">${tags}</div>` : ""}
    </header>
    <div class="post-body">
      ${markdownBodyToHtml(state.markdown)}
    </div>
  `;
}

function markdownBodyToHtml(markdown) {
  return markdownToHtml(stripLeadingTitle(markdown));
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let listOpen = false;
  let quoteOpen = false;

  const closeBlocks = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
    if (quoteOpen) {
      html.push("</blockquote>");
      quoteOpen = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeBlocks();
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      closeBlocks();
      html.push(
        `<figure><img src="${sanitizeUrl(imageMatch[2])}" alt="${escapeHtml(imageMatch[1])}" /></figure>`,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      if (!quoteOpen) {
        closeBlocks();
        html.push("<blockquote>");
        quoteOpen = true;
      }
      html.push(`<p>${inlineMarkdown(line.slice(2))}</p>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!listOpen) {
        closeBlocks();
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    closeBlocks();
    if (line.startsWith("### ")) {
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else {
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }

  closeBlocks();
  return html.join("");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
      return `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSettings() {
  const fallback = { owner: "kmk0207", repo: "ai-note", branch: "main", token: "" };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storageKeys.settings)) };
  } catch {
    return fallback;
  }
}

function toast(message) {
  const item = document.createElement("div");
  item.textContent = message;
  item.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 20;
    background: #18232b;
    color: white;
    padding: 12px 14px;
    border-radius: 8px;
    box-shadow: 0 16px 40px rgba(0,0,0,.18);
  `;
  document.body.append(item);
  window.setTimeout(() => item.remove(), 2600);
}

function insertLink() {
  const url = elements.linkUrlInput.value.trim();
  if (!url) return;
  const label = elements.linkTextInput.value.trim() || url;
  insertAtCursor(`[${label}](${url})`);
  elements.linkTextInput.value = "";
  elements.linkUrlInput.value = "";
  elements.linkPanel.classList.add("hidden");
}

function toggleLinkPanel() {
  elements.linkPanel.classList.toggle("hidden");
  if (!elements.linkPanel.classList.contains("hidden")) {
    elements.linkTextInput.focus();
  }
}

function insertSelectedImage() {
  const file = elements.imageInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    insertAtCursor(`![${file.name}](${reader.result})`);
    elements.imageInput.value = "";
  });
  reader.readAsDataURL(file);
}

function insertAtCursor(snippet) {
  const textarea = elements.markdownInput;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const prefix = textarea.value.slice(0, start);
  const suffix = textarea.value.slice(end);
  const spacingBefore = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
  const spacingAfter = suffix && !suffix.startsWith("\n") ? "\n\n" : "";
  textarea.value = `${prefix}${spacingBefore}${snippet}${spacingAfter}${suffix}`;
  state.markdown = textarea.value;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + spacingBefore.length + snippet.length;
  elements.saveStatus.textContent = "저장 전";
}

function stripLeadingTitle(markdown) {
  const title = state.current?.title?.trim();
  if (!title) return markdown;
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() === `# ${title}`) {
    return lines.slice(1).join("\n").trimStart();
  }
  return markdown;
}

function parseTags(tags) {
  return String(tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function sanitizeUrl(url) {
  const value = String(url || "").trim();
  if (/^(https?:|data:image\/|\.\/|\/|#)/i.test(value)) {
    return escapeHtml(value);
  }
  return "#";
}
