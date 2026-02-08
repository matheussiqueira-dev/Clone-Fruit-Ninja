import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileLeaderboardRepository } from './leaderboardRepository';

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const dir = tempDirectories.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true });
  }
});

describe('createFileLeaderboardRepository', () => {
  it('stores and returns sorted leaderboard entries', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'dojo-leaderboard-'));
    tempDirectories.push(tempDir);

    const filePath = path.join(tempDir, 'leaderboard.json');
    const repository = createFileLeaderboardRepository(filePath);

    await repository.add({
      player: 'Alpha',
      score: 20,
      accuracy: 65,
      maxCombo: 2,
      inputMode: 'camera'
    });

    await repository.add({
      player: 'Beta',
      score: 60,
      accuracy: 55,
      maxCombo: 4,
      inputMode: 'pointer'
    });

    const entries = await repository.list(10);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.player).toBe('Beta');
    expect(entries[1]?.player).toBe('Alpha');
  });
});
