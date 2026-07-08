import type { ResearchUIState } from "@/lib/research-state";
import { BriefPreviewPanel } from "./BriefPreviewPanel";
import { RetryIcon } from "./icons";

export function StoppedNotice({
  state,
  canRegenerate,
  onRegenerate,
}: {
  state?: ResearchUIState;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Stopped
        </span>
        <span className="text-sm text-on-surface-variant">
          You stopped this response.
        </span>
      </div>

      {state?.briefPreview && (
        <BriefPreviewPanel preview={state.briefPreview} />
      )}

      {canRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
        >
          <RetryIcon />
          Regenerate
        </button>
      )}
    </div>
  );
}
