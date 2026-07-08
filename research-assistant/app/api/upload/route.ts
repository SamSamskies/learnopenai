import OpenAI from "openai";
import { guard } from "@/app/api/lib/guard";
import { getSession, updateSession } from "@/app/api/lib/sessions";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const openai = new OpenAI();

async function uploadDocToSession(
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

export async function POST(req: Request) {
  const auth = guard.checkAuth(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  const rate = guard.checkRateLimit(req);
  if (!rate.ok) {
    return Response.json({ error: rate.error }, { status: rate.status });
  }

  const form = await req.formData();
  const file = form.get("file");
  const sessionId = form.get("sessionId");

  if (!(file instanceof File) || !file.size) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "file must be 4 MB or smaller" }, { status: 400 });
  }

  const entry = await uploadDocToSession(sessionId, file);
  return Response.json({ file: entry });
}
