import { ResearchChat } from "@/components/ResearchChat";
import { ResearchErrorBoundary } from "@/components/ResearchErrorBoundary";

export default function Home() {
  return (
    <ResearchErrorBoundary>
      <ResearchChat />
    </ResearchErrorBoundary>
  );
}
