import { guard } from "@/lib/guard";
import { createResearchState } from "@/lib/research-state";
import {
  getLastResponseId,
  getSession,
  setLastResponseId,
} from "@/lib/sessions";
import { publicError, streamResearch } from "@/lib/stream-research";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = guard.checkAuth(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  const rate = guard.checkRateLimit(req);
  if (!rate.ok) {
    return Response.json({ error: rate.error }, { status: rate.status });
  }

  const body = await req.json();
  const message = body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (state: Parameters<typeof streamResearch>[1] extends (
        s: infer S
      ) => void
        ? S
        : never) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(state)}\n\n`)
        );

      try {
        const sessionId =
          typeof body.sessionId === "string" && body.sessionId
            ? body.sessionId
            : crypto.randomUUID();

        const previousResponseId = getLastResponseId(sessionId) ?? undefined;
        const { vectorStoreId } = getSession(sessionId);
        const responseId = await streamResearch(message.trim(), send, {
          previousResponseId,
          vectorStoreId,
        });

        if (responseId) {
          setLastResponseId(sessionId, responseId);
        }
      } catch (err) {
        send(
          createResearchState({
            phase: "error",
            error: publicError(err),
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
