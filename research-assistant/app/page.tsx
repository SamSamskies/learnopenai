import { ResearchChat } from "@/components/ResearchChat";
import { ResearchErrorBoundary } from "@/components/ResearchErrorBoundary";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col">
        <ResearchErrorBoundary>
          <ResearchChat />
        </ResearchErrorBoundary>
      </main>
    </div>
  );
}
