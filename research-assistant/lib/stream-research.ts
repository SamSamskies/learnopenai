import "server-only";

import { openai } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { ResearchBrief } from "@/lib/schemas";
import { extractSources } from "@/lib/extract-sources";
import {
  clampBriefConfidence,
  createResearchState,
  dedupeSources,
  type ResearchUIState,
  type Source,
} from "@/lib/research-state";

export type { ResearchPhase, ResearchUIState, Source } from "@/lib/research-state";
export { createResearchState } from "@/lib/research-state";

const INSTRUCTIONS =
  "You are a research assistant for solo builders. Use file search when the user uploaded documents or asks about 'our spec', 'this doc', or internal material. Use web search for current public facts. Return a structured brief grounded in what you retrieve. Cite sources via annotations in key_points only — keep summary as uncited synthesis. Do not invent filenames or URLs.";

export function publicError(err: unknown): string {
  console.error("[streamResearch]", err);
  return "Research request failed. Try again in a moment.";
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

  const tools = {
    web_search: openai.tools.webSearch({ searchContextSize: "low" }),
    ...(vectorStoreId
      ? {
          file_search: openai.tools.fileSearch({
            vectorStoreIds: [vectorStoreId],
            maxNumResults: 3,
          }),
        }
      : {}),
  };

  const result = streamText({
    model: openai.responses("gpt-5-mini"),
    system: INSTRUCTIONS,
    prompt: message,
    tools,
    output: Output.object({ schema: ResearchBrief, name: "research_brief" }),
    providerOptions: {
      openai: {
        store: true,
        ...(previousResponseId && { previousResponseId }),
      },
    },
  });

  for await (const part of result.stream) {
    if (part.type === "tool-call") {
      if (part.toolName === "web_search") {
        state.searched = true;
        state.phase = "searching";
        onSnapshot({ ...state });
      }
      if (part.toolName === "file_search") {
        state.searchedDocs = true;
        state.phase = "searching";
        onSnapshot({ ...state });
      }
    }

    if (part.type === "text-delta") {
      state.phase = "streaming-answer";
      state.briefPreview += part.text;
      onSnapshot({ ...state });
    }
  }

  const content = await result.content;

  state.brief = (await result.output) ?? null;
  state.sources = extractSources(content);
  const toolCalls = await result.toolCalls;
  state.searched =
    state.searched ||
    toolCalls.some((call) => call?.toolName === "web_search");
  state.searchedDocs =
    state.searchedDocs ||
    toolCalls.some((call) => call?.toolName === "file_search");
  if (state.brief) {
    state.brief = clampBriefConfidence(
      state.brief,
      dedupeSources(state.sources).length
    );
  }
  state.phase = "done";
  onSnapshot({ ...state });

  const responseId = (await result.finalStep).providerMetadata?.openai
    ?.responseId;
  return typeof responseId === "string" ? responseId : undefined;
}
