import type { ResearchBrief } from "@/lib/schemas";

export type ConfidenceLevel = ResearchBrief["confidence"];

export function generateConfidenceCopy(level: ConfidenceLevel): {
  label: string;
  tone: "positive" | "caution" | "warning";
} {
  switch (level) {
    case "high":
      return {
        label: "Well-supported by retrieved sources",
        tone: "positive",
      };
    case "medium":
      return {
        label: "Partially supported — verify key claims",
        tone: "caution",
      };
    case "low":
      return {
        label: "Limited source coverage — treat as a draft",
        tone: "warning",
      };
  }
}