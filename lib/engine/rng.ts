// Random sources for the game engine. Gameplay draws from an injectable generator so a seeded run
// (the daily challenge) produces the same fruit sequence for every player.
export type Rng = () => number;

// mulberry32: tiny, fast, good enough for gameplay (not for security).
export const createSeededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// FNV-1a: turns a key such as "2026-10-15" into a 32-bit seed.
export const seedFromKey = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const pad = (value: number) => String(value).padStart(2, '0');

// The player's local calendar day, so the challenge changes at their midnight.
export const dayKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// A real calendar day: rejects 2026-02-31, which Date would silently roll into March.
export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
