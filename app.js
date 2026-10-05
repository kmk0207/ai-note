const state = {
  manifest: [],
  current: null,
  markdown: "",
  mode: "preview",
};

const elements = {
  shell: document.querySelector(".app-shell"),
  noteNav: document.querySelector("#noteNav"),
  currentSection: document.querySelector("#currentSection"),
  currentTitle: document.querySelector("#currentTitle"),
  previewPanel: document.querySelector("#previewPanel"),
  editorPanel: document.querySelector("#editorPanel"),
  markdownInput: document.querySelector("#markdownInput"),
  noteTitleInput: document.querySelector("#noteTitleInput"),
  viewButton: document.querySelector("#viewButton"),
  editButton: document.querySelector("#editButton"),
  saveLocalButton: document.querySelector("#saveLocalButton"),
  saveGithubButton: document.querySelector("#saveGithubButton"),
  newNoteButton: document.querySelector("#newNoteButton"),
  sidebarOpen: document.querySelector("#sidebarOpen"),
  sidebarClose: document.querySelector("#sidebarClose"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  ownerInput: document.querySelector("#ownerInput"),
  repoInput: document.querySelector("#repoInput"),
  branchInput: document.querySelector("#branchInput"),
  tokenInput: document.querySelector("#tokenInput"),
};

const storageKeys = {
  draft: (path) => `ai-note:draft:${path}`,
  settings: "ai-note:github-settings",
};

boot();

async function boot() {
  loadSettings();
  await loadManifest();
  renderNav();
  bindEvents();
  const firstNote = state.manifest.flatMap((section) => section.notes)[0];
  if (firstNote) {
    await openNote(firstNote.path);
  }
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
  elements.settingsButton.addEventListener("click", () => elements.settingsDialog.showModal());
  elements.saveSettingsButton.addEventListener("click", saveSettings);
  elements.markdownInput.addEventListener("input", updateMarkdownFromEditor);
  elements.noteTitleInput.addEventListener("input", updateTitleFromEditor);
}

function setSidebar(value) {
  elements.shell.dataset.sidebar = value;
}

function setMode(mode) {
  state.mode = mode;
  const isPreview = mode === "preview";
  elements.previewPanel.classList.toggle("hidden", !isPreview);
  elements.editorPanel.classList.toggle("hidden", isPreview);
  elements.viewButton.classList.toggle("active", isPreview);
  elements.editButton.classList.toggle("active", !isPreview);
  if (isPreview) {
    renderPreview();
  }
}

function renderNav() {
  elements.noteNav.innerHTML = "";
  for (const section of state.manifest) {
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
  elements.currentSection.textContent = note.sectionTitle;
  elements.currentTitle.textContent = note.title;
  elements.noteTitleInput.value = note.title;
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
}

function updateTitleFromEditor() {
  if (!state.current) return;
  state.current.title = elements.noteTitleInput.value.trim() || "Untitled note";
  elements.currentTitle.textContent = state.current.title;
  syncCurrentNoteIntoManifest();
  renderNav();
}

function saveLocalDraft() {
  if (!state.current) return;
  localStorage.setItem(storageKeys.draft(state.current.path), state.markdown);
  toast("Draft saved in this browser.");
}

function createNewNote() {
  const slug = prompt("New note slug, for example transformer-reading-log");
  if (!slug) return;
  const safeSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const title = safeSlug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  const note = {
    title,
    path: `notes/${safeSlug}.md`,
    section: "paper-review",
    sectionTitle: "Paper Review",
  };
  state.current = note;
  state.markdown = `# ${title}\n\n## 한 줄 요약\n\n\n## 배경\n\n\n## 핵심 아이디어\n\n\n## 헷갈리는 부분\n\n\n## 스터디 질문\n\n`;
  syncCurrentNoteIntoManifest();
  renderNav();
  elements.currentSection.textContent = note.sectionTitle;
  elements.currentTitle.textContent = note.title;
  elements.noteTitleInput.value = note.title;
  elements.markdownInput.value = state.markdown;
  setMode("edit");
  toast("Write the note, then commit it to GitHub.");
}

async function commitCurrentNote() {
  if (!state.current) return;

  const settings = getSettings();
  if (!settings.owner || !settings.repo || !settings.branch || !settings.token) {
    elements.settingsDialog.showModal();
    toast("Add GitHub settings first.");
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
  toast("Committed to GitHub.");
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
  if (existing) {
    existing.title = note.title;
  } else {
    section.notes.push(note);
  }
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
  elements.previewPanel.innerHTML = markdownToHtml(state.markdown);
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
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadSettings() {
  const settings = getSettings();
  elements.ownerInput.value = settings.owner;
  elements.repoInput.value = settings.repo;
  elements.branchInput.value = settings.branch;
  elements.tokenInput.value = settings.token;
}

function getSettings() {
  const fallback = { owner: "", repo: "ai-note", branch: "main", token: "" };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storageKeys.settings)) };
  } catch {
    return fallback;
  }
}

function saveSettings() {
  const settings = {
    owner: elements.ownerInput.value.trim(),
    repo: elements.repoInput.value.trim() || "ai-note",
    branch: elements.branchInput.value.trim() || "main",
    token: elements.tokenInput.value.trim(),
  };
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
  elements.settingsDialog.close();
  toast("Settings saved.");
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
