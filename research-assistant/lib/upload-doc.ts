import { getSession, updateSession } from "@/lib/sessions";
import { openai } from "@/lib/openai";

export async function uploadDocToSession(
  sessionId: string,
  file: File
): Promise<{ name: string; fileId: string }> {
  const session = getSession(sessionId);
  let vectorStoreId = session.vectorStoreId;

  if (!vectorStoreId) {
    const store = await openai.vectorStores.create({
      name: `research-${sessionId.slice(0, 8)}`,
    });
    vectorStoreId = store.id;
    updateSession(sessionId, { vectorStoreId });
  }

  const uploaded = await openai.files.create({
    file,
    purpose: "assistants",
  });

  const indexed = await openai.vectorStores.files.createAndPoll(vectorStoreId, {
    file_id: uploaded.id,
  });
  if (indexed.status === "failed") {
    throw new Error(`Indexing failed for ${file.name}`);
  }

  const entry = { name: file.name, fileId: uploaded.id };
  updateSession(sessionId, { files: [...session.files, entry] });
  return entry;
}
