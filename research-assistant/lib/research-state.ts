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
    const key = sourceLookupKey(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sourceLookupKey(source: Source): string {
  return source.kind === "url" ? urlSourceKey(source.url) : `file:${source.filename}`;
}

/** Maps 1-based raw annotation indices to 1-based deduplicated source indices. */
export function buildCitationIndexMap(sources: Source[]): Map<number, number> {
  const map = new Map<number, number>();
  const dedupedIndexByKey = new Map<string, number>();
  let nextIndex = 0;

  for (const [i, source] of sources.entries()) {
    const key = sourceLookupKey(source);
    if (!dedupedIndexByKey.has(key)) {
      nextIndex += 1;
      dedupedIndexByKey.set(key, nextIndex);
    }
    map.set(i + 1, dedupedIndexByKey.get(key)!);
  }

  return map;
}

function urlSourceKey(url: string): string {
  try {
    return new URL(url).href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function normalizeSourceUrl(url: string): string {
  return urlSourceKey(url);
}

export function clampBriefConfidence(
  brief: ResearchBrief,
  sourceCount: number
): ResearchBrief {
  if (sourceCount > 0 || brief.confidence === "low") return brief;
  return { ...brief, confidence: "low" };
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
