import { describe, expect, it } from "vitest";
import { clampBriefConfidence } from "@/lib/research-state";

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
