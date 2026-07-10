"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function modeLinkClass(active: boolean) {
  return active
    ? "font-medium text-foreground underline underline-offset-4"
    : "text-on-surface-variant transition-colors hover:text-foreground";
}

export function ModeChrome({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  const isResearch = pathname === "/";
  const isVoice = pathname.startsWith("/voice");

  return (
    <header className="shrink-0 border-b border-outline-variant/60">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Research Assistant
        </span>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className={modeLinkClass(isResearch)}>
              Research
            </Link>
            <Link href="/voice" className={modeLinkClass(isVoice)}>
              Voice
            </Link>
          </nav>
          {actions}
        </div>
      </div>
    </header>
  );
}
