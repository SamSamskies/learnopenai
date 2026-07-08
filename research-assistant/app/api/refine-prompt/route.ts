import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { guard } from "@/app/api/lib/guard";

const INSTRUCTIONS =
  "Improve research questions. Rewrite the draft into one clear, specific question. Preserve topic and constraints. Do not invent facts. Return only the improved question.";

async function refinePrompt(draft: string): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: INSTRUCTIONS,
    prompt: draft,
  });
  return text.trim();
}

export async function POST(req: Request) {
  const auth = guard.checkAuth(req);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const rate = guard.checkRateLimit(req);
  if (!rate.ok) return Response.json({ error: rate.error }, { status: rate.status });

  const { draft } = await req.json();
  if (typeof draft !== "string" || draft.trim().length < 8) {
    return Response.json({ error: "draft too short" }, { status: 400 });
  }
  const refined = await refinePrompt(draft.trim());
  return Response.json({ refined });
}
