import { promises as fs } from 'fs';
import path from 'path';
import {
  LeaderboardEntry,
  LeaderboardSubmission
} from '../../../types';
import { normalizeLeaderboardEntries, sortLeaderboard } from '../../../lib/leaderboard';

interface LeaderboardRepository {
  list: (limit: number) => Promise<LeaderboardEntry[]>;
  add: (submission: LeaderboardSubmission) => Promise<LeaderboardEntry[]>;
}

const DEFAULT_PATH = path.resolve(process.cwd(), 'server', 'data', 'leaderboard.json');

const ensureDataFile = async (filePath: string) => {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf-8');
  }
};

const readEntries = async (filePath: string) => {
  await ensureDataFile(filePath);
  const raw = await fs.readFile(filePath, 'utf-8');

  try {
    const parsed = JSON.parse(raw);
    return normalizeLeaderboardEntries(parsed);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf-8');
    return [];
  }
};

const writeEntries = async (filePath: string, entries: LeaderboardEntry[]) => {
  await ensureDataFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
};

const parseLimit = (limit: number) => {
  if (!Number.isFinite(limit)) return 10;
  const normalized = Math.floor(limit);
  return Math.max(1, Math.min(50, normalized));
};

const createEntry = (submission: LeaderboardSubmission): LeaderboardEntry => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...submission
});

export const createFileLeaderboardRepository = (filePath = DEFAULT_PATH): LeaderboardRepository => {
  let writeQueue = Promise.resolve();

  const runSafely = async <T>(task: () => Promise<T>) => {
    const result = writeQueue.then(task, task);
    writeQueue = result.then(() => undefined, () => undefined);
    return result;
  };

  const list = async (limit: number) => {
    const entries = await readEntries(filePath);
    return sortLeaderboard(entries).slice(0, parseLimit(limit));
  };

  const add = async (submission: LeaderboardSubmission) => {
    return runSafely(async () => {
      const entries = await readEntries(filePath);
      const merged = sortLeaderboard([createEntry(submission), ...entries]).slice(0, 50);
      await writeEntries(filePath, merged);
      return merged;
    });
  };

  return {
    list,
    add
  };
};
