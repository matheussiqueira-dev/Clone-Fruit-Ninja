// Pure game engine: physics, slicing, scoring and lives. No canvas, no React, no timers.
// The caller feeds it elapsed time and the blade position; a renderer draws `engine.state`.
import { FRUIT_ART, FRUIT_KINDS, FruitKind } from '../../config/artPalette';
import { Fruit, GameOverReason, GameStats, Particle, Point } from '../../types';
import {
  MIN_BLADE_SEGMENT_PX,
  STAGE_GRAVITY,
  SplitHalf,
  TARGET_FPS,
  applyMiss,
  distanceToSegmentSq,
  getBombChance,
  getSpawnInterval,
  getSpeedMultiplier,
  isBladeActive,
  planLaunch,
  shouldResetCombo,
  splitAlongCut,
  updateComboOnSlice
} from '../gameLogic';
import { Rng } from './rng';

export interface FlyingHalf extends SplitHalf {
  kind: FruitKind;
  radius: number;
  rotation: number;
  rotationSpeed: number;
}

export interface JuiceSplat {
  x: number;
  y: number;
  radius: number;
  kind: FruitKind;
  age: number;
}

export interface EngineState {
  fruits: Fruit[];
  halves: FlyingHalf[];
  splats: JuiceSplat[];
  particles: Particle[];
  // Recent blade samples in stage pixels, oldest first.
  trail: Point[];
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
  setOptions: (options: Partial<Pick<EngineOptions, 'particles' | 'trailLimit'>>) => void;
  // Forgets the current stroke (resume after pause): the next sample cannot cut.
  breakStroke: () => void;
}

export const SPLAT_LIFETIME = 1.5; // seconds until a juice splat has dried
export const MAX_DELTA = 0.05; // seconds; longer frames are clamped so a stall never teleports fruit
const HALF_GRAVITY = STAGE_GRAVITY * 1.2;
const PARTICLE_GRAVITY = 12;
const PARTICLE_FADE = 1.2;
const HIT_PADDING = 10;
const MISS_MARGIN = 60;
const MAX_SPAWNS_PER_STEP = 4;
// A jump this large between two samples is a new stroke (hand re-acquired, new touch), never a cut.
const STROKE_BREAK_FRACTION = 0.25;

let idCounter = 0;
const nextId = () => `e${(idCounter += 1)}`;

