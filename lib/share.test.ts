import { describe, expect, it } from 'vitest';
import { buildShareText, buildShareUrl, formatDayShort, readChallengeDay } from './share';

const TODAY = '2026-10-15';

describe('readChallengeDay', () => {
  it('returns null without the parameter', () => {
    expect(readChallengeDay('', TODAY)).toBeNull();
    expect(readChallengeDay('?outra=1', TODAY)).toBeNull();
  });

  it('accepts today and past days', () => {
    expect(readChallengeDay('?desafio=2026-10-15', TODAY)).toBe('2026-10-15');
    expect(readChallengeDay('?desafio=2026-10-01', TODAY)).toBe('2026-10-01');
  });

  it('falls back to today for future, malformed or empty days', () => {
    expect(readChallengeDay('?desafio=2026-10-16', TODAY)).toBe(TODAY);
    expect(readChallengeDay('?desafio=2026-02-31x', TODAY)).toBe(TODAY);
    expect(readChallengeDay('?desafio=hoje', TODAY)).toBe(TODAY);
    expect(readChallengeDay('?desafio=', TODAY)).toBe(TODAY);
  });
});

describe('buildShareUrl', () => {
  it('links to the home page, with the challenge day when there is one', () => {
    expect(buildShareUrl('https://shadow-dojo.vercel.app')).toBe('https://shadow-dojo.vercel.app/');
    expect(buildShareUrl('https://shadow-dojo.vercel.app', TODAY)).toBe(
      'https://shadow-dojo.vercel.app/?desafio=2026-10-15'
    );
  });

  it('ignores an invalid day', () => {
    expect(buildShareUrl('http://localhost:3000', 'amanha')).toBe('http://localhost:3000/');
  });
});

describe('buildShareText', () => {
  it('describes a free run', () => {
    expect(buildShareText({ score: 1420, accuracy: 87, maxCombo: 5 })).toBe(
      'Fiz 1.420 pontos no Shadow Dojo (87% de precisão, combo x5). Consegue me vencer?'
    );
  });

  it('names the challenge day and never shows combo below x1', () => {
    expect(buildShareText({ score: 0, accuracy: 0, maxCombo: 0, day: TODAY })).toBe(
      'Fiz 0 pontos no desafio de 15/10 do Shadow Dojo (0% de precisão, combo x1). Consegue passar?'
    );
  });

  it('formats short day labels', () => {
    expect(formatDayShort('2026-01-05')).toBe('05/01');
  });
});
