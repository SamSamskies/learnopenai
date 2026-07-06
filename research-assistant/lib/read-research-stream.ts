import type { ResearchUIState } from "@/lib/research-state";

export async function readResearchStream(
  response: Response,
  onSnapshot?: (state: ResearchUIState) => void
): Promise<ResearchUIState | null> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: ResearchUIState | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

      const chunk = JSON.parse(line.slice(6)) as {
        type?: string;
        data?: ResearchUIState;
      };

      if (chunk.type !== "data-research" || !chunk.data) continue;

      last = chunk.data;
      onSnapshot?.(chunk.data);
    }
  }

  return last;
}
