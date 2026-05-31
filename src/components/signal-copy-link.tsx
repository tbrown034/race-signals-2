"use client";

import { useEffect, useState } from "react";

export function SignalCopyLink({ anchorId }: { anchorId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${anchorId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <button
      className="font-medium underline underline-offset-4"
      onClick={copyLink}
      title="Copy signal permalink"
      type="button"
    >
      {copied ? "copied" : "#"}
    </button>
  );
}
