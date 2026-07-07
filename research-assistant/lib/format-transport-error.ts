const DEFAULT =
  "Something went wrong. Please try again.";

export function formatTransportError(error: Error): string {
  const msg = error.message.toLowerCase();

  if (error.name === "AbortError") {
    return "The request was cancelled.";
  }
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed")
  ) {
    return "Connection problem — check your network and try again.";
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return "You're not signed in. Refresh the page and try again.";
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return "Too many requests — wait a moment and try again.";
  }
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
    return "Our servers hit a snag. Try again in a few seconds.";
  }

  return DEFAULT;
}
