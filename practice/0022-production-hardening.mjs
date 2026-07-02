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
import { createTriageGuard, sendJsonError } from "./lib/triage-guard.mjs";
import { ensureVectorStore } from "./lib/vector-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const client = new OpenAI();
const TRIAGE_SECRET = process.env.TRIAGE_API_SECRET ?? "dev-secret";
const guard = createTriageGuard({ secret: TRIAGE_SECRET, maxPerMinute: 5 });

const demoHtml = fs.readFileSync(
  path.join(__dirname, "fixtures/triage-hardening-demo.html"),
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
    const auth = guard.checkAuth(req);
    if (!auth.ok) {
      sendJsonError(res, auth.status, auth.error);
      return;
    }

    const rate = guard.checkRateLimit(req);
    if (!rate.ok) {
      sendJsonError(res, rate.status, rate.error);
      return;
    }

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
      const message =
        err instanceof Error ? err.message : "Triage request failed";
      res.write(
        encodeUiSnapshot(
          createUiState({
            phase: "error",
            error: message,
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
  console.log("Production Hardening — Lesson 22\n");
  console.log(`  Demo UI:  http://localhost:${PORT}`);
  console.log(`  Backlog:  GET /api/triage?mode=backlog`);
  console.log(`  Docs:     GET /api/triage?mode=docs`);
  console.log("\nAuth: Authorization: Bearer <TRIAGE_API_SECRET>");
  console.log(`  Local default: TRIAGE_API_SECRET=${TRIAGE_SECRET}`);
  console.log("Rate limit: 5 requests / minute / IP on /api/triage\n");
});
