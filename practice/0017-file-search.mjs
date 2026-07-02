import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const client = new OpenAI();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "product-roadmap.md");

async function ensureVectorStore() {
  const existing = process.env.FILE_SEARCH_VECTOR_STORE_ID;
  if (existing) {
    console.log("Reusing FILE_SEARCH_VECTOR_STORE_ID:", existing, "\n");
    return existing;
  }

  console.log("First run — creating vector store and uploading fixture…\n");

  const uploaded = await client.files.create({
    file: fs.createReadStream(FIXTURE),
    purpose: "assistants",
  });

  const vectorStore = await client.vectorStores.create({
    name: "learnopenai-product-roadmap",
  });

  const indexed = await client.vectorStores.files.createAndPoll(
    vectorStore.id,
    { file_id: uploaded.id }
  );
  if (indexed.status === "failed") {
    throw new Error(`Vector store indexing failed for ${uploaded.id}`);
  }

  console.log("Setup complete. Add to .env to skip setup on reruns:");
  console.log(`FILE_SEARCH_VECTOR_STORE_ID=${vectorStore.id}\n`);

  return vectorStore.id;
}

const vectorStoreId = await ensureVectorStore();

const question =
  "According to our internal roadmap doc, what is the status and priority of dark mode?";

console.log("User:", question, "\n");

// file_search is a hosted built-in — same one-request pattern as web_search (Lesson 8).
const response = await client.responses.create({
  model: "gpt-4.1-mini",
  instructions:
    "Answer from the uploaded documents only. Cite the source file when you use file search.",
  input: question,
  tools: [
    {
      type: "file_search",
      vector_store_ids: [vectorStoreId],
      max_num_results: 3,
    },
  ],
});

const fileSearchCall = response.output.find(
  (item) => item.type === "file_search_call"
);
const message = response.output.find((item) => item.type === "message");

if (fileSearchCall) {
  console.log("Platform ran file_search_call:");
  console.log("  status:", fileSearchCall.status);
  console.log("  queries:", fileSearchCall.queries);
} else {
  console.log("No file_search_call — model answered without searching.");
}

console.log("\nFinal answer:");
console.log(response.output_text);

const annotations = message?.content?.[0]?.annotations ?? [];
const fileCitations = annotations.filter((a) => a.type === "file_citation");

if (fileCitations.length) {
  console.log("\nFile citations (render filenames in your UI):");
  for (const note of fileCitations) {
    console.log(`  - ${note.filename} (${note.file_id})`);
  }
}

console.log("\nContrast with practice/0015-capstone-feature-triage.mjs:");
console.log(
  "custom get_feature_status → your handler + two-turn loop + structured card."
);
console.log(
  "file_search → OpenAI indexes your docs; answer + file_citation in one response."
);
