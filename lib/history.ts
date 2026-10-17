// Run history kept in the player's browser: one record per finished round.
// Pure functions only; storage lives in the hook that calls them.
import { GameOverReason, InputMode } from '../types';
import { isDayKey } from './engine/rng';

export type RunMode = 'free' | 'daily';

export interface RunRecord {
  id: string;
  // ISO timestamp of the end of the round.
  at: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  sliced: number;
  missed: number;
  inputMode: InputMode;
  mode: RunMode;
  // Challenge day (YYYY-MM-DD) for daily runs.
  day?: string;
  reason: GameOverReason;
}

export const HISTORY_LIMIT = 100;

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// Storage is user-controlled: keep only well-formed records instead of trusting the shape.
export const normalizeHistory = (raw: unknown): RunRecord[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is RunRecord => {
      if (!item || typeof item !== 'object') return false;
      const r = item as Record<string, unknown>;
      return (
        typeof r.id === 'string' &&
        typeof r.at === 'string' &&
        !Number.isNaN(Date.parse(r.at)) &&
        isFiniteNonNegative(r.score) &&
        isFiniteNonNegative(r.accuracy) &&
        r.accuracy <= 100 &&
        isFiniteNonNegative(r.maxCombo) &&
        isFiniteNonNegative(r.sliced) &&
        isFiniteNonNegative(r.missed) &&
        (r.inputMode === 'camera' || r.inputMode === 'pointer') &&
        (r.mode === 'free' || (r.mode === 'daily' && isDayKey(r.day))) &&
        (r.reason === 'bomb' || r.reason === 'lives')
      );
    })
    .slice(-HISTORY_LIMIT);
};

// Newest last; the oldest records drop off past the limit.
export const appendRun = (history: RunRecord[], record: RunRecord, limit = HISTORY_LIMIT): RunRecord[] =>
  [...history, record].slice(-limit);

export const bestForDay = (history: RunRecord[], day: string): number | null => {
  const scores = history.filter((run) => run.mode === 'daily' && run.day === day).map((run) => run.score);
  return scores.length ? Math.max(...scores) : null;
};

export interface HistorySummary {
  runs: number;
  best: number;
  averageScore: number;
  averageAccuracy: number;
  bestCombo: number;
  // Average of the last `window` runs versus the window before, as a fraction (0.12 = +12%).
  // Null until there are two full windows to compare.
  trend: number | null;
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

export const summarizeHistory = (history: RunRecord[], window = 5): HistorySummary => {
  const scores = history.map((run) => run.score);
  let trend: number | null = null;
  if (history.length >= window * 2) {
    const recent = average(scores.slice(-window));
    const before = average(scores.slice(-window * 2, -window));
    trend = before > 0 ? (recent - before) / before : null;
  }
  return {
    runs: history.length,
    best: scores.length ? Math.max(...scores) : 0,
    averageScore: Math.round(average(scores)),
    averageAccuracy: Math.round(average(history.map((run) => run.accuracy))),
    bestCombo: history.length ? Math.max(...history.map((run) => run.maxCombo)) : 0,
    trend
  };
};

// The chart's headline states the finding instead of describing the chart (A.7 §14).
export const describeTrend = (summary: HistorySummary, window = 5): string => {
  if (summary.runs === 0) return 'Nenhuma partida ainda';
  if (summary.trend === null) {
    return `Jogue ${Math.max(0, window * 2 - summary.runs)} partidas a mais para ver sua tendência`;
  }
  const percent = Math.round(Math.abs(summary.trend) * 100);
  if (percent < 5) return `Sua média está estável nas últimas ${window} partidas`;
  return summary.trend > 0
    ? `Sua média subiu ${percent}% nas últimas ${window} partidas`
    : `Sua média caiu ${percent}% nas últimas ${window} partidas`;
};
