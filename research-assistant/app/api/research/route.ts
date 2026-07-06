import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { guard } from "@/lib/guard";
import { createResearchState } from "@/lib/research-state";
import {
  lastUserText,
  RESEARCH_PART_ID,
  type ResearchUIMessage,
} from "@/lib/research-ui-message";
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
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const message = lastUserText(messages);

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId
      ? body.sessionId
      : crypto.randomUUID();

  const stream = createUIMessageStream<ResearchUIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      try {
        const previousResponseId = getLastResponseId(sessionId) ?? undefined;
        const { vectorStoreId } = getSession(sessionId);

        const responseId = await streamResearch(message, (state) => {
          writer.write({
            type: "data-research",
            id: RESEARCH_PART_ID,
            data: state,
          });
        }, {
          previousResponseId,
          vectorStoreId,
        });

        if (responseId) {
          setLastResponseId(sessionId, responseId);
        }
      } catch (err) {
        writer.write({
          type: "data-research",
          id: RESEARCH_PART_ID,
          data: createResearchState({
            phase: "error",
            error: publicError(err),
          }),
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
