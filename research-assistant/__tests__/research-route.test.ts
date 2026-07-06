import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/research/route";
import { readSseStream } from "@/lib/read-sse-stream";
import type { ResearchUIState } from "@/lib/research-state";

const mockStream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/openai", () => ({
  openai: {
    responses: { stream: mockStream },
  },
}));

function fakeBriefStream() {
  const events = [
    {
      type: "response.output_item.added",
      item: { type: "web_search_call" },
    },
    { type: "response.output_text.delta", delta: '{"headline":' },
    { type: "response.output_text.delta", delta: '"Test"}' },
  ];
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e;
    },
    finalResponse: async () => ({
      id: "resp_test_123",
      output: [
        { type: "web_search_call" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "{}",
              annotations: [
                {
                  type: "url_citation",
                  title: "Example",
                  url: "https://example.com",
                },
              ],
            },
          ],
        },
      ],
      output_parsed: {
        headline: "Test",
        summary: "Summary.",
        key_points: ["One"],
        confidence: "high",
      },
    }),
  };
}

describe("POST /api/research", () => {
  beforeEach(() => {
    mockStream.mockReset();
    mockStream.mockReturnValue(fakeBriefStream());
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
