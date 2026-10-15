import React, { useId, useRef, useState } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import { RunRecord } from '../../lib/history';
import { formatInteger, formatPercent } from '../../lib/stats';

interface ScoreChartProps {
  runs: RunRecord[];
  // Summary sentence for screen readers (the same finding the card title states).
  label: string;
}

const FALLBACK_WIDTH = 640;
const MIN_WIDTH = 240;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

// "Nice" upper bound for the y axis so ticks land on round numbers.
const niceMax = (value: number) => {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 2) ?? 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
};

const runLabel = (index: number, run: RunRecord) =>
  `Partida ${index + 1}: ${formatInteger(run.score)} pontos, ${formatPercent(run.accuracy)} de precisão`;

// One series (score per round) on a zero-based axis, padrao A.7 §14: horizontal grid only,
// a 2px line, points on hover/focus, accent crosshair, keyboard access with the arrow keys.
const ScoreChart: React.FC<ScoreChartProps> = ({ runs, label }) => {
  const [active, setActive] = useState<number | null>(null);
  const descriptionId = useId();
  // Drawn 1:1 in CSS pixels at the container's width, so axis text stays at 12px on any screen (A.7 §14).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measured = useElementSize(wrapperRef).width;
  const chartWidth = Math.max(MIN_WIDTH, measured || FALLBACK_WIDTH);
  const maxY = niceMax(Math.max(...runs.map((run) => run.score), 1));
  const plotW = chartWidth - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (runs.length === 1 ? plotW / 2 : (index / (runs.length - 1)) * plotW);
  const y = (score: number) => PAD.top + plotH - (score / maxY) * plotH;
  const ticks = [0, maxY / 2, maxY];
  const path = runs.map((run, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(run.score).toFixed(1)}`).join(' ');
  const activeRun = active === null ? null : runs[active];

  const handleKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const last = runs.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      ArrowLeft: Math.max(0, (active ?? last + 1) - 1),
      Home: 0,
      End: last
    };
    if (event.key in keys) {
      event.preventDefault();
      setActive(keys[event.key]);
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const ratio = runs.length === 1 ? 0 : (svgX - PAD.left) / plotW;
    setActive(Math.min(runs.length - 1, Math.max(0, Math.round(ratio * (runs.length - 1)))));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <svg
        viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
        width={chartWidth}
        height={HEIGHT}
        className="block max-w-full touch-pan-y"
        role="img"
        aria-label={label}
        aria-describedby={descriptionId}
        tabIndex={0}
        onKeyDown={handleKey}
        onPointerMove={handlePointer}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={chartWidth - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? 'var(--ms-border-strong)' : 'var(--ms-chart-grid)'}
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={12} fill="var(--ms-chart-axis)" className="ms-num">
              {formatInteger(tick)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 8} fontSize={12} fill="var(--ms-chart-axis)">1ª</text>
        {runs.length > 1 && (
          <text x={chartWidth - PAD.right} y={HEIGHT - 8} textAnchor="end" fontSize={12} fill="var(--ms-chart-axis)">
            {runs.length}ª partida
          </text>
        )}

        {activeRun && active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--ms-chart-crosshair)" strokeWidth={1} />
        )}
        <path d={path} fill="none" stroke="var(--ms-chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {runs.length === 1 && <circle cx={x(0)} cy={y(runs[0].score)} r={4} fill="var(--ms-chart-1)" />}
        {activeRun && active !== null && (
          <circle cx={x(active)} cy={y(activeRun.score)} r={5} fill="var(--ms-chart-1)" stroke="var(--ms-surface)" strokeWidth={2} />
        )}
      </svg>

      <p id={descriptionId} className="ms-sr-only">Use as setas para percorrer as partidas.</p>
      <p className="ms-sr-only" aria-live="polite">{activeRun && active !== null ? runLabel(active, activeRun) : ''}</p>

      {activeRun && active !== null && (
        <div
          className="pointer-events-none absolute top-0 whitespace-nowrap rounded-xs border border-line-strong bg-surface-raised px-2 py-1 text-fine text-fg shadow-md"
          style={{ left: `${(x(active) / chartWidth) * 100}%`, transform: `translateX(${active > runs.length / 2 ? '-100%' : '0'})` }}
          aria-hidden="true"
        >
          <span className="font-semibold">Partida {active + 1}</span>
          <span className="block ms-num">{formatInteger(activeRun.score)} pontos · {formatPercent(activeRun.accuracy)}</span>
        </div>
      )}
    </div>
  );
};

export default ScoreChart;
