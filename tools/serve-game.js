#!/usr/bin/env node
/* Local preview for the static toolkit and its fan adventure. No dependencies. */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8765);
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp4":"video/mp4" };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch (_) { response.writeHead(400); response.end("Bad request"); return; }
  const segments = pathname.replace(/\\/g,"/").split("/").filter(Boolean);
  if (segments.some(segment => segment.startsWith(".")) || !["GET","HEAD"].includes(request.method)) {
    response.writeHead(403); response.end("Unavailable"); return;
  }
  const file = path.resolve(root, ...segments, segments.length ? "" : "index.html");
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) { response.writeHead(403); response.end("Unavailable"); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, {"Content-Type":types[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length":stat.size, "Cache-Control":"no-cache"});
    if (request.method === "HEAD") { response.end(); return; }
    const stream = fs.createReadStream(file); stream.on("error", () => response.destroy()); stream.pipe(response);
  });
});
server.on("error", error => { console.error("Preview unavailable: " + error.message); process.exitCode=1; });
server.listen(port,"127.0.0.1",() => console.log("Play: http://127.0.0.1:"+port+"/index.html?game=love-deepspace"));
