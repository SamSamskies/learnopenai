import "server-only";

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

function extractOutputText(response: Response): string {
  if (response.output_text) return response.output_text;

  const message = response.output
    .filter((item) => item.type === "message")
    .at(-1);
  const textContent = message?.content?.find(
    (part) => part.type === "output_text"
  );
  return textContent?.text ?? "";
}

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
  onSnapshot: (state: ResearchUIState) => void
) {
  const state = createResearchState({ phase: "searching" });
  onSnapshot(state);

  const stream = await openai.responses.create({
    model: "gpt-5-mini",
    instructions:
      "You are a research assistant for solo builders. Answer clearly and concisely. Cite sources when you use web search.",
    input: message,
    tools: [{ type: "web_search", search_context_size: "low" }],
    stream: true,
  });

  let finalText = "";

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
      state.answerPreview = "";
    }

    if (event.type === "response.output_text.delta") {
      state.phase = "streaming-answer";
      state.answerPreview += event.delta;
      onSnapshot({ ...state });
    }

    if (event.type === "response.output_text.done") {
      finalText = event.text;
    }

    if (event.type === "response.completed") {
      state.answer = finalText || state.answerPreview || extractOutputText(event.response);
      state.citations = extractUrlCitations(event.response);
      state.searched = event.response.output.some(
        (item) => item.type === "web_search_call"
      );
      state.phase = "done";
      onSnapshot({ ...state });
    }
  }
}
