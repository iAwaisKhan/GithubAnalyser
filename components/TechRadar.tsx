"use client";

import { useState, useEffect } from "react";

interface RadarAxis {
  axis: string;
  score: number;
}

interface Props {
  radar: {
    axes: RadarAxis[];
    strongestDomain: string;
    proficiency: string;
  };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPolygonPoints(
  axes: RadarAxis[],
  cx: number,
  cy: number,
  maxR: number,
  scale: number
): string {
  const n = axes.length;
  return axes
    .map((a, i) => {
      const angle = (360 / n) * i;
      const r = ((a.score / 100) * maxR) * scale;
      const pt = polarToCartesian(cx, cy, r, angle);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

function buildRingPoints(
  n: number,
  cx: number,
  cy: number,
  r: number
): string {
  return Array.from({ length: n }, (_, i) => {
    const angle = (360 / n) * i;
    const pt = polarToCartesian(cx, cy, r, angle);
    return `${pt.x},${pt.y}`;
  }).join(" ");
}

export default function TechRadar({ radar }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const { axes, strongestDomain, proficiency } = radar;

  if (!axes || axes.length === 0 || axes.every((a) => a.score === 0)) {
    return (
      <div className="border border-green-500/30 bg-black/60">
        <div className="px-5 py-3 border-b border-green-500/20">
          <span className="font-mono text-xs text-green-800 uppercase tracking-widest">tech_stack_radar</span>
        </div>
        <div className="p-5 text-center font-mono text-xs text-green-900">no radar data available</div>
      </div>
    );
  }

  const cx = 150;
  const cy = 150;
  const maxR = 110;
  const n = axes.length;
  const rings = [0.33, 0.66, 1.0];

  const dataPoints = buildPolygonPoints(axes, cx, cy, maxR, animated ? 1 : 0);

  return (
    <div className="border border-green-500/30 bg-black/60">
      <div className="px-5 py-3 border-b border-green-500/20">
        <span className="font-mono text-xs text-green-800 uppercase tracking-widest">tech_stack_radar</span>
      </div>
      <div className="p-5 space-y-5">
        {/* SVG Radar */}
        <div className="flex justify-center">
          <svg viewBox="0 0 300 300" className="w-full max-w-[280px]">
            {/* Concentric rings */}
            {rings.map((pct) => (
              <polygon
                key={pct}
                points={buildRingPoints(n, cx, cy, maxR * pct)}
                fill="none"
                stroke="rgba(74, 222, 128, 0.1)"
                strokeWidth="1"
              />
            ))}

            {/* Axis lines */}
            {axes.map((_, i) => {
              const angle = (360 / n) * i;
              const outer = polarToCartesian(cx, cy, maxR, angle);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="rgba(74, 222, 128, 0.08)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Data polygon */}
            <polygon
              points={dataPoints}
              fill="rgba(74, 222, 128, 0.12)"
              stroke="#4ade80"
              strokeWidth="1.5"
              style={{ transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />

            {/* Score dots */}
            {axes.map((a, i) => {
              const angle = (360 / n) * i;
              const r = ((a.score / 100) * maxR) * (animated ? 1 : 0);
              const pt = polarToCartesian(cx, cy, r, angle);
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="3"
                  fill="#4ade80"
                  style={{ transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                />
              );
            })}

            {/* Axis labels */}
            {axes.map((a, i) => {
              const angle = (360 / n) * i;
              const labelR = maxR + 18;
              const pt = polarToCartesian(cx, cy, labelR, angle);
              const normAngle = ((angle % 360) + 360) % 360;
              let anchor: "start" | "middle" | "end" = "middle";
              if (normAngle > 10 && normAngle < 170) anchor = "start";
              else if (normAngle > 190 && normAngle < 350) anchor = "end";
              const dy = normAngle > 150 && normAngle < 210 ? 4 : normAngle < 30 || normAngle > 330 ? -4 : 3;
              return (
                <text
                  key={i}
                  x={pt.x}
                  y={pt.y}
                  dy={dy}
                  fontFamily="monospace"
                  fontSize="8"
                  fill="rgba(74, 222, 128, 0.5)"
                  textAnchor={anchor}
                >
                  {a.axis.toUpperCase()}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="font-mono text-[10px] border border-green-500/30 text-green-600 px-2 py-1 uppercase tracking-widest">
            strongest: {strongestDomain}
          </span>
          <span className="font-mono text-[10px] border border-green-500/20 text-green-800 px-2 py-1 uppercase tracking-widest">
            {proficiency}
          </span>
        </div>

        {/* Per-axis bars */}
        <div className="space-y-2">
          {axes.map((a) => (
            <div key={a.axis}>
              <div className="flex justify-between font-mono text-[10px] text-green-700 mb-0.5">
                <span>{a.axis}</span>
                <span className="text-green-600">{a.score}</span>
              </div>
              <div className="h-[2px] bg-green-900/30 w-full">
                <div
                  className="h-[2px] bg-green-400 transition-all duration-700"
                  style={{ width: animated ? `${a.score}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
