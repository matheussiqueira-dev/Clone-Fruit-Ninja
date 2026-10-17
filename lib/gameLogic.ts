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
  const nextCombo = timeSince <= windowSeconds ? Math.min(maxComboMultiplier, combo + 1) : 1;
  const nextMaxCombo = Math.max(maxCombo, nextCombo);
  return {
    combo: nextCombo,
    maxCombo: nextMaxCombo,
    lastSliceTime: now,
    scoreDelta: nextCombo
  };
};

export const shouldResetCombo = (now: number, lastSliceTime: number, timeoutSeconds = COMBO_TIMEOUT) =>
  now - lastSliceTime > timeoutSeconds * 1000;

export const applyMiss = (lives: number) => {
  const safeLives = Number.isFinite(lives) ? Math.max(0, Math.floor(lives)) : 0;
  const nextLives = Math.max(0, safeLives - 1);
  return {
    lives: nextLives,
    gameOver: nextLives <= 0
  };
};

// The blade only cuts while it moves: a resting cursor or hand must not slice what flies into it.
export const BLADE_IDLE_MS = 80;
export const MIN_BLADE_SEGMENT_PX = 4;

export const isBladeActive = (lastMoveAt: number, now: number, idleMs = BLADE_IDLE_MS) =>
  Number.isFinite(lastMoveAt) && now >= lastMoveAt && now - lastMoveAt <= idleMs;

export interface SplitHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Angle of the cut line; the half covers the semicircle on its `side` of that line.
  cutAngle: number;
  side: 1 | -1;
}

// Splits a body along the cut direction: both halves keep the body's velocity and move apart
// along the normal of the cut, so the gap always follows the swipe.
export const splitAlongCut = (
  body: { x: number; y: number; vx: number; vy: number },
  cutDx: number,
  cutDy: number,
  separationSpeed = 90
): [SplitHalf, SplitHalf] => {
  const length = Math.hypot(cutDx, cutDy);
  const cutAngle = length > 0 ? Math.atan2(cutDy, cutDx) : 0;
  const nx = length > 0 ? -cutDy / length : 0;
  const ny = length > 0 ? cutDx / length : 1;

  const half = (side: 1 | -1): SplitHalf => ({
    x: body.x + nx * side * 2,
    y: body.y + ny * side * 2,
    vx: body.vx + nx * side * separationSpeed,
    vy: body.vy + ny * side * separationSpeed,
    cutAngle,
    side
  });

  return [half(1), half(-1)];
};

// Gravity of the fruit arc. The launch speed is derived from the stage height, so every fruit peaks
// inside the stage and falls back into it at any screen size.
export const STAGE_GRAVITY = 1200; // px/s^2: about 1.6-2.1 s of flight on common screens

export interface LaunchPlan {
  vx: number;
  vy: number;
  flightTime: number;
}

export const planLaunch = ({
  startX,
  targetX,
  height,
  apexFraction,
  gravity = STAGE_GRAVITY
}: {
  startX: number;
  targetX: number;
  height: number;
  // Peak height as a fraction of the stage height (0-1).
  apexFraction: number;
  gravity?: number;
}): LaunchPlan => {
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  const safeFraction = Number.isFinite(apexFraction) ? Math.min(0.98, Math.max(0.1, apexFraction)) : 0.7;
  const apex = safeHeight * safeFraction;
  const vy = -Math.sqrt(2 * gravity * apex);
  // Time to rise and fall back to the launch line.
  const flightTime = (2 * -vy) / gravity;
  const vx = (targetX - startX) / flightTime;
  return { vx, vy, flightTime };
};