export const createGameEngine = (options: EngineOptions): GameEngine => {
  let { width, height } = options;
  let particlesEnabled = options.particles;
  let trailLimit = options.trailLimit;
  const rng = options.rng;
  const cosmetic = options.cosmeticRng ?? Math.random;

  const state: EngineState = { fruits: [], halves: [], splats: [], particles: [], trail: [] };
  const stats: GameStats = {
    score: 0,
    lives: options.maxLives,
    combo: 0,
    maxCombo: 0,
    sliced: 0,
    missed: 0
  };
  let spawnAccumulator = 0;
  let lastMoveAt = -Infinity;
  let lastSliceAt = -Infinity;
  let over = false;

  const spawnFruit = () => {
    // Always draw the same number of values per spawn, so a seeded sequence stays aligned
    // even when different scores change the bomb threshold.
    const bombRoll = rng();
    const radiusRoll = rng();
    const startRoll = rng();
    const targetRoll = rng();
    const kindRoll = rng();
    const apexRoll = rng();

    const isBomb = bombRoll < getBombChance(stats.score);
    const radius = isBomb ? 34 : 30 + radiusRoll * 18;
    const margin = Math.min(width / 2, 50 + radius);
    const span = Math.max(1, width - margin * 2);
    const x = margin + startRoll * span;
    const launch = planLaunch({
      startX: x,
      targetX: margin + targetRoll * span,
      height: height + radius,
      apexFraction: 0.55 + apexRoll * 0.4
    });

    state.fruits.push({
      id: nextId(),
      x,
      y: height + radius,
      vx: launch.vx,
      vy: launch.vy,
      radius,
      kind: isBomb ? 'bomb' : FRUIT_KINDS[Math.floor(kindRoll * FRUIT_KINDS.length) % FRUIT_KINDS.length],
      type: isBomb ? 'bomb' : 'fruit',
      rotation: 0,
      rotationSpeed: (cosmetic() - 0.5) * 0.18 * TARGET_FPS,
      // Difficulty speeds the whole arc up instead of throwing fruit off the top of the stage.
      timeScale: getSpeedMultiplier(stats.score),
      sliced: false
    });
  };

  const addDrops = (x: number, y: number, kind: FruitKind) => {
    if (!particlesEnabled) return;
    for (let i = 0; i < 10; i++) {
      const angle = cosmetic() * Math.PI * 2;
      const speed = (cosmetic() * 5 + 2) * TARGET_FPS;
      state.particles.push({
        id: nextId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: FRUIT_ART[kind].flesh,
        life: 1,
        size: cosmetic() * 4 + 2
      });
    }
  };

  const trackBlade = (blade: Point | null, now: number) => {
    if (!blade) {
      // Hand lost or touch lifted: the next sample starts a new stroke.
      state.trail = [];
      return false;
    }
    const last = state.trail[state.trail.length - 1];
    const jump = last ? Math.hypot(last.x - blade.x, last.y - blade.y) : 0;
    if (!last || jump > Math.hypot(width, height) * STROKE_BREAK_FRACTION) {
      state.trail = [{ x: blade.x, y: blade.y }];
    } else if (jump >= MIN_BLADE_SEGMENT_PX) {
      state.trail.push({ x: blade.x, y: blade.y });
      lastMoveAt = now;
    }
    if (state.trail.length > trailLimit) {
      state.trail.splice(0, state.trail.length - trailLimit);
    }

    const active = isBladeActive(lastMoveAt, now);
    if (!active && state.trail.length > 1) {
      // A resting blade fades out instead of hanging in place.
      state.trail.shift();
    }
    return active;
  };

  const sliceFruit = (
    fruit: Fruit,
    index: number,
    cutDx: number,
    cutDy: number,
    now: number
  ): Partial<GameStats> => {
    const kind = fruit.kind as FruitKind;
    fruit.sliced = true;
    splitAlongCut(fruit, cutDx, cutDy, 220).forEach((half) => {
      state.halves.push({ ...half, kind, radius: fruit.radius, rotation: 0, rotationSpeed: half.side * 1.4 });
    });
    state.splats.push({ x: fruit.x, y: fruit.y, radius: fruit.radius * 1.15, kind, age: 0 });
    addDrops(fruit.x, fruit.y, kind);
    state.fruits.splice(index, 1);

    const combo = updateComboOnSlice({
      combo: stats.combo,
      maxCombo: stats.maxCombo,
      lastSliceTime: lastSliceAt,
      now
    });
    lastSliceAt = combo.lastSliceTime;
    stats.combo = combo.combo;
    stats.maxCombo = combo.maxCombo;
    stats.score += combo.scoreDelta;
    stats.sliced += 1;
    return { score: stats.score, combo: stats.combo, maxCombo: stats.maxCombo, sliced: stats.sliced };
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

    const bladeActive = trackBlade(blade, now);

    if (stats.combo > 0 && shouldResetCombo(now, lastSliceAt)) {
      stats.combo = 0;
      merge({ combo: 0 });
    }

    spawnAccumulator += delta;
    const interval = getSpawnInterval(stats.score);
    for (let spawned = 0; spawnAccumulator >= interval && spawned < MAX_SPAWNS_PER_STEP; spawned++) {
      spawnFruit();
      spawnAccumulator -= interval;
    }

    const tip = state.trail[state.trail.length - 1];
    const prev = state.trail[state.trail.length - 2];
    const canCut = bladeActive && tip !== undefined && prev !== undefined;

    for (let i = state.fruits.length - 1; i >= 0; i--) {
      const fruit = state.fruits[i];
      const dt = delta * fruit.timeScale;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;
      fruit.vy += STAGE_GRAVITY * dt;
      fruit.rotation += fruit.rotationSpeed * dt;

      if (canCut && !fruit.sliced) {
        const reach = fruit.radius + HIT_PADDING;
        if (distanceToSegmentSq(fruit.x, fruit.y, prev.x, prev.y, tip.x, tip.y) < reach * reach) {
          if (fruit.type === 'bomb') {
            over = true;
            return { stats: changed, gameOver: 'bomb' };
          }
          merge(sliceFruit(fruit, i, tip.x - prev.x, tip.y - prev.y, now));
          continue;
        }
      }

      if (fruit.y > height + fruit.radius + MISS_MARGIN) {
        state.fruits.splice(i, 1);
        if (fruit.type === 'fruit') {
          stats.missed += 1;
          const miss = applyMiss(stats.lives);
          stats.lives = miss.lives;
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
    },
    breakStroke: () => {
      state.trail = [];
      lastMoveAt = -Infinity;
    }
  };
};
