import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createUiState,
  encodeUiSnapshot,
  streamTriage,
} from "./lib/stream-triage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;

const fetchDemoHtml = fs.readFileSync(
  path.join(__dirname, "fixtures/triage-fetch-demo.html"),
  "utf8"
);

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fetchDemoHtml);
    return;
  }

  if (req.url === "/api/triage") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    try {
      await streamTriage((state) => res.write(encodeUiSnapshot(state)));
    } catch (err) {
      res.write(
        encodeUiSnapshot(
          createUiState({
            phase: "error",
            error: err instanceof Error ? err.message : String(err),
          })
        )
      );
    }
    res.end();
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Fetch Stream Client — Lesson 20\n");
  console.log(`  Demo UI:  http://localhost:${PORT}`);
  console.log(`  SSE:      GET http://localhost:${PORT}/api/triage`);
  console.log("\nSame server as Lesson 19 — client uses fetch + ReadableStream.");
  console.log("Compare with practice/fixtures/triage-demo.html (EventSource).\n");
});
