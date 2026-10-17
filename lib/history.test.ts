import { describe, expect, it } from 'vitest';
import {
  appendRun,
  bestForDay,
  describeTrend,
  normalizeHistory,
  RunRecord,
  summarizeHistory
} from './history';

const run = (score: number, overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: `r-${score}-${Math.random()}`,
  at: '2026-10-15T12:00:00.000Z',
  score,
  accuracy: 80,
  maxCombo: 2,
  sliced: 8,
  missed: 2,
  inputMode: 'pointer',
  mode: 'free',
  reason: 'lives',
  ...overrides
});

describe('normalizeHistory', () => {
  it('keeps well-formed records and drops anything else', () => {
    const good = run(10);
    const daily = run(20, { mode: 'daily', day: '2026-10-15' });
    expect(normalizeHistory([good, daily])).toEqual([good, daily]);
    expect(
      normalizeHistory([
        good,
        { ...good, score: -1 },
        { ...good, accuracy: 120 },
        { ...good, at: 'ontem' },
        { ...good, inputMode: 'joystick' },
        { ...good, mode: 'daily' },
        { ...good, mode: 'daily', day: '15/10/2026' },
        { ...good, score: Number.NaN },
        null,
        'texto'
      ])
    ).toEqual([good]);
  });

  it('returns an empty list for non-array storage', () => {
    expect(normalizeHistory(null)).toEqual([]);
    expect(normalizeHistory({})).toEqual([]);
    expect(normalizeHistory('[]')).toEqual([]);
  });
});

describe('appendRun', () => {
  it('appends newest last and drops the oldest past the limit', () => {
    const history = [run(1), run(2), run(3)];
    const next = appendRun(history, run(4), 3);
    expect(next.map((r) => r.score)).toEqual([2, 3, 4]);
    expect(history).toHaveLength(3);
  });
});

describe('bestForDay', () => {
  it('only counts daily runs of that day', () => {
    const history = [
      run(50),
      run(12, { mode: 'daily', day: '2026-10-15' }),
      run(30, { mode: 'daily', day: '2026-10-15' }),
      run(99, { mode: 'daily', day: '2026-10-14' })
    ];
    expect(bestForDay(history, '2026-10-15')).toBe(30);
    expect(bestForDay(history, '2026-10-16')).toBeNull();
    expect(bestForDay([], '2026-10-15')).toBeNull();
  });
});

describe('summarizeHistory and describeTrend', () => {
  it('summarizes an empty history', () => {
    const summary = summarizeHistory([]);
    expect(summary).toEqual({
      runs: 0,
      best: 0,
      averageScore: 0,
      averageAccuracy: 0,
      bestCombo: 0,
      trend: null
    });
    expect(describeTrend(summary)).toBe('Nenhuma partida ainda');
  });

  it('needs two full windows before stating a trend', () => {
    const summary = summarizeHistory([run(10), run(20), run(30)], 2);
    expect(summary.trend).toBeNull();
    expect(describeTrend(summary, 2)).toBe('Jogue 1 partidas a mais para ver sua tendência');
  });

  it('reports a rising, falling or stable average', () => {
    const rising = summarizeHistory([run(10), run(10), run(15), run(15)], 2);
    expect(rising.trend).toBeCloseTo(0.5);
    expect(describeTrend(rising, 2)).toBe('Sua média subiu 50% nas últimas 2 partidas');

    const falling = summarizeHistory([run(20), run(20), run(10), run(10)], 2);
    expect(describeTrend(falling, 2)).toBe('Sua média caiu 50% nas últimas 2 partidas');

    const stable = summarizeHistory([run(100), run(100), run(102), run(101)], 2);
    expect(describeTrend(stable, 2)).toBe('Sua média está estável nas últimas 2 partidas');
  });

  it('has no trend when the earlier window averaged zero', () => {
    expect(summarizeHistory([run(0), run(0), run(5), run(5)], 2).trend).toBeNull();
  });

  it('computes best, averages and best combo', () => {
    const summary = summarizeHistory([
      run(10, { accuracy: 50, maxCombo: 3 }),
      run(30, { accuracy: 100, maxCombo: 5 })
    ]);
    expect(summary).toMatchObject({ runs: 2, best: 30, averageScore: 20, averageAccuracy: 75, bestCombo: 5 });
  });
});
