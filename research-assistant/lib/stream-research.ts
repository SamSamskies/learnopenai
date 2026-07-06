import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { ResearchBrief } from "@/lib/schemas";
import type { Response } from "openai/resources/responses/responses";
import { openai } from "@/lib/openai";
import {
  createResearchState,
  dedupeCitations,
  type Citation,
  type ResearchUIState,
} from "@/lib/research-state";

export type { Citation, ResearchPhase, ResearchUIState } from "@/lib/research-state";
export { createResearchState } from "@/lib/research-state";

function extractUrlCitations(response: Response): Citation[] {
  const message = response.output
    .filter((item) => item.type === "message")
    .at(-1);

  const citations = (message?.content ?? [])
    .filter((part) => part.type === "output_text")
    .flatMap((part) => part.annotations ?? [])
    .filter((note) => note.type === "url_citation")
    .map((note) => ({ title: note.title ?? note.url, url: note.url }));

  return dedupeCitations(citations);
}

export async function streamResearch(
  message: string,
  onSnapshot: (state: ResearchUIState) => void,
  { previousResponseId }: { previousResponseId?: string } = {}
) {
  const state = createResearchState({ phase: "searching" });
  onSnapshot(state);

  const stream = openai.responses.stream({
    model: "gpt-5-mini",
    instructions:
      "You are a research assistant for solo builders. Search the web when the question needs current or factual grounding. Return a structured brief grounded in what you find.",
    input: message,
    tools: [{ type: "web_search", search_context_size: "low" }],
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
  state.citations = extractUrlCitations(response);
  state.searched = response.output.some(
    (item) => item.type === "web_search_call"
  );
  state.phase = "done";
  onSnapshot({ ...state });
  return response.id;
}
