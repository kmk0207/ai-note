import { createServer } from "node:http";
import { readFile, rm, writeFile } from "node:fs/promises";
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

function safePath(relativePath) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Unsafe path");
  }
  return resolved;
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

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
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
