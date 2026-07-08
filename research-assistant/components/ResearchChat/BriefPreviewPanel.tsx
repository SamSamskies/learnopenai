function formatBriefPreview(preview: string): string {
  try {
    return JSON.stringify(JSON.parse(preview), null, 2);
  } catch {
    return preview;
  }
}

export function BriefPreviewPanel({
  preview,
  defaultOpen = false,
}: {
  preview: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="overflow-hidden rounded-lg border border-outline-variant"
    >
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low">
        Brief preview
      </summary>
      <pre className="overflow-x-auto border-t border-outline-variant px-4 py-3 font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {formatBriefPreview(preview)}
      </pre>
    </details>
  );
}
