import { describe, expect, it } from 'vitest';
import { toErrorReport } from './errors';

const NOW = new Date('2026-10-15T12:00:00.000Z');

describe('toErrorReport', () => {
  it('keeps message and stack from Error instances', () => {
    const report = toErrorReport('render', new TypeError('boom'), NOW);
    expect(report).toMatchObject({ source: 'render', message: 'boom', at: '2026-10-15T12:00:00.000Z' });
    expect(report.stack).toContain('TypeError');
  });

  it('falls back to the error name when the message is empty', () => {
    expect(toErrorReport('window', new RangeError(''), NOW).message).toBe('RangeError');
  });

  it('accepts strings and unknown values without throwing', () => {
    expect(toErrorReport('promise', 'falhou', NOW).message).toBe('falhou');
    expect(toErrorReport('promise', undefined, NOW).message).toBe('Erro desconhecido');
    expect(toErrorReport('promise', null, NOW).message).toBe('Erro desconhecido');
    expect(toErrorReport('promise', { code: 42 }, NOW).message).toBe('Erro desconhecido');
  });
});
