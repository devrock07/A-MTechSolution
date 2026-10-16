import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const defaultRoot = resolve(import.meta.dirname, "..", "dist");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".mp4": "video/mp4", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8" };

export async function createPreviewServer({ directory = defaultRoot, port = 4173, host = "127.0.0.1" } = {}) {
  const root = resolve(directory);
  const { basePath } = JSON.parse(await readFile(resolve(root, "build-info.json"), "utf8"));
  const server = createServer(async (request, response) => {
    const send = (status, body, type = "text/plain; charset=utf-8", headers = {}) => {
      response.writeHead(status, { "Content-Type": type, "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", ...headers });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    try {
      if (!["GET", "HEAD"].includes(request.method)) { send(405, "Method not allowed"); return; }
      const url = new URL(request.url || "/", "http://localhost");
      const path = decodeURIComponent(url.pathname);
      if (basePath && path === basePath) { response.writeHead(308, { Location: `${basePath}/${url.search}` }); response.end(); return; }
      if (basePath && !path.startsWith(`${basePath}/`)) { send(404, "Page not found"); return; }
      const relativePath = path.slice(basePath.length);
      let file = resolve(root, `.${relativePath}`);
      if ((file !== root && !file.startsWith(`${root}${sep}`)) || relativePath.includes("\\") || relativePath.split("/").some(segment => segment.startsWith("."))) { send(400, "Bad request"); return; }
      try {
        if ((await stat(file)).isDirectory()) {
          if (!path.endsWith("/")) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }); response.end(); return; }
          file = resolve(file, "index.html");
        }
        const body = await readFile(file);
        const type = types[extname(file)] || "application/octet-stream";
        if (extname(file) === ".mp4") {
          // Media engines seek with byte ranges, including when resuming playback.
          const headers = { "Accept-Ranges": "bytes" };
          const range = request.method === "GET" && /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
          if (range && (range[1] || range[2])) {
            const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
            const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= body.length) {
              send(416, "", type, { ...headers, "Content-Range": `bytes */${body.length}` });
            } else {
              send(206, body.subarray(start, end + 1), type, { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}` });
            }
          } else send(200, body, type, headers);
        } else send(200, body, type);
      } catch (error) {
        if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
        send(404, await readFile(resolve(root, "404.html")), "text/html; charset=utf-8");
      }
    } catch { send(400, "Bad request"); }
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(port, host, accept); });
  return { server, url: `http://${host}:${server.address().port}${basePath}/` };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { url } = await createPreviewServer({ port: Number(process.env.PORT || 4173), host: process.env.HOST || "127.0.0.1" });
  console.log(`A&M Tech Solutions preview: ${url}`);
}
