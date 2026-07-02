import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import {
  backlogQuestion,
  createUiState,
  docsQuestion,
  encodeUiSnapshot,
  streamTriageDocs,
} from "./lib/stream-triage-docs.mjs";
import { ensureVectorStore } from "./lib/vector-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const client = new OpenAI();

const demoHtml = fs.readFileSync(
  path.join(__dirname, "fixtures/triage-docs-demo.html"),
  "utf8"
);

const vectorStoreId = await ensureVectorStore(
  client,
  path.join(__dirname, "fixtures/product-roadmap.md")
);

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(demoHtml);
    return;
  }

  if (req.url?.startsWith("/api/triage")) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const mode = url.searchParams.get("mode") ?? "backlog";
    const question = mode === "docs" ? docsQuestion : backlogQuestion;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      await streamTriageDocs(
        (state) => res.write(encodeUiSnapshot(state)),
        question,
        vectorStoreId
      );
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
  console.log("Triage + File Search — Lesson 21\n");
  console.log(`  Demo UI:  http://localhost:${PORT}`);
  console.log(`  Backlog:  GET /api/triage?mode=backlog`);
  console.log(`  Docs:     GET /api/triage?mode=docs`);
  console.log("\nTwo buttons — same route, model picks the tool per question.");
  console.log("Requires FILE_SEARCH_VECTOR_STORE_ID in .env after first run.\n");
});
