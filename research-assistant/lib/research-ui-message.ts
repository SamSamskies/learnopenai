import { isTextUIPart, type UIMessage } from "ai";
import type { ResearchUIState } from "@/lib/research-state";

export const RESEARCH_PART_ID = "research-1";

export type ResearchUIMessage = UIMessage<
  never,
  { research: ResearchUIState }
>;

export function getResearchPart(message: ResearchUIMessage) {
  return message.parts.find((part) => part.type === "data-research");
}

export function getUserText(message: ResearchUIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

export function lastUserText(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as ResearchUIMessage;
    if (message?.role !== "user" || !Array.isArray(message.parts)) continue;

    const text = message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("")
      .trim();

    if (text) return text;
  }

  return null;
}
