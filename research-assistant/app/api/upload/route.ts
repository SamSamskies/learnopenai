import { guard } from "@/lib/guard";
import { uploadDocToSession } from "@/lib/upload-doc";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

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
