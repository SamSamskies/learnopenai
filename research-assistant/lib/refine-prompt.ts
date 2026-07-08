import "server-only";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const INSTRUCTIONS =
  "Improve research questions. Rewrite the draft into one clear, specific question. Preserve topic and constraints. Do not invent facts. Return only the improved question.";

export async function refinePrompt(draft: string): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: INSTRUCTIONS,
    prompt: draft,
  });
  return text.trim();
}