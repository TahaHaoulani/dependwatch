'use client';

/**
 * Abstract line-drawing figures for the Problem section (Linear-style).
 * Monochrome, minimal, geometric — no fill, thin stroke.
 */
const stroke = 'currentColor';
const strokeWidth = 1.4;

export function FigDependencies() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-full w-full text-muted-foreground/90"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Stacked layers: 4 flat rectangles, top has circular cutout */}
      <rect x="8" y="4" width="48" height="10" rx="1" />
      <rect x="10" y="14" width="44" height="8" rx="1" />
      <rect x="12" y="24" width="40" height="8" rx="1" />
      <rect x="14" y="34" width="36" height="8" rx="1" />
      {/* Circle on top layer */}
      <circle cx="32" cy="9" r="4" />
      <line x1="30" y1="9" x2="34" y2="9" />
    </svg>
  );
}

export function FigPropagate() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-full w-full text-muted-foreground/90"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Central circle */}
      <circle cx="32" cy="24" r="6" />
      {/* Radiating lines (propagation) */}
      <line x1="32" y1="6" x2="32" y2="18" />
      <line x1="32" y1="30" x2="32" y2="42" />
      <line x1="14" y1="24" x2="26" y2="24" />
      <line x1="38" y1="24" x2="50" y2="24" />
      <line x1="20" y1="12" x2="26" y2="18" />
      <line x1="38" y1="30" x2="44" y2="36" />
      <line x1="44" y1="12" x2="38" y2="18" />
      <line x1="26" y1="30" x2="20" y2="36" />
      {/* Outer ripple */}
      <ellipse cx="32" cy="24" rx="22" ry="16" />
    </svg>
  );
}

export function FigInvisibleCosts() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-full w-full text-muted-foreground/90"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Base line */}
      <line x1="8" y1="40" x2="56" y2="40" />
      {/* Ascending bars / trend */}
      <line x1="12" y1="40" x2="12" y2="32" />
      <line x1="20" y1="40" x2="20" y2="28" />
      <line x1="28" y1="40" x2="28" y2="22" />
      <line x1="36" y1="40" x2="36" y2="16" />
      <line x1="44" y1="40" x2="44" y2="12" />
      <line x1="52" y1="40" x2="52" y2="8" />
      {/* Optional: connect tops for line-chart feel */}
      <path d="M12 32 L20 28 L28 22 L36 16 L44 12 L52 8" />
    </svg>
  );
}
