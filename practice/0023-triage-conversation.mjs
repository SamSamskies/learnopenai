import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import {
  createUiState,
  encodeUiSnapshot,
  streamTriageDocs,
} from "./lib/stream-triage-docs.mjs";
import { createTriageGuard, sendJsonError } from "./lib/triage-guard.mjs";
import { ensureVectorStore } from "./lib/vector-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const client = new OpenAI();
const TRIAGE_SECRET = process.env.TRIAGE_API_SECRET ?? "dev-secret";
const guard = createTriageGuard({ secret: TRIAGE_SECRET, maxPerMinute: 12 });

const sessions = new Map();

const demoHtml = fs.readFileSync(
  path.join(__dirname, "fixtures/triage-conversation-demo.html"),
  "utf8"
);

const vectorStoreId = await ensureVectorStore(
  client,
  path.join(__dirname, "fixtures/product-roadmap.md")
);

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(demoHtml);
    return;
  }

  if (req.url === "/api/triage" && req.method === "POST") {
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

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJsonError(res, 400, "Invalid JSON body");
      return;
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      sendJsonError(res, 400, "message is required");
      return;
    }

    const sessionId =
      typeof body.sessionId === "string" && body.sessionId
        ? body.sessionId
        : crypto.randomUUID();
    const previousResponseId = sessions.get(sessionId) ?? null;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      const { lastResponseId } = await streamTriageDocs(
        (state) => res.write(encodeUiSnapshot(state)),
        message,
        vectorStoreId,
        { previousResponseId }
      );

      if (lastResponseId) {
        sessions.set(sessionId, lastResponseId);
      }
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

  if (req.url?.startsWith("/api/session") && req.method === "DELETE") {
    const auth = guard.checkAuth(req);
    if (!auth.ok) {
      sendJsonError(res, auth.status, auth.error);
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const sessionId = url.searchParams.get("id");
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Multi-turn Triage — Lesson 23\n");
  console.log(`  Demo UI:  http://localhost:${PORT}`);
  console.log("  POST /api/triage  { message, sessionId? }");
  console.log("  DELETE /api/session?id=<sessionId>  (new chat)");
  console.log("\nAuth: Authorization: Bearer <TRIAGE_API_SECRET>");
  console.log(`  Local default: TRIAGE_API_SECRET=${TRIAGE_SECRET}`);
  console.log("Server stores lastResponseId per sessionId for chaining.\n");
});
