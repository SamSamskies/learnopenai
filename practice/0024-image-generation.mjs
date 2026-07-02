import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const client = new OpenAI();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output");

const imageModel = process.env.IMAGE_MODEL ?? "gpt-image-1-mini";
const responseModel = process.env.IMAGE_RESPONSE_MODEL ?? "gpt-5-mini";
const runResponses = process.argv.includes("--responses");

fs.mkdirSync(OUT_DIR, { recursive: true });

function saveB64(filename, b64) {
  const file = path.join(OUT_DIR, filename);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  console.log("Saved:", file);
}

function imageCalls(output) {
  return output.filter((item) => item.type === "image_generation_call");
}

// --- Part 1: Image API (single-shot generate) ---
console.log("=== Part 1: Image API ===\n");
console.log("model:", imageModel);

const prompt =
  "A minimal flat icon of a green checkmark inside a circle, white background, product UI style, no text";

const generated = await client.images.generate({
  model: imageModel,
  prompt,
  size: "1024x1024",
  quality: "low",
});

const imageB64 = generated.data[0]?.b64_json;
if (!imageB64) {
  throw new Error("No b64_json in response — check model access and org verification");
}

saveB64("badge-image-api.png", imageB64);
if (generated.data[0]?.revised_prompt) {
  console.log("revised_prompt:", generated.data[0].revised_prompt);
}
console.log();

if (!runResponses) {
  console.log("Part 2 skipped. Run with --responses for multi-turn image_generation tool.");
  console.log("  node practice/0024-image-generation.mjs --responses");
  process.exit(0);
}

// --- Part 2: Responses API (generate + edit via previous_response_id) ---
console.log("=== Part 2: Responses API (image_generation tool) ===\n");
console.log("model:", responseModel);

const first = await client.responses.create({
  model: responseModel,
  input: "Generate a simple product mascot: a friendly green otter wearing a tiny hard hat",
  tools: [{ type: "image_generation" }],
  store: true,
});

const firstCall = imageCalls(first.output)[0];
if (!firstCall?.result) {
  throw new Error("No image_generation_call in first response");
}

saveB64("mascot-v1.png", firstCall.result);
console.log("response id:", first.id);
if (firstCall.revised_prompt) {
  console.log("revised_prompt:", firstCall.revised_prompt);
}
console.log();

const second = await client.responses.create({
  model: responseModel,
  previous_response_id: first.id,
  input: "Same otter, but watercolor illustration style with soft pastel colors",
  tools: [{ type: "image_generation" }],
  store: true,
});

const secondCall = imageCalls(second.output)[0];
if (!secondCall?.result) {
  throw new Error("No image_generation_call in follow-up response");
}

saveB64("mascot-v2-watercolor.png", secondCall.result);
console.log("follow-up response id:", second.id);
console.log("\nCompare mascot-v1.png vs mascot-v2-watercolor.png in practice/output/");
