"use client";

import { useId } from "react";

/** Full wordmark + icon; scale via className (e.g. h-9 w-auto). */
export default function VantageLogo({ className = "" }) {
  const uid = useId().replace(/:/g, "");
  const bg = `vl-${uid}-bg`;
  const vg = `vl-${uid}-v`;
  const tg = `vl-${uid}-tick`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 60"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={vg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id={tg} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
      <rect x="0" y="4" width="52" height="52" rx="11" fill={`url(#${bg})`} />
      <polyline
        points="11,15 26,38 41,10"
        fill="none"
        stroke={`url(#${vg})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="10" r="3.5" fill={`url(#${tg})`} />
      <text
        x="66"
        y="38"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="#0f172a"
      >
        Vantage
      </text>
    </svg>
  );
}
