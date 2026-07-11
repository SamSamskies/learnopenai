import { PaperclipIcon } from "../ResearchChat/icons";
import type { PreparedImage } from "./realtime-image-attach";

export function ImageAttachStrip({
  attachedImage,
  connected,
  onAttachImage,
}: {
  attachedImage: PreparedImage | null;
  connected: boolean;
  onAttachImage: () => void;
}) {
  if (attachedImage) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low/40 px-3 py-2.5 sm:px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachedImage.previewUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg border border-outline-variant object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {attachedImage.label}
          </p>
          <p className="text-xs text-on-surface-variant">
            Attached — ask about this aloud
          </p>
        </div>
        <button
          type="button"
          onClick={onAttachImage}
          disabled={!connected}
          className="shrink-0 text-xs font-medium text-on-surface-variant underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Replace
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAttachImage}
      disabled={!connected}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/20 px-4 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:border-outline hover:bg-surface-container-low/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      <PaperclipIcon />
      Attach image
    </button>
  );
}
