"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function SignalKeyboardNav({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "select" || tagName === "textarea" || target.isContentEditable;
    }

    function signalCards() {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-signal-card='true']"));
    }

    function focusSignal(direction: 1 | -1) {
      const cards = signalCards();
      if (!cards.length) return;
      const active = document.activeElement;
      const currentIndex = active instanceof HTMLElement ? cards.indexOf(active) : -1;
      const nextIndex = currentIndex === -1
        ? direction === 1 ? 0 : cards.length - 1
        : Math.min(Math.max(currentIndex + direction, 0), cards.length - 1);
      const nextCard = cards[nextIndex];
      nextCard.focus({ preventScroll: true });
      nextCard.scrollIntoView({ block: "center" });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) {
        if (event.key === "Escape") setShowHelp(false);
        return;
      }
      if (event.key === "/") {
        const search = document.getElementById("feed-search");
        if (search instanceof HTMLInputElement) {
          event.preventDefault();
          search.focus();
          search.select();
        }
      } else if (event.key === "j") {
        event.preventDefault();
        focusSignal(1);
      } else if (event.key === "k") {
        event.preventDefault();
        focusSignal(-1);
      } else if (event.key === "Enter") {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.dataset.signalCard === "true" && active.dataset.sourceUrl) {
          event.preventDefault();
          window.open(active.dataset.sourceUrl, "_blank", "noopener,noreferrer");
        }
      } else if (event.key === "?") {
        event.preventDefault();
        setShowHelp((value) => !value);
      } else if (event.key === "Escape") {
        setShowHelp(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative">
      {children}
      {showHelp ? (
        <div
          aria-label="Keyboard shortcuts"
          className="fixed bottom-4 right-4 z-20 max-w-[min(280px,calc(100vw-2rem))] border border-neutral-900 bg-white p-3 text-xs shadow-none"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono uppercase tracking-[0.12em] text-neutral-500">Shortcuts</p>
            <button
              className="font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4"
              onClick={() => setShowHelp(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-neutral-700">
            <dt className="font-mono text-neutral-950">/</dt>
            <dd>Focus search</dd>
            <dt className="font-mono text-neutral-950">j</dt>
            <dd>Next signal</dd>
            <dt className="font-mono text-neutral-950">k</dt>
            <dd>Previous signal</dd>
            <dt className="font-mono text-neutral-950">Enter</dt>
            <dd>Open focused source</dd>
            <dt className="font-mono text-neutral-950">Esc</dt>
            <dd>Close this panel</dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
