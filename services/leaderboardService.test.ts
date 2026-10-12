import { describe, expect, it } from 'vitest';
import { resolveLeaderboardApiUrl } from './leaderboardService';

describe('resolveLeaderboardApiUrl', () => {
  it('stays local on a static deploy without a configured API', () => {
    expect(resolveLeaderboardApiUrl(undefined, 'shadow-dojo.vercel.app')).toBeNull();
    expect(resolveLeaderboardApiUrl('', 'shadow-dojo.vercel.app')).toBeNull();
    expect(resolveLeaderboardApiUrl('   ', 'shadow-dojo.vercel.app')).toBeNull();
  });

  it('stays local when there is no window (no hostname)', () => {
    expect(resolveLeaderboardApiUrl(undefined, undefined)).toBeNull();
    expect(resolveLeaderboardApiUrl(undefined, '')).toBeNull();
  });

  it('uses the local dev server on localhost', () => {
    expect(resolveLeaderboardApiUrl(undefined, 'localhost')).toBe('/api/v1');
    expect(resolveLeaderboardApiUrl(undefined, '127.0.0.1')).toBe('/api/v1');
  });

  it('prefers a configured API URL and drops the trailing slash', () => {
    expect(resolveLeaderboardApiUrl(' https://api.example.dev/v1/ ', 'localhost')).toBe('https://api.example.dev/v1');
  });

  it('ignores non-string configuration values', () => {
    expect(resolveLeaderboardApiUrl(42, 'shadow-dojo.vercel.app')).toBeNull();
    expect(resolveLeaderboardApiUrl(null, 'localhost')).toBe('/api/v1');
  });
});
