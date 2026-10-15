// Static server: /app/* -> the duckweather project, everything else -> comp/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const APP = path.resolve(import.meta.dirname, "../..");
const COMP = path.resolve(import.meta.dirname, "comp");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
export function serve(port = 8731) {
  const srv = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split("?")[0]);
    let file;
    if (url.startsWith("/app/")) file = path.join(APP, url.slice(5) || "index.html");
    else file = path.join(COMP, url === "/" ? "index.html" : url);
    if (url !== "/" && url.endsWith("/")) file = path.join(file, "index.html");
    if (!file.startsWith(APP) && !file.startsWith(COMP)) { res.writeHead(403); return res.end(); }
    if (file.includes(`${path.sep}brag-output${path.sep}`) && file.startsWith(APP) && !file.startsWith(COMP)) { res.writeHead(404); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}
