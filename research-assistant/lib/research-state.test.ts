import { describe, expect, it } from "vitest";
import { buildCitationIndexMap, clampBriefConfidence, type Source } from "./research-state";

describe("buildCitationIndexMap", () => {
  it("maps duplicate annotations to the same deduplicated index", () => {
    const sources: Source[] = [
      { kind: "url", title: "A", url: "https://a.com/1" },
      { kind: "url", title: "B", url: "https://b.com/" },
      { kind: "url", title: "A again", url: "https://a.com/1" },
      { kind: "url", title: "C", url: "https://c.com/" },
    ];

    expect(buildCitationIndexMap(sources)).toEqual(
      new Map([
        [1, 1],
        [2, 2],
        [3, 1],
        [4, 3],
      ])
    );
  });
});

describe("clampBriefConfidence", () => {
  const brief = {
    headline: "Test",
    summary: "Summary.",
    key_points: ["One"],
    confidence: "high" as const,
  };

  it("leaves confidence unchanged when sources exist", () => {
    expect(clampBriefConfidence(brief, 2).confidence).toBe("high");
  });

  it("downgrades high confidence when no sources were cited", () => {
    expect(clampBriefConfidence(brief, 0).confidence).toBe("low");
  });

  it("leaves low confidence unchanged when no sources were cited", () => {
    expect(
      clampBriefConfidence({ ...brief, confidence: "low" }, 0).confidence
    ).toBe("low");
  });
});
