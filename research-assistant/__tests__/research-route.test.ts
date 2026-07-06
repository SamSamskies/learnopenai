import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/research/route";
import { readSseStream } from "@/lib/read-sse-stream";
import type { ResearchUIState } from "@/lib/research-state";

const mockStreamText = vi.hoisted(() => vi.fn());

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: mockStreamText,
  };
});

function fakeBriefStream() {
  const events = [
    { type: "tool-call", toolName: "web_search", toolCallId: "tc_1", input: {} },
    { type: "text-delta", text: '{"headline":' },
    { type: "text-delta", text: '"Test"}' },
    { type: "finish", finishReason: "stop" },
  ];

  return {
    stream: (async function* () {
      for (const event of events) yield event;
    })(),
    output: Promise.resolve({
      headline: "Test",
      summary: "Summary.",
      key_points: ["One"],
      confidence: "high",
    }),
    content: Promise.resolve([
      {
        type: "text",
        text: "{}",
        providerMetadata: {
          openai: {
            itemId: "msg_1",
            annotations: [
              {
                type: "url_citation",
                title: "Example",
                url: "https://example.com",
                start_index: 0,
                end_index: 0,
              },
            ],
          },
        },
      },
    ]),
    toolCalls: Promise.resolve([{ toolName: "web_search" }]),
    finalStep: Promise.resolve({
      providerMetadata: {
        openai: { responseId: "resp_test_123" },
      },
    }),
  };
}

describe("POST /api/research", () => {
  beforeEach(() => {
    mockStreamText.mockReset();
    mockStreamText.mockReturnValue(fakeBriefStream());
    delete process.env.RESEARCH_API_SECRET;
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "message is required" });
  });

  it("returns 401 when secret is set and token is wrong", async () => {
    process.env.RESEARCH_API_SECRET = "dev-secret";
    const res = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hi" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("streams searching → streaming-answer → done", async () => {
    const phases: string[] = [];
    const res = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What changed?" }),
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const final = await readSseStream<ResearchUIState>(res, (s) =>
      phases.push(s.phase)
    );

    expect(phases[0]).toBe("searching");
    expect(phases).toContain("streaming-answer");
    expect(final?.phase).toBe("done");
    expect(final?.brief?.headline).toBe("Test");
    expect(final?.sources.some((s) => s.kind === "url")).toBe(true);
  });
});
