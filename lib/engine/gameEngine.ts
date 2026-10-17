// Pure game engine: physics, slicing, scoring and lives. No canvas, no React, no timers.
// The caller feeds it elapsed time and the blade position; a renderer draws `engine.state`.
import { ArtKind, FRUIT_KINDS, artFor } from '../../config/artPalette';
import { Fruit, GameOverReason, GameStats, Particle, Point } from '../../types';
import {
  MIN_BLADE_SEGMENT_PX,
  MIN_CUT_SPEED,
  STAGE_GRAVITY,
  SplitHalf,
  TARGET_FPS,
  applyLifeGain,
  applyMiss,
  distanceToSegmentSq,
  getBombChance,
  getLifeChance,
  getSpawnInterval,
  getSpeedMultiplier,
  getVolleySize,
  isBladeActive,
  planLaunch,
  shouldResetCombo,
  splitAlongCut,
  updateComboOnSlice
} from '../gameLogic';
import { Rng } from './rng';

export interface FlyingHalf extends SplitHalf {
  kind: ArtKind;
  radius: number;
  rotation: number;
  rotationSpeed: number;
}

export interface JuiceSplat {
  x: number;
  y: number;
  radius: number;
  kind: ArtKind;
  age: number;
}

export type PopupTone = 'score' | 'bonus' | 'life' | 'danger' | 'info';

// Floating feedback text ("+3", "Combo x4", "-1 ❤️"); it rises and fades.
export interface Popup {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: PopupTone;
  size: number;
  age: number;
  lifetime: number;
}

export interface EngineState {
  fruits: Fruit[];
  halves: FlyingHalf[];
  splats: JuiceSplat[];
  particles: Particle[];
  popups: Popup[];
  // Recent blade samples in stage pixels, oldest first.
  trail: Point[];
  // Whether the blade is moving fast enough to cut right now.
  bladeCutting: boolean;
  // Red flash after a bomb (1 → 0) and pink glow after a heart (1 → 0).
  dangerFlash: number;
  lifeFlash: number;
}

export interface EngineOptions {
  width: number;
  height: number;
  maxLives: number;
  // Gameplay randomness (spawns). Seed it for a reproducible run.
  rng: Rng;
  // Cosmetic randomness (particles, spin). Never affects gameplay.
  cosmeticRng?: Rng;
  // Juice drops; off for reduced motion and low effects.
  particles: boolean;
  trailLimit: number;
  // Multiplies the blade's reach around each target (camera play is less precise than a mouse).
  hitAssist?: number;
}

export interface StepResult {
  // Stats that changed during this step (null when nothing changed).
  stats: Partial<GameStats> | null;
  gameOver: GameOverReason | null;
}

export interface GameEngine {
  readonly state: EngineState;
  readonly stats: Readonly<GameStats>;
  step: (deltaSeconds: number, nowMs: number, blade: Point | null) => StepResult;
  resize: (width: number, height: number) => void;
  setOptions: (options: Partial<Pick<EngineOptions, 'particles' | 'trailLimit' | 'hitAssist'>>) => void;
  // Forgets the current stroke (resume after pause): the next sample cannot cut.
  breakStroke: () => void;
}

export const SPLAT_LIFETIME = 1.5; // seconds until a juice splat has dried
export const MAX_DELTA = 0.05; // seconds; longer frames are clamped so a stall never teleports fruit
const HALF_GRAVITY = STAGE_GRAVITY * 1.2;
const PARTICLE_GRAVITY = 900;
const PARTICLE_FADE = 1.4;
const MISS_MARGIN = 60;
const MAX_VOLLEYS_PER_STEP = 2;
// A jump this large between two samples is a new stroke (hand re-acquired, new touch), never a cut.
const STROKE_BREAK_FRACTION = 0.5;
// Slices this close together belong to the same stroke (multi-cut bonus).
const STROKE_SLICE_WINDOW_MS = 320;
// After a bomb, other bombs in the same swipe are ignored for a moment.
const BOMB_GRACE_MS = 900;
const FLASH_FADE = 2.2; // per second

let idCounter = 0;
const nextId = () => `e${(idCounter += 1)}`;

// Target size follows the stage, so fruit stays big enough to hit on a phone and on a TV.
export const baseRadiusFor = (width: number, height: number) =>
  Math.min(58, Math.max(32, Math.min(width, height) * 0.075));

