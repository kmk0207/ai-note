import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);

    if (request.method === "POST" && url.pathname === "/api/delete-note") {
      await deleteNote(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/save-note") {
      await saveNote(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/upload-image") {
      await uploadImage(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = safePath(requested);
    const extension = path.extname(filePath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": types[extension] || "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 500;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : error.message);
  }
}).listen(port, () => {
  console.log(`AI Note local editor running at http://localhost:${port}`);
});

async function deleteNote(request, response) {
  const body = await readJson(request);
  const notePath = normalizeNotePath(body.path);
  const manifest = validateManifest(body.manifest);

  if (!notePath.includes("/draft-")) {
    await rm(safePath(notePath), { force: true });
  }

  await writeFile(
    safePath("notes/manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ ok: true }));
}
async function saveNote(request, response) {
  const body = await readJson(request);
  const notePath = normalizeNotePath(body.path);
  const manifest = validateManifest(body.manifest);
  const markdown = typeof body.markdown === "string" ? body.markdown : "";

  await writeFile(safePath(notePath), markdown, "utf8");
  await writeFile(
    safePath("notes/manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ ok: true }));
}

async function uploadImage(request, response) {
  const body = await readJson(request, 20_000_000);
  const filename = normalizeImageFilename(body.filename);
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const match = dataUrl.match(/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error("Invalid image data");
  }

  await mkdir(safePath("images"), { recursive: true });
  await writeFile(safePath(`images/${filename}`), Buffer.from(match[1], "base64"));

  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ ok: true, path: `images/${filename}` }));
}
function safePath(relativePath) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Unsafe path");
  }
  return resolved;
}


function normalizeImageFilename(filename) {
  if (typeof filename !== "string") {
    throw new Error("Missing image filename");
  }
  const extension = path.extname(filename).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) {
    throw new Error("Unsupported image file type");
  }
  const basename = path
    .basename(filename, extension)
    .normalize("NFKD")
    .replace(/[^\w가-힣-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const safeBase = basename || "image";
  return `${Date.now()}-${safeBase}${extension}`;
}
function normalizeNotePath(notePath) {
  if (typeof notePath !== "string") {
    throw new Error("Missing note path");
  }
  const normalized = notePath.replaceAll("\\", "/");
  if (!/^notes\/[a-zA-Z0-9가-힣._-]+\.md$/.test(normalized)) {
    throw new Error("Invalid note path");
  }
  return normalized;
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest)) {
    throw new Error("Invalid manifest");
  }
  for (const section of manifest) {
    if (!section || typeof section.id !== "string" || typeof section.title !== "string") {
      throw new Error("Invalid manifest section");
    }
    if (!Array.isArray(section.notes)) {
      throw new Error("Invalid manifest notes");
    }
    for (const note of section.notes) {
      normalizeNotePath(note.path);
      if (typeof note.title !== "string") {
        throw new Error("Invalid manifest note");
      }
    }
  }
  return manifest;
}

function readJson(request, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}
