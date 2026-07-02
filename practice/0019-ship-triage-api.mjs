import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const client = new OpenAI();

const FEATURES = {
  "dark-mode": { title: "Dark mode", status: "planned", priority: "high" },
  sso: { title: "SSO login", status: "shipped", priority: "medium" },
  export: { title: "CSV export", status: "backlog", priority: "low" },
};

function getFeatureStatus({ feature_slug }) {
  const feature = FEATURES[feature_slug];
  if (!feature) {
    return JSON.stringify({ found: false, feature_slug });
  }
  return JSON.stringify({ found: true, ...feature, feature_slug });
}

const GetFeatureParams = z.object({
  feature_slug: z.string().describe("Feature slug, e.g. dark-mode, sso, export"),
});

const TriageCard = z.object({
  feature_title: z.string(),
  current_status: z.enum(["shipped", "planned", "backlog", "unknown"]),
  priority: z.enum(["low", "medium", "high", "unknown"]),
  recommendation: z.string(),
});

const tools = [
  zodResponsesFunction({
    name: "get_feature_status",
    description: "Look up a product feature in the backlog by slug.",
    parameters: GetFeatureParams,
  }),
];

const userQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

function createUiState(overrides = {}) {
  return {
    phase: "idle",
    toolName: null,
    callId: null,
    argsPreview: "",
    cardPreview: "",
    card: null,
    error: null,
    ...overrides,
  };
}

function sendUi(res, state) {
  res.write(`data: ${JSON.stringify(state)}\n\n`);
}

async function streamTriage(res) {
  const state = createUiState({ phase: "streaming-args" });
  let responseId;
  let toolName;
  let callId;

  sendUi(res, state);

  const turn1 = await client.responses.create({
    model: "gpt-4.1-nano",
    instructions:
      "You are a product assistant. Use get_feature_status when you need real backlog data.",
    input: userQuestion,
    tools,
    parallel_tool_calls: false,
    stream: true,
  });

  for await (const event of turn1) {
    if (
      event.type === "response.output_item.added" &&
      event.item.type === "function_call"
    ) {
      toolName = event.item.name;
      callId = event.item.call_id;
      state.toolName = toolName;
      state.callId = callId;
      state.phase = "streaming-args";
      sendUi(res, { ...state });
    }

    if (event.type === "response.function_call_arguments.delta") {
      state.argsPreview += event.delta;
      sendUi(res, { ...state });
    }

    if (event.type === "response.function_call_arguments.done") {
      state.argsPreview = event.arguments;
      sendUi(res, { ...state });
    }

    if (event.type === "response.completed") {
      responseId = event.response.id;
    }
  }

  if (!toolName || !callId) {
    sendUi(res, createUiState({ phase: "error", error: "No tool call in turn 1." }));
    return;
  }

  state.phase = "running-handler";
  sendUi(res, { ...state });

  const args = GetFeatureParams.parse(JSON.parse(state.argsPreview));
  const toolResult = getFeatureStatus(args);

  state.phase = "streaming-card";
  state.cardPreview = "";
  sendUi(res, { ...state });

  const turn2 = client.responses.stream({
    model: "gpt-4.1-nano",
    previous_response_id: responseId,
    instructions:
      "Return a triage card grounded in the tool result. Use unknown status/priority if data is missing.",
    input: [
      {
        type: "function_call_output",
        call_id: callId,
        output: toolResult,
      },
    ],
    text: { format: zodTextFormat(TriageCard, "triage_card") },
  });

  for await (const event of turn2) {
    if (event.type === "response.output_text.delta") {
      state.cardPreview += event.delta;
      sendUi(res, { ...state });
    }
  }

  const response = await turn2.finalResponse();
  state.card = response.output_parsed;
  state.phase = "done";
  sendUi(res, { ...state });
}

const demoHtml = fs.readFileSync(
  path.join(__dirname, "fixtures/triage-demo.html"),
  "utf8"
);

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(demoHtml);
    return;
  }

  if (req.url === "/api/triage") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    try {
      await streamTriage(res);
    } catch (err) {
      sendUi(
        res,
        createUiState({
          phase: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
    res.end();
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("Feature Triage API — Lesson 19\n");
  console.log(`  Demo UI:  http://localhost:${PORT}`);
  console.log(`  SSE:      GET http://localhost:${PORT}/api/triage`);
  console.log("\nOpen the demo UI, click Ask, watch phases update live.");
  console.log("API key stays on the server — browser only sees UI state.\n");
});
