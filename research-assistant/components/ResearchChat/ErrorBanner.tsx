import { RetryIcon, WarningIcon } from "./icons";

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container">
        <WarningIcon />
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
      >
        <RetryIcon />
        Try again
      </button>
    </div>
  );
}
