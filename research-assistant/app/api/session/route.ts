import { clearSession } from "@/app/api/lib/sessions";

export async function DELETE(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("id");
  if (sessionId) clearSession(sessionId);
  return new Response(null, { status: 204 });
}
