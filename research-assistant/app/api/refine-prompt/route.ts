import { guard } from "@/lib/guard";
import { refinePrompt } from "@/lib/refine-prompt";

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