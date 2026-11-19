// Serves public/ on http://localhost:8080 (PORT changes it): `npm start`. Only for development and the browser tests; the finished site is
// static files that any web server serves. Written once by `pisa init`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "public");
const port = Number(process.env.PORT ?? 8080);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const file = normalize(join(root, path.endsWith("/") ? `${path}index.html` : path));
  if (!file.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  let content;
  try {
    content = await readFile(file);
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(content);
}).listen(port, () => console.log(`AdressenSingletier on http://localhost:${port}/`));
