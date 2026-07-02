import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

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

export const backlogQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

export const docsQuestion =
  "According to our internal roadmap doc, what is the status and priority of dark mode? Cite the source file.";

export function createUiState(overrides = {}) {
  return {
    phase: "idle",
    path: null,
    toolName: null,
    callId: null,
    argsPreview: "",
    cardPreview: "",
    card: null,
    searchQueries: [],
    answerPreview: "",
    answer: null,
    citations: [],
    error: null,
    ...overrides,
  };
}

export function encodeUiSnapshot(state) {
  return `data: ${JSON.stringify(state)}\n\n`;
}

function buildTools(vectorStoreId) {
  return [
    zodResponsesFunction({
      name: "get_feature_status",
      description: "Look up a product feature in the live backlog by slug.",
      parameters: GetFeatureParams,
    }),
    {
      type: "file_search",
      vector_store_ids: [vectorStoreId],
      max_num_results: 3,
    },
  ];
}

const instructions =
  "You are a product assistant. Use get_feature_status for live backlog lookups. " +
  "Use file search when the user asks about uploaded documents like the product roadmap. " +
  "Prefer the tool that matches the data source the user named.";

function extractFileCitations(response) {
  const message = response.output.find((item) => item.type === "message");
  const annotations = message?.content?.[0]?.annotations ?? [];
  return annotations
    .filter((note) => note.type === "file_citation")
    .map((note) => ({ filename: note.filename, fileId: note.file_id }));
}

async function runBacklogTurn2(state, responseId, callId, onSnapshot) {
  state.phase = "running-handler";
  onSnapshot({ ...state });

  const args = GetFeatureParams.parse(JSON.parse(state.argsPreview));
  const toolResult = getFeatureStatus(args);

  state.phase = "streaming-card";
  state.cardPreview = "";
  onSnapshot({ ...state });

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
      onSnapshot({ ...state });
    }
  }

  const response = await turn2.finalResponse();
  state.card = response.output_parsed;
  state.phase = "done";
  onSnapshot({ ...state });
}

export async function streamTriageDocs(onSnapshot, userQuestion, vectorStoreId) {
  const state = createUiState({ phase: "routing", path: null });
  onSnapshot(state);

  let path = null;
  let toolName;
  let callId;
  let responseId;

  const turn1 = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions,
    input: userQuestion,
    tools: buildTools(vectorStoreId),
    parallel_tool_calls: false,
    stream: true,
  });

  for await (const event of turn1) {
    if (
      event.type === "response.output_item.added" &&
      event.item.type === "function_call"
    ) {
      path = "backlog";
      toolName = event.item.name;
      callId = event.item.call_id;
      state.path = "backlog";
      state.toolName = toolName;
      state.callId = callId;
      state.phase = "streaming-args";
      onSnapshot({ ...state });
    }

    if (
      event.type === "response.output_item.added" &&
      event.item.type === "file_search_call"
    ) {
      path = "docs";
      state.path = "docs";
      state.phase = "searching-docs";
      onSnapshot({ ...state });
    }

    if (path === "backlog" && event.type === "response.function_call_arguments.delta") {
      state.argsPreview += event.delta;
      onSnapshot({ ...state });
    }

    if (path === "backlog" && event.type === "response.function_call_arguments.done") {
      state.argsPreview = event.arguments;
      onSnapshot({ ...state });
    }

    if (path === "docs" && event.type === "response.output_text.delta") {
      state.phase = "streaming-answer";
      state.answerPreview += event.delta;
      onSnapshot({ ...state });
    }

    if (event.type === "response.completed") {
      responseId = event.response.id;

      if (path === "docs") {
        const search = event.response.output.find(
          (item) => item.type === "file_search_call"
        );
        state.searchQueries = search?.queries ?? [];
        state.answer = event.response.output_text;
        state.citations = extractFileCitations(event.response);
        state.phase = "done";
        onSnapshot({ ...state });
        return;
      }
    }
  }

  if (path === "backlog") {
    if (!toolName || !callId) {
      onSnapshot(
        createUiState({ phase: "error", error: "No tool call in turn 1." })
      );
      return;
    }
    await runBacklogTurn2(state, responseId, callId, onSnapshot);
    return;
  }

  onSnapshot(
    createUiState({
      phase: "error",
      error: "Model did not call get_feature_status or file_search.",
    })
  );
}
