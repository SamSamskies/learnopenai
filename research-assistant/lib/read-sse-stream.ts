export async function readSseStream<T>(
  response: Response,
  onSnapshot: (state: T) => void
): Promise<T | null> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: T | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) continue;
      last = JSON.parse(line.slice(6)) as T;
      onSnapshot(last);
    }
  }

  return last;
}
