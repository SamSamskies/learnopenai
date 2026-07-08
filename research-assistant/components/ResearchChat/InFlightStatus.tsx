import { Spinner } from "./icons";

function SearchSkeletonCard() {
  return (
    <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded bg-surface-container" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-container" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    </div>
  );
}

function searchStatusMessage(searched: boolean, searchedDocs: boolean): string {
  if (searchedDocs && searched) return "Searching documents and the web…";
  if (searchedDocs) return "Searching documents…";
  if (searched) return "Searching the web…";
  return "Working…";
}

export function SubmittedAck() {
  return (
    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
      <Spinner />
      <span>Got it — starting research…</span>
    </div>
  );
}

export function ThinkingGap() {
  return (
    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
      <Spinner />
      <span>Thinking…</span>
    </div>
  );
}

export function SearchingStatus({
  searched = false,
  searchedDocs = false,
}: {
  searched?: boolean;
  searchedDocs?: boolean;
}) {
  const isSearching = searched || searchedDocs;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Spinner />
        <span>{searchStatusMessage(searched, searchedDocs)}</span>
      </div>
      {isSearching && <SearchSkeletonCard />}
    </div>
  );
}
