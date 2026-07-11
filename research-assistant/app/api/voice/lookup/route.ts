import { NextResponse } from "next/server";

const STUBS: Record<string, string> = {
  rag: "Retrieval-augmented generation — fetching external text to ground an answer.",
  vad: "Voice activity detection — deciding when the user has finished speaking.",
};

export async function POST(req: Request) {
  const { term } = (await req.json()) as { term?: string };
  const key = (term ?? "").trim().toLowerCase();
  const definition =
    STUBS[key] ?? `No stub for "${term}" — suggest Research mode for a sourced brief.`;
  return NextResponse.json({ term, definition });
}