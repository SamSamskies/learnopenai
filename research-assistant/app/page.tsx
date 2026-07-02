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

        <form className="flex flex-col gap-4">
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-foreground outline-none placeholder:text-zinc-500 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-400 dark:focus:border-zinc-500"
            placeholder="Ask a research question…"
            rows={4}
          />
          <button
            type="button"
            disabled
            className="self-end rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
