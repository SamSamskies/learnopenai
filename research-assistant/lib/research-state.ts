import type { ResearchBrief } from "@/lib/schemas";

export type Source =
  | { kind: "url"; title: string; url: string }
  | { kind: "file"; filename: string };

export type ResearchPhase =
  | "idle"
  | "searching"
  | "streaming-answer"
  | "done"
  | "error";

export type ResearchUIState = {
  phase: ResearchPhase;
  briefPreview: string;
  brief: ResearchBrief | null;
  sources: Source[];
  searched: boolean;
  searchedDocs: boolean;
  error: string | null;
};

export function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key =
      s.kind === "url" ? urlSourceKey(s.url) : `file:${s.filename}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function urlSourceKey(url: string): string {
  try {
    return new URL(url).href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function createResearchState(
  overrides: Partial<ResearchUIState> = {}
): ResearchUIState {
  return {
    phase: "idle",
    briefPreview: "",
    brief: null,
    sources: [],
    searched: false,
    searchedDocs: false,
    error: null,
    ...overrides,
  };
}
