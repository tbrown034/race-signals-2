"use client";

import { useState } from "react";

const sizes = {
  sm: { className: "h-[30px] w-6", width: 24, height: 30 },
  md: { className: "h-12 w-10", width: 40, height: 48 },
  lg: { className: "h-[116px] w-24", width: 96, height: 116 },
};

export function CandidatePhoto({
  alt,
  className = "",
  size = "md",
  src,
}: {
  alt: string;
  className?: string;
  size?: keyof typeof sizes;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (!src) return null;
  const dimensions = sizes[size];
  const resolvedSrc = publicCongressPhotoUrl(src);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`block h-px w-px bg-neutral-300 ${className}`}
      />
    );
  }

  return (
    // Congressional photo CDN URLs are stored directly from the public source crosswalk.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={`block object-cover grayscale ${dimensions.className} ${className}`}
      decoding="async"
      height={dimensions.height}
      loading="lazy"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={resolvedSrc}
      width={dimensions.width}
    />
  );
}

function publicCongressPhotoUrl(src: string) {
  return src.replace(
    "https://theunitedstates.io/images/congress/225x275/",
    "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/",
  );
}
