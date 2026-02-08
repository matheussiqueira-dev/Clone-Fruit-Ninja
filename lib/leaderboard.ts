import { LeaderboardEntry, LeaderboardSubmission } from '../types';

export const MAX_PLAYER_LENGTH = 24;
export const MIN_PLAYER_LENGTH = 2;
export const MAX_SCORE = 999_999;
export const MAX_COMBO = 999;
export const MAX_LEADERBOARD_SIZE = 50;

const collapseSpaces = (value: string) => value.trim().replace(/\s+/g, ' ');
const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const sanitizePlayerName = (value: string) => {
  if (typeof value !== 'string') return '';
  return collapseSpaces(value).slice(0, MAX_PLAYER_LENGTH);
};

export const isValidLeaderboardSubmission = (payload: unknown): payload is LeaderboardSubmission => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  const player = sanitizePlayerName(String(candidate.player ?? ''));
  const score = Number(candidate.score);
  const accuracy = Number(candidate.accuracy);
  const maxCombo = Number(candidate.maxCombo);
  const inputMode = candidate.inputMode;

  if (player.length < MIN_PLAYER_LENGTH || player.length > MAX_PLAYER_LENGTH) return false;
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return false;
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) return false;
  if (!Number.isFinite(maxCombo) || maxCombo < 0 || maxCombo > MAX_COMBO) return false;
  if (inputMode !== 'camera' && inputMode !== 'pointer') return false;

  return true;
};

export const normalizeSubmission = (payload: LeaderboardSubmission): LeaderboardSubmission => {
  const score = Math.max(0, Math.min(MAX_SCORE, Math.floor(payload.score)));
  const accuracy = Math.max(0, Math.min(100, Math.round(payload.accuracy)));
  const maxCombo = Math.max(0, Math.min(MAX_COMBO, Math.floor(payload.maxCombo)));

  return {
    player: sanitizePlayerName(payload.player),
    score,
    accuracy,
    maxCombo,
    inputMode: payload.inputMode
  };
};

export const sortLeaderboard = (entries: LeaderboardEntry[]) => {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.maxCombo !== a.maxCombo) return b.maxCombo - a.maxCombo;
    return a.createdAt.localeCompare(b.createdAt);
  });
};

export const normalizeLeaderboardEntries = (entries: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(entries)) return [];

  const normalized: LeaderboardEntry[] = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const candidate = entry as Record<string, unknown>;

    if (!isValidLeaderboardSubmission(candidate)) return;

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : createId();
    const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt.trim()
      ? candidate.createdAt
      : new Date().toISOString();

    normalized.push({
      id,
      createdAt,
      ...normalizeSubmission(candidate as LeaderboardSubmission)
    });
  });

  return sortLeaderboard(normalized).slice(0, MAX_LEADERBOARD_SIZE);
};
