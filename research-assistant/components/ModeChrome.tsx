"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function modeLinkClass(active: boolean) {
  return active
    ? "font-medium text-foreground underline underline-offset-4"
    : "text-on-surface-variant transition-colors hover:text-foreground";
}

export function ModeChrome({
  actions,
  onRequestNavigate,
}: {
  actions?: ReactNode;
  /** Intercept leaving the current mode (e.g. confirm before destructive switch). */
  onRequestNavigate?: (href: string) => void;
}) {
  const pathname = usePathname();
  const isResearch = pathname === "/";
  const isVoice = pathname.startsWith("/voice");

  function renderModeLink(href: string, label: string, active: boolean) {
    if (active) {
      return <span className={modeLinkClass(true)}>{label}</span>;
    }
    if (onRequestNavigate) {
      return (
        <button
          type="button"
          onClick={() => onRequestNavigate(href)}
          className={`${modeLinkClass(false)} bg-transparent p-0`}
        >
          {label}
        </button>
      );
    }
    return (
      <Link href={href} className={modeLinkClass(false)}>
        {label}
      </Link>
    );
  }

  return (
    <header className="shrink-0 border-b border-outline-variant/60">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Research Assistant
        </span>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm">
            {renderModeLink("/", "Research", isResearch)}
            {renderModeLink("/voice", "Voice", isVoice)}
          </nav>
          {actions}
        </div>
      </div>
    </header>
  );
}
