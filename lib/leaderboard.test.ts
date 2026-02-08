import { describe, expect, it } from 'vitest';
import {
  isValidLeaderboardSubmission,
  normalizeLeaderboardEntries,
  normalizeSubmission,
  sanitizePlayerName,
  sortLeaderboard
} from './leaderboard';
import { LeaderboardEntry } from '../types';

describe('leaderboard utils', () => {
  it('sanitizes player names and trims size', () => {
    expect(sanitizePlayerName('   Ana    Silva   ')).toBe('Ana Silva');
    expect(sanitizePlayerName('x'.repeat(100)).length).toBe(24);
  });

  it('validates leaderboard payload with strict bounds', () => {
    expect(
      isValidLeaderboardSubmission({
        player: 'Ninja',
        score: 120,
        accuracy: 85,
        maxCombo: 4,
        inputMode: 'camera'
      })
    ).toBe(true);

    expect(
      isValidLeaderboardSubmission({
        player: 'A',
        score: -1,
        accuracy: 120,
        maxCombo: 5,
        inputMode: 'camera'
      })
    ).toBe(false);
  });

  it('normalizes submission value ranges', () => {
    expect(
      normalizeSubmission({
        player: '  Player   One ',
        score: 10.9,
        accuracy: 88.6,
        maxCombo: 3.4,
        inputMode: 'pointer'
      })
    ).toEqual({
      player: 'Player One',
      score: 10,
      accuracy: 89,
      maxCombo: 3,
      inputMode: 'pointer'
    });
  });

  it('sorts leaderboard by score, accuracy and combo', () => {
    const entries: LeaderboardEntry[] = [
      {
        id: '1',
        player: 'A',
        score: 50,
        accuracy: 70,
        maxCombo: 3,
        inputMode: 'camera',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: '2',
        player: 'B',
        score: 50,
        accuracy: 80,
        maxCombo: 2,
        inputMode: 'camera',
        createdAt: '2026-01-01T00:00:01.000Z'
      },
      {
        id: '3',
        player: 'C',
        score: 70,
        accuracy: 60,
        maxCombo: 1,
        inputMode: 'pointer',
        createdAt: '2026-01-01T00:00:02.000Z'
      }
    ];

    const sorted = sortLeaderboard(entries);
    expect(sorted.map((entry) => entry.id)).toEqual(['3', '2', '1']);
  });

  it('normalizes malformed leaderboard collections', () => {
    const entries = normalizeLeaderboardEntries([
      {
        id: 'foo',
        player: 'Zen',
        score: 12,
        accuracy: 77,
        maxCombo: 2,
        inputMode: 'pointer',
        createdAt: '2026-02-02T00:00:00.000Z'
      },
      { invalid: true },
      null
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.player).toBe('Zen');
  });
});
