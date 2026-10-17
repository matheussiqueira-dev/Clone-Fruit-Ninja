import { STORAGE_KEYS } from '../config/gameConfig';
import { LeaderboardEntry, LeaderboardResult, LeaderboardScope, LeaderboardSubmission } from '../types';
import {
  isValidLeaderboardSubmission,
  normalizeLeaderboardEntries,
  normalizeSubmission,
  sortLeaderboard
} from '../lib/leaderboard';

const REQUEST_TIMEOUT_MS = 3500;

// Remote ranking only when an API is configured, or on localhost where `npm run dev:server` runs.
// Static deploys (Vercel) have no API: results stay in this browser.
export const resolveLeaderboardApiUrl = (envValue: unknown, hostname: string | undefined): string | null => {
  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim().replace(/\/$/, '');
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api/v1';
  }

  return null;
};

const getBaseApiUrl = () =>
  resolveLeaderboardApiUrl(
    import.meta.env.VITE_LEADERBOARD_API_URL,
    typeof window !== 'undefined' ? window.location.hostname : undefined
  );

export const getLeaderboardScope = (): LeaderboardScope => (getBaseApiUrl() ? 'remote' : 'local');

const readLocalLeaderboard = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.localLeaderboard);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return normalizeLeaderboardEntries(parsed);
  } catch (error) {
    console.warn('Failed to read local leaderboard:', error);
    return [];
  }
};

const writeLocalLeaderboard = (entries: LeaderboardEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.localLeaderboard, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to write local leaderboard:', error);
  }
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const mergeLocalWithRemote = (remote: LeaderboardEntry[]) => {
  const merged = sortLeaderboard([...remote, ...readLocalLeaderboard()]);
  const unique = new Map<string, LeaderboardEntry>();

  merged.forEach((entry) => {
    if (!unique.has(entry.id)) {
      unique.set(entry.id, entry);
    }
  });

  const snapshot = [...unique.values()].slice(0, 50);
  writeLocalLeaderboard(snapshot);
  return snapshot;
};

const createLocalEntry = (payload: LeaderboardSubmission): LeaderboardEntry => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  createdAt: new Date().toISOString(),
  ...payload
});

const saveLocally = (payload: LeaderboardSubmission): LeaderboardResult => {
  const merged = sortLeaderboard([createLocalEntry(payload), ...readLocalLeaderboard()]).slice(0, 50);
  writeLocalLeaderboard(merged);
  return { entries: merged, source: 'local' };
};

export const fetchLeaderboard = async (limit: number): Promise<LeaderboardResult> => {
  const baseApiUrl = getBaseApiUrl();

  if (!baseApiUrl) {
    return { entries: readLocalLeaderboard().slice(0, limit), source: 'local' };
  }

  try {
    const data = await requestJson<{ entries?: unknown }>(`${baseApiUrl}/leaderboard?limit=${limit}`);
    const normalized = normalizeLeaderboardEntries(data.entries ?? []);
    return { entries: mergeLocalWithRemote(normalized).slice(0, limit), source: 'remote' };
  } catch (error) {
    console.warn('Leaderboard API unavailable, using local fallback:', error);
    return { entries: readLocalLeaderboard().slice(0, limit), source: 'local' };
  }
};

export const submitLeaderboardScore = async (payload: LeaderboardSubmission): Promise<LeaderboardResult> => {
  if (!isValidLeaderboardSubmission(payload)) {
    throw new Error('Payload inválido para leaderboard.');
  }

  const baseApiUrl = getBaseApiUrl();
  const normalizedPayload = normalizeSubmission(payload);

  if (!baseApiUrl) {
    return saveLocally(normalizedPayload);
  }

  try {
    const data = await requestJson<{ entries?: unknown }>(`${baseApiUrl}/leaderboard`, {
      method: 'POST',
      body: JSON.stringify(normalizedPayload)
    });

    const normalized = normalizeLeaderboardEntries(data.entries ?? []);
    return { entries: mergeLocalWithRemote(normalized), source: 'remote' };
  } catch (error) {
    console.warn('Failed to submit score to API, keeping local only:', error);
    return saveLocally(normalizedPayload);
  }
};
