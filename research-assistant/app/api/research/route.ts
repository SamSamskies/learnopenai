import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type Citation = { title: string; url: string };

export async function POST(req: Request) {
  const body = await req.json();
  const message = body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    instructions:
      "You are a research assistant for solo builders. Answer clearly and concisely. Cite sources when you use web search.",
    input: message.trim(),
    tools: [{ type: "web_search", search_context_size: "low" }],
  });

  const outputMessage = response.output.find((item) => item.type === "message");
  const textContent = outputMessage?.content?.find(
    (part) => part.type === "output_text"
  );
  const annotations = textContent?.annotations ?? [];

  const citations: Citation[] = annotations
    .filter((note) => note.type === "url_citation")
    .map((note) => ({
      title: note.title ?? note.url,
      url: note.url,
    }));

  return NextResponse.json({
    answer: response.output_text,
    citations,
    searched: response.output.some((item) => item.type === "web_search_call"),
  });
}