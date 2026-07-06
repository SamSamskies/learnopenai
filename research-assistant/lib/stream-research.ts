import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { ResearchBrief } from "@/lib/schemas";
import type { Response } from "openai/resources/responses/responses";
import { openai } from "@/lib/openai";
import {
  createResearchState,
  dedupeSources,
  type ResearchUIState,
  type Source,
} from "@/lib/research-state";

export type { ResearchPhase, ResearchUIState, Source } from "@/lib/research-state";
export { createResearchState } from "@/lib/research-state";

export function publicError(err: unknown): string {
  console.error("[streamResearch]", err);
  return "Research request failed. Try again in a moment.";
}

function extractSources(response: Response): Source[] {
  const message = response.output
    .filter((item) => item.type === "message")
    .at(-1);

  const annotations = (message?.content ?? [])
    .filter((part) => part.type === "output_text")
    .flatMap((part) => part.annotations ?? []);

  const urls = annotations
    .filter((note) => note.type === "url_citation")
    .map((note) => ({
      kind: "url" as const,
      title: note.title ?? note.url,
      url: note.url,
    }));

  const files = annotations
    .filter((note) => note.type === "file_citation")
    .map((note) => ({
      kind: "file" as const,
      filename: note.filename,
    }));

  return dedupeSources([...urls, ...files]);
}

export async function streamResearch(
  message: string,
  onSnapshot: (state: ResearchUIState) => void,
  {
    previousResponseId,
    vectorStoreId,
  }: { previousResponseId?: string; vectorStoreId?: string | null } = {}
) {
  const state = createResearchState({ phase: "searching" });
  onSnapshot(state);

  const stream = openai.responses.stream({
    model: "gpt-5-mini",
    instructions:
      "You are a research assistant for solo builders. Use file search when the user uploaded documents or asks about 'our spec', 'this doc', or internal material. Use web search for current public facts. Return a structured brief grounded in what you retrieve. Cite sources via annotations — do not invent filenames or URLs.",
    input: message,
    tools: [
      { type: "web_search", search_context_size: "low" },
      ...(vectorStoreId
        ? [
            {
              type: "file_search" as const,
              vector_store_ids: [vectorStoreId],
              max_num_results: 3,
            },
          ]
        : []),
    ],
    text: { format: zodTextFormat(ResearchBrief, "research_brief") },
    store: true,
    ...(previousResponseId && { previous_response_id: previousResponseId }),
  });

  for await (const event of stream) {
    if (
      event.type === "response.output_item.added" &&
      event.item.type === "web_search_call"
    ) {
      state.searched = true;
      state.phase = "searching";
      onSnapshot({ ...state });
    }

    if (
      event.type === "response.output_item.added" &&
      event.item.type === "file_search_call"
    ) {
      state.searchedDocs = true;
      state.phase = "searching";
      onSnapshot({ ...state });
    }

    if (
      event.type === "response.output_item.added" &&
      event.item.type === "message"
    ) {
      state.briefPreview = "";
    }

    if (event.type === "response.output_text.delta") {
      state.phase = "streaming-answer";
      state.briefPreview += event.delta;
      onSnapshot({ ...state });
    }
  }

  const response = await stream.finalResponse();
  state.brief = response.output_parsed ?? null;
  state.sources = extractSources(response);
  state.searched = response.output.some(
    (item) => item.type === "web_search_call"
  );
  state.searchedDocs = response.output.some(
    (item) => item.type === "file_search_call"
  );
  state.phase = "done";
  onSnapshot({ ...state });
  return response.id;
}
