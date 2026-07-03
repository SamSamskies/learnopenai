import { ResearchChat } from "@/components/ResearchChat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Research Assistant
          </h1>
          <p className="mt-2 text-zinc-600 italic dark:text-zinc-400">
            Web-grounded research for solo builders
          </p>
        </header>

        <ResearchChat />
      </main>
    </div>
  );
}
