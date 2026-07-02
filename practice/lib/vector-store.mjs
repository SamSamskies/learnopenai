import fs from "node:fs";

export async function ensureVectorStore(client, fixturePath) {
  const existing = process.env.FILE_SEARCH_VECTOR_STORE_ID;
  if (existing) {
    return existing;
  }

  console.log("First run — creating vector store and uploading fixture…\n");

  const uploaded = await client.files.create({
    file: fs.createReadStream(fixturePath),
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
