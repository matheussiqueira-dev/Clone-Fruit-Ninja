export const TARGET_FPS = 60;
export const BASE_SPAWN_FRAMES = 60;
export const MIN_SPAWN_FRAMES = 18;
export const COMBO_WINDOW = 0.9;
export const COMBO_TIMEOUT = 1.4;
export const MAX_COMBO = 5;

export const getSpawnInterval = (score: number, fps: number = TARGET_FPS) => {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const spawnFrames = Math.max(MIN_SPAWN_FRAMES, BASE_SPAWN_FRAMES - Math.floor(safeScore / 4));
  return spawnFrames / fps;
};

export const getBombChance = (score: number) => {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const base = 0.12;
  const max = 0.22;
  return Math.min(max, base + safeScore * 0.0015);
};

export const getSpeedMultiplier = (score: number) => {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const ramp = Math.min(1, safeScore / 120);
  return 1 + ramp * 0.35;
};

export const distanceToSegmentSq = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    const sx = px - ax;
    const sy = py - ay;
    return sx * sx + sy * sy;
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const cx = ax + clamped * dx;
  const cy = ay + clamped * dy;
  const ox = px - cx;
  const oy = py - cy;
  return ox * ox + oy * oy;
};

export interface ComboState {
  combo: number;
  maxCombo: number;
  lastSliceTime: number;
}

export interface ComboUpdateResult extends ComboState {
  scoreDelta: number;
}

export const updateComboOnSlice = ({
  combo,
  maxCombo,
  lastSliceTime,
  now,
  windowSeconds = COMBO_WINDOW,
  maxComboMultiplier = MAX_COMBO
}: {
  combo: number;
  maxCombo: number;
  lastSliceTime: number;
  now: number;
  windowSeconds?: number;
  maxComboMultiplier?: number;
}): ComboUpdateResult => {
  const timeSince = (now - lastSliceTime) / 1000;
  const nextCombo = timeSince <= windowSeconds
    ? Math.min(maxComboMultiplier, combo + 1)
    : 1;
  const nextMaxCombo = Math.max(maxCombo, nextCombo);
  return {
    combo: nextCombo,
    maxCombo: nextMaxCombo,
    lastSliceTime: now,
    scoreDelta: nextCombo
  };
};

export const shouldResetCombo = (
  now: number,
  lastSliceTime: number,
  timeoutSeconds = COMBO_TIMEOUT
) => now - lastSliceTime > timeoutSeconds * 1000;

export const applyMiss = (lives: number) => {
  const safeLives = Number.isFinite(lives) ? Math.max(0, Math.floor(lives)) : 0;
  const nextLives = Math.max(0, safeLives - 1);
  return {
    lives: nextLives,
    gameOver: nextLives <= 0
  };
};
