import { describe, expect, it } from 'vitest';
import { computeAccuracy, formatInteger, formatPercent } from './stats';

describe('computeAccuracy', () => {
  it('returns 0 before any fruit leaves play', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });

  it('rounds sliced over sliced plus missed', () => {
    expect(computeAccuracy(7, 1)).toBe(88);
    expect(computeAccuracy(1, 2)).toBe(33);
  });

  it('ignores invalid or negative values', () => {
    expect(computeAccuracy(Number.NaN, 3)).toBe(0);
    expect(computeAccuracy(4, -2)).toBe(100);
  });
});

describe('number formatting', () => {
  it('adds the pt-BR thousands separator only from 1000 up', () => {
    expect(formatInteger(0)).toBe('0');
    expect(formatInteger(999)).toBe('999');
    expect(formatInteger(1000)).toBe('1.000');
    expect(formatInteger(1420)).toBe('1.420');
  });

  it('keeps the minus sign and rounds fractions', () => {
    expect(formatInteger(-5)).toBe('-5');
    expect(formatInteger(2.6)).toBe('3');
  });

  it('formats non-finite values as zero', () => {
    expect(formatInteger(Number.NaN)).toBe('0');
    expect(formatInteger(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('formats percentages without decimals', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(87)).toBe('87%');
    expect(formatPercent(100)).toBe('100%');
  });
});
