import { describe, expect, it } from 'vitest';
import { Fruit } from '../../types';
import { createGameEngine, GameEngine } from './gameEngine';
import { createSeededRng, dayKey, isDayKey, seedFromKey } from './rng';

const WIDTH = 800;
const HEIGHT = 600;
const FRAME = 1 / 60;

const makeEngine = (seed = 1): GameEngine => createGameEngine({
  width: WIDTH,
  height: HEIGHT,
  maxLives: 3,
  rng: createSeededRng(seed),
  cosmeticRng: createSeededRng(999),
  particles: true,
  trailLimit: 14
});

// A fruit parked in the middle of the stage, not moving, so the blade can be aimed at it.
const parkFruit = (engine: GameEngine, overrides: Partial<Fruit> = {}): Fruit => {
  const fruit: Fruit = {
    id: 'target',
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 30,
    kind: 'apple',
    type: 'fruit',
    rotation: 0,
    rotationSpeed: 0,
    timeScale: 0,
    sliced: false,
    ...overrides
  };
  engine.state.fruits.push(fruit);
  return fruit;
};

// Moves the blade from (x0,y) to (x1,y) in `steps` frames; returns the last step result.
const swipe = (engine: GameEngine, x0: number, x1: number, y: number, startMs: number, steps = 10) => {
  let result = engine.step(FRAME, startMs, { x: x0, y });
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    result = engine.step(FRAME, startMs + i * 16, { x, y });
    if (result.gameOver) break;
  }
  return result;
};

describe('seeded randomness', () => {
  it('gives the same sequence for the same seed and a different one for another seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const c = createSeededRng(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    seqA.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it('derives a stable seed per day and validates day keys', () => {
    expect(seedFromKey('2026-10-15')).toBe(seedFromKey('2026-10-15'));
    expect(seedFromKey('2026-10-15')).not.toBe(seedFromKey('2026-10-16'));
    expect(dayKey(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(isDayKey('2026-10-15')).toBe(true);
    expect(isDayKey('2026-13-40')).toBe(false);
    expect(isDayKey('2026-02-31')).toBe(false);
    expect(isDayKey('2028-02-29')).toBe(true);
    expect(isDayKey('hoje')).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });
});

describe('createGameEngine', () => {
  it('spawns the same fruit sequence for the same seed, regardless of particle settings', () => {
    const run = (particles: boolean) => {
      const engine = createGameEngine({
        width: WIDTH, height: HEIGHT, maxLives: 3, rng: createSeededRng(7), particles, trailLimit: 14
      });
      for (let i = 0; i < 120; i++) engine.step(FRAME, i * 16, null);
      return engine.state.fruits.map((fruit) => [fruit.kind, Math.round(fruit.x), Math.round(fruit.vy)]);
    };
    const withParticles = run(true);
    expect(withParticles.length).toBeGreaterThan(0);
    expect(run(false)).toEqual(withParticles);
  });

  it('never slices with a resting blade', () => {
    const engine = makeEngine();
    parkFruit(engine);
    for (let i = 0; i < 60; i++) engine.step(FRAME, i * 16, { x: 400, y: 300 });
    expect(engine.stats.score).toBe(0);
    expect(engine.state.fruits.some((fruit) => fruit.id === 'target')).toBe(true);
  });

  it('slices a fruit the moving blade crosses, splitting it into two halves', () => {
    const engine = makeEngine();
    parkFruit(engine);
    const result = swipe(engine, 300, 500, 300, 1000);
    expect(result.gameOver).toBeNull();
    expect(engine.stats.score).toBe(1);
    expect(engine.stats.sliced).toBe(1);
    expect(engine.state.fruits.some((fruit) => fruit.id === 'target')).toBe(false);
    expect(engine.state.halves).toHaveLength(2);
    expect(engine.state.splats).toHaveLength(1);
  });

  it('ends the round when the blade crosses a bomb', () => {
    const engine = makeEngine();
    parkFruit(engine, { id: 'bomb', type: 'bomb', kind: 'bomb' });
    const result = swipe(engine, 300, 500, 300, 1000);
    expect(result.gameOver).toBe('bomb');
    // A finished engine ignores further steps.
    expect(engine.step(FRAME, 5000, { x: 0, y: 0 })).toEqual({ stats: null, gameOver: null });
  });

  it('ends the round after three dropped fruit', () => {
    const engine = makeEngine();
    let gameOver = null;
    for (let i = 0; i < 3 && !gameOver; i++) {
      engine.state.fruits.push({
        id: `drop-${i}`, x: 100, y: HEIGHT + 200, vx: 0, vy: 0, radius: 30, kind: 'orange',
        type: 'fruit', rotation: 0, rotationSpeed: 0, timeScale: 1, sliced: false
      });
      gameOver = engine.step(FRAME, i * 16, null).gameOver;
    }
    expect(gameOver).toBe('lives');
    expect(engine.stats.lives).toBe(0);
    expect(engine.stats.missed).toBe(3);
  });

  it('does not cut across the stage when the blade jumps (new stroke)', () => {
    const engine = makeEngine();
    parkFruit(engine);
    engine.step(FRAME, 1000, { x: 10, y: 300 });
    // Next sample on the far side: a re-acquired hand or a new touch, not a swipe.
    engine.step(FRAME, 1016, { x: 790, y: 300 });
    expect(engine.stats.score).toBe(0);
    expect(engine.state.trail).toHaveLength(1);
  });

  it('forgets the stroke on breakStroke so a resumed round cannot cut immediately', () => {
    const engine = makeEngine();
    parkFruit(engine);
    engine.step(FRAME, 1000, { x: 330, y: 300 });
    engine.breakStroke();
    engine.step(FRAME, 1016, { x: 380, y: 300 });
    expect(engine.stats.score).toBe(0);
  });

  it('clamps long frames so a stalled tab never teleports fruit', () => {
    const engine = makeEngine();
    const fruit = parkFruit(engine, { vy: -600, timeScale: 1 });
    engine.step(10, 0, null);
    expect(fruit.y).toBeCloseTo(300 - 600 * 0.05, 0);
  });
});