export const createGameEngine = (options: EngineOptions): GameEngine => {
  let { width, height } = options;
  let particlesEnabled = options.particles;
  let trailLimit = options.trailLimit;
  let hitAssist = options.hitAssist ?? 1;
  const maxLives = options.maxLives;
  const rng = options.rng;
  const cosmetic = options.cosmeticRng ?? Math.random;

  const state: EngineState = {
    fruits: [],
    halves: [],
    splats: [],
    particles: [],
    popups: [],
    trail: [],
    bladeCutting: false,
    dangerFlash: 0,
    lifeFlash: 0
  };
  const stats: GameStats = {
    score: 0,
    lives: maxLives,
    combo: 0,
    maxCombo: 0,
    sliced: 0,
    missed: 0
  };
  // The first volley comes quickly, but not on the very first frame.
  let spawnAccumulator = getSpawnInterval(0) * 0.45;
  let lastMoveAt = -Infinity;
  let lastSampleAt = -Infinity;
  let bladeSpeed = 0;
  let lastSliceAt = -Infinity;
  let strokeSlices = 0;
  let lastStrokeSliceAt = -Infinity;
  let bombGraceUntil = -Infinity;
  let over = false;

  const addPopup = (x: number, y: number, text: string, tone: PopupTone, size = 26, lifetime = 0.9) => {
    state.popups.push({
      id: nextId(),
      x: Math.min(width - 40, Math.max(40, x)),
      y: Math.min(height - 24, Math.max(32, y)),
      text,
      tone,
      size,
      age: 0,
      lifetime
    });
  };

  const spawnVolley = () => {
    // Always draw the same number of values per target, so a seeded sequence stays aligned
    // even when different scores change the thresholds.
    const volleyRoll = rng();
    const count = getVolleySize(stats.score, volleyRoll);
    const base = baseRadiusFor(width, height);
    let bombPlaced: boolean = false;
    let heartPlaced: boolean = false;

    for (let n = 0; n < count; n++) {
      const bombRoll = rng();
      const lifeRoll = rng();
      const radiusRoll = rng();
      const startRoll = rng();
      const targetRoll = rng();
      const kindRoll = rng();
      const apexRoll = rng();

      // In a multi-target volley the first one is never a bomb, so there is always something to cut.
      const bombAllowed: boolean = (n > 0 || count === 1) && !bombPlaced;
      const isBomb: boolean = bombAllowed && bombRoll < getBombChance(stats.score);
      const isHeart: boolean = !isBomb && !heartPlaced && lifeRoll < getLifeChance(stats.lives, maxLives);
      bombPlaced ||= isBomb;
      heartPlaced ||= isHeart;

      const radius = isBomb ? base * 0.95 : isHeart ? base * 0.85 : base * (0.88 + radiusRoll * 0.3);
      const margin = Math.min(width / 2, 40 + radius);
      const span = Math.max(1, width - margin * 2);
      const x = margin + startRoll * span;
      const launch = planLaunch({
        startX: x,
        // Fruit drifts toward the middle, so it rarely leaves the reachable area.
        targetX: width * 0.2 + targetRoll * width * 0.6,
        height: height + radius,
        apexFraction: 0.5 + apexRoll * 0.4
      });

      const kind: ArtKind = isBomb
        ? 'bomb'
        : isHeart
          ? 'heart'
          : FRUIT_KINDS[Math.floor(kindRoll * FRUIT_KINDS.length) % FRUIT_KINDS.length];

      state.fruits.push({
        id: nextId(),
        x,
        y: height + radius,
        vx: launch.vx,
        vy: launch.vy,
        radius,
        kind,
        type: isBomb ? 'bomb' : isHeart ? 'life' : 'fruit',
        rotation: (cosmetic() - 0.5) * 0.6,
        rotationSpeed: (cosmetic() - 0.5) * 0.12 * TARGET_FPS,
        // Difficulty speeds the whole arc up instead of throwing fruit off the top of the stage.
        timeScale: getSpeedMultiplier(stats.score),
        sliced: false
      });
    }
    return count;
  };

  const addDrops = (x: number, y: number, color: string, amount = 12, force = 1) => {
    if (!particlesEnabled) return;
    for (let i = 0; i < amount; i++) {
      const angle = cosmetic() * Math.PI * 2;
      const speed = (cosmetic() * 5 + 2) * TARGET_FPS * force;
      state.particles.push({
        id: nextId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        size: cosmetic() * 4 + 2.5
      });
    }
  };

  const trackBlade = (blade: Point | null, now: number) => {
    if (!blade) {
      // Hand lost or touch lifted: the next sample starts a new stroke.
      state.trail = [];
      bladeSpeed = 0;
      return false;
    }
    const last = state.trail[state.trail.length - 1];
    const jump = last ? Math.hypot(last.x - blade.x, last.y - blade.y) : 0;
    if (!last || jump > Math.hypot(width, height) * STROKE_BREAK_FRACTION) {
      state.trail = [{ x: blade.x, y: blade.y }];
      lastSampleAt = now;
      bladeSpeed = 0;
    } else if (jump >= MIN_BLADE_SEGMENT_PX) {
      state.trail.push({ x: blade.x, y: blade.y });
      const elapsed = Math.max(8, now - lastSampleAt);
      bladeSpeed = (jump / elapsed) * 1000;
      lastSampleAt = now;
      lastMoveAt = now;
    }
    if (state.trail.length > trailLimit) {
      state.trail.splice(0, state.trail.length - trailLimit);
    }

    const active = isBladeActive(lastMoveAt, now);
    if (!active) {
      bladeSpeed = 0;
      // A resting blade fades out instead of hanging in place.
      if (state.trail.length > 1) state.trail.shift();
    }
    return active && bladeSpeed >= MIN_CUT_SPEED;
  };

  const splitTarget = (fruit: Fruit, index: number, cutDx: number, cutDy: number) => {
    fruit.sliced = true;
    splitAlongCut(fruit, cutDx, cutDy, 220).forEach((half) => {
      state.halves.push({
        ...half,
        kind: fruit.kind,
        radius: fruit.radius,
        rotation: fruit.rotation,
        rotationSpeed: half.side * 1.6
      });
    });
    state.fruits.splice(index, 1);
  };

  const sliceFruit = (
    fruit: Fruit,
    index: number,
    cutDx: number,
    cutDy: number,
    now: number
  ): Partial<GameStats> => {
    const art = artFor(fruit.kind);
    splitTarget(fruit, index, cutDx, cutDy);
    state.splats.push({ x: fruit.x, y: fruit.y, radius: fruit.radius * 1.2, kind: fruit.kind, age: 0 });
    addDrops(fruit.x, fruit.y, art.flesh);

    const combo = updateComboOnSlice({
      combo: stats.combo,
      maxCombo: stats.maxCombo,
      lastSliceTime: lastSliceAt,
      now
    });
    const comboGrew = combo.combo > stats.combo && combo.combo >= 2;
    lastSliceAt = combo.lastSliceTime;
    stats.combo = combo.combo;
    stats.maxCombo = combo.maxCombo;
    stats.score += combo.scoreDelta;
    stats.sliced += 1;
    addPopup(fruit.x, fruit.y - fruit.radius, `+${combo.scoreDelta}`, 'score', 24, 0.7);

    // Several fruit in one swipe: a bonus on top of the combo.
    strokeSlices = now - lastStrokeSliceAt <= STROKE_SLICE_WINDOW_MS ? strokeSlices + 1 : 1;
    lastStrokeSliceAt = now;
    if (strokeSlices >= 3) {
      const bonus = strokeSlices;
      stats.score += bonus;
      addPopup(
        fruit.x,
        fruit.y - fruit.radius - 36,
        `✨ ${strokeSlices} de uma vez! +${bonus}`,
        'bonus',
        28,
        1.1
      );
    } else if (comboGrew) {
      addPopup(fruit.x, fruit.y - fruit.radius - 34, `🔥 Combo x${combo.combo}`, 'bonus', 24, 0.9);
    }
    return { score: stats.score, combo: stats.combo, maxCombo: stats.maxCombo, sliced: stats.sliced };
  };

  const sliceHeart = (fruit: Fruit, index: number, cutDx: number, cutDy: number): Partial<GameStats> => {
    splitTarget(fruit, index, cutDx, cutDy);
    addDrops(fruit.x, fruit.y, artFor('heart').flesh, 16);
    const before = stats.lives;
    stats.lives = applyLifeGain(stats.lives, maxLives);
    state.lifeFlash = 1;
    addPopup(fruit.x, fruit.y - fruit.radius, stats.lives > before ? '+1 ❤️' : '❤️ Cheio!', 'life', 30, 1.1);
    return { lives: stats.lives };
  };

  const hitBomb = (fruit: Fruit, index: number, now: number): Partial<GameStats> => {
    state.fruits.splice(index, 1);
    addDrops(fruit.x, fruit.y, artFor('bomb').flesh, 26, 1.4);
    bombGraceUntil = now + BOMB_GRACE_MS;
    state.dangerFlash = 1;
    const miss = applyMiss(stats.lives);
    stats.lives = miss.lives;
    stats.combo = 0;
    lastSliceAt = -Infinity;
    addPopup(fruit.x, fruit.y - fruit.radius, '💥 -1 ❤️', 'danger', 32, 1.1);
    return { lives: stats.lives, combo: 0 };
  };

  const step: GameEngine['step'] = (deltaSeconds, now, blade) => {
    if (over) return { stats: null, gameOver: null };
    const delta = Math.min(Math.max(0, deltaSeconds), MAX_DELTA);
    let changed: Partial<GameStats> | null = null;
    const merge = (partial: Partial<GameStats>) => {
      changed = { ...(changed ?? {}), ...partial };
    };

    for (let i = state.splats.length - 1; i >= 0; i--) {
      const splat = state.splats[i];
      splat.age += delta;
      if (splat.age >= SPLAT_LIFETIME) state.splats.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const popup = state.popups[i];
      popup.age += delta;
      popup.y -= 40 * delta;
      if (popup.age >= popup.lifetime) state.popups.splice(i, 1);
    }
    state.dangerFlash = Math.max(0, state.dangerFlash - FLASH_FADE * delta);
    state.lifeFlash = Math.max(0, state.lifeFlash - FLASH_FADE * delta);

    const cutting = trackBlade(blade, now);
    state.bladeCutting = cutting;

    if (stats.combo > 0 && shouldResetCombo(now, lastSliceAt)) {
      stats.combo = 0;
      merge({ combo: 0 });
    }

    spawnAccumulator += delta;
    const interval = getSpawnInterval(stats.score);
    for (let volleys = 0; spawnAccumulator >= interval && volleys < MAX_VOLLEYS_PER_STEP; volleys++) {
      const count = spawnVolley();
      // Bigger volleys buy a little more time before the next one.
      spawnAccumulator -= interval * (1 + (count - 1) * 0.35);
    }

    const tip = state.trail[state.trail.length - 1];
    const prev = state.trail[state.trail.length - 2];
    const canCut = cutting && tip !== undefined && prev !== undefined;
    const padding = Math.max(14, Math.min(width, height) * 0.025) * hitAssist;

    for (let i = state.fruits.length - 1; i >= 0; i--) {
      const fruit = state.fruits[i];
      const dt = delta * fruit.timeScale;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;
      fruit.vy += STAGE_GRAVITY * dt;
      fruit.rotation += fruit.rotationSpeed * dt;

      if (canCut && !fruit.sliced) {
        // Bombs get a tighter reach than fruit, so brushing past one is forgiven.
        const reach = fruit.type === 'bomb' ? fruit.radius * 0.8 + padding * 0.4 : fruit.radius + padding;
        if (distanceToSegmentSq(fruit.x, fruit.y, prev.x, prev.y, tip.x, tip.y) < reach * reach) {
          const cutDx = tip.x - prev.x;
          const cutDy = tip.y - prev.y;
          if (fruit.type === 'bomb') {
            if (now < bombGraceUntil) continue;
            merge(hitBomb(fruit, i, now));
            if (stats.lives <= 0) {
              over = true;
              return { stats: changed, gameOver: 'bomb' };
            }
            continue;
          }
          merge(
            fruit.type === 'life'
              ? sliceHeart(fruit, i, cutDx, cutDy)
              : sliceFruit(fruit, i, cutDx, cutDy, now)
          );
          continue;
        }
      }

      if (fruit.y > height + fruit.radius + MISS_MARGIN) {
        state.fruits.splice(i, 1);
        if (fruit.type === 'fruit') {
          stats.missed += 1;
          const miss = applyMiss(stats.lives);
          stats.lives = miss.lives;
          state.dangerFlash = Math.max(state.dangerFlash, 0.45);
          addPopup(fruit.x, height - 30, '💔', 'danger', 30, 0.9);
          merge({ missed: stats.missed, lives: stats.lives });
          if (miss.gameOver) {
            over = true;
            return { stats: changed, gameOver: 'lives' };
          }
        }
      }
    }

    for (let i = state.halves.length - 1; i >= 0; i--) {
      const half = state.halves[i];
      half.x += half.vx * delta;
      half.y += half.vy * delta;
      half.vy += HALF_GRAVITY * delta;
      half.rotation += half.rotationSpeed * delta;
      if (half.y > height + half.radius * 2) state.halves.splice(i, 1);
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const particle = state.particles[i];
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += PARTICLE_GRAVITY * delta;
      particle.life -= PARTICLE_FADE * delta;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }

    return { stats: changed, gameOver: null };
  };

  return {
    state,
    stats,
    step,
    resize: (nextWidth, nextHeight) => {
      width = nextWidth;
      height = nextHeight;
    },
    setOptions: (next) => {
      if (next.particles !== undefined) particlesEnabled = next.particles;
      if (next.trailLimit !== undefined) trailLimit = next.trailLimit;
      if (next.hitAssist !== undefined) hitAssist = next.hitAssist;
    },
    breakStroke: () => {
      state.trail = [];
      lastMoveAt = -Infinity;
      bladeSpeed = 0;
      state.bladeCutting = false;
    }
  };
};
