import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const name = path === "/" || path === "/relief-bridge/" ? "index.html" : path.replace(/^\/relief-bridge\//, "").replace(/^\//, "");
  if (!/^[a-zA-Z0-9.-]+$/.test(name)) { response.writeHead(404).end(); return; }
  try {
    const content = await readFile(join(root, name));
    response.writeHead(200, { "Content-Type": types[extname(name)] || "application/octet-stream", "Cache-Control": "no-store" }).end(content);
  } catch { response.writeHead(404).end(); }
}).listen(4173, "127.0.0.1", () => console.log("Test website: http://127.0.0.1:4173/relief-bridge/"));
