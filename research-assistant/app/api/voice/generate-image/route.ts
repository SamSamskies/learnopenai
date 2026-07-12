import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI();

export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };
  const trimmed = (prompt ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const result = await openai.images.generate({
    model: "gpt-image-1-mini",
    prompt: trimmed,
    size: "1024x1024",
    quality: "low",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "no image" }, { status: 502 });
  }

  return NextResponse.json({
    imageDataUrl: `data:image/png;base64,${b64}`,
    prompt: trimmed,
  });
}