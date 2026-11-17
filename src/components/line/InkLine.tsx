import React, { useId } from "react";

export interface InkLineProps {
  values: number[];
  buffer: number;
  width?: number;
  height?: number;
  label: string;
  ghost?: number[];
  currency?: string;
  className?: string;
  showBufferLabel?: boolean;
}

/**
 * Generates an SVG path string for a Monotone Cubic Spline (Fritsch-Carlson algorithm)
 * without requiring any external d3 dependencies.
 */
function generateMonotoneSplinePath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  if (n === 2) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;

  // Slopes of secant lines between successive points
  const secants: number[] = [];
  const dxs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    secants.push(dx === 0 ? 0 : dy / dx);
  }

  // Tangents at each point
  const tangents = new Array<number>(n);
  tangents[0] = secants[0];
  tangents[n - 1] = secants[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const s0 = secants[i - 1];
    const s1 = secants[i];
    if (s0 * s1 <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (s0 + s1) / 2;
    }
  }

  // Enforce monotonicity
  for (let i = 0; i < n - 1; i++) {
    const s = secants[i];
    if (s === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / s;
      const beta = tangents[i + 1] / s;
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        tangents[i] = tau * alpha * s;
        tangents[i + 1] = tau * beta * s;
      }
    }
  }

  // Build cubic Bezier path
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = dxs[i];
    const cp1x = p0.x + dx / 3;
    const cp1y = p0.y + (tangents[i] * dx) / 3;
    const cp2x = p1.x - dx / 3;
    const cp2y = p1.y - (tangents[i + 1] * dx) / 3;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  return path;
}

export function InkLine({
  values,
  buffer,
  width = 1440,
  height = 250,
  label,
  ghost,
  currency = "PKR",
  className = "",
  showBufferLabel = true,
}: InkLineProps) {
  const rawId = useId();
  const clipId = `below-buffer-${rawId.replace(/:/g, "")}`;

  const pad = 32;
  const count = Math.max(1, values.length - 1);

  // Determine vertical scale range
  const allValues = ghost ? [...values, ...ghost, buffer] : [...values, buffer];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const lo = minVal * 0.85;
  const hi = Math.max(maxVal * 1.05, lo + 1);

  const scaleX = (i: number) => (i / count) * width;
  const scaleY = (v: number) => (height - pad) - ((v - lo) / (hi - lo)) * (height - 2 * pad);

  const makePath = (data: number[]) => {
    const points = data.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));
    return generateMonotoneSplinePath(points);
  };

  const by = scaleY(buffer);
  const bufferFormatted = Math.round(buffer).toLocaleString();

  return (
    <svg
      data-hero-line
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={`block h-full w-full overflow-visible ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y={by} width={width} height={Math.max(0, height - by + pad)} />
        </clipPath>
      </defs>

      {/* Buffer line (dashed) */}
      <line
        x1="0"
        x2={width}
        y1={by}
        y2={by}
        stroke="var(--line-strong)"
        strokeWidth="1.5"
        strokeDasharray="6 6"
        vectorEffect="non-scaling-stroke"
      />

      {/* Buffer label */}
      {showBufferLabel && (
        <text
          x={width - 12}
          y={by - 8}
          textAnchor="end"
          className="text-[12px] font-medium fill-[var(--ink-3)] select-none"
        >
          Buffer {currency} {bufferFormatted}
        </text>
      )}

      {/* Ghost line (on-time series) */}
      {ghost && (
        <path
          d={makePath(ghost)}
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Main forecast line (above buffer in ink) */}
      <path
        d={makePath(values)}
        pathLength={1}
        className="ink-line"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Breach segment (below buffer clipped in ember) */}
      <path
        d={makePath(values)}
        pathLength={1}
        className="ink-line"
        fill="none"
        stroke="var(--ember)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
