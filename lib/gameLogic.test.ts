import { describe, expect, it } from 'vitest';
import {
  BASE_SPAWN_FRAMES,
  BLADE_IDLE_MS,
  COMBO_TIMEOUT,
  COMBO_WINDOW,
  MAX_COMBO,
  MIN_SPAWN_FRAMES,
  TARGET_FPS,
  BOMB_GRACE_SCORE,
  applyLifeGain,
  applyMiss,
  distanceToSegmentSq,
  getLifeChance,
  getVolleySize,
  getBombChance,
  getSpawnInterval,
  getSpeedMultiplier,
  isBladeActive,
  planLaunch,
  STAGE_GRAVITY,
  shouldResetCombo,
  splitAlongCut,
  updateComboOnSlice
} from './gameLogic';

describe('gameLogic', () => {
  it('reduces spawn interval as score increases and clamps to min', () => {
    const base = getSpawnInterval(0);
    const faster = getSpawnInterval(40);
    const min = getSpawnInterval(10000);

    expect(faster).toBeLessThan(base);
    expect(min).toBeCloseTo(MIN_SPAWN_FRAMES / TARGET_FPS, 6);
    expect(base).toBeCloseTo(BASE_SPAWN_FRAMES / TARGET_FPS, 6);
  });

  it('holds bombs back during the warm-up and caps their chance', () => {
    expect(getBombChance(0)).toBe(0);
    expect(getBombChance(BOMB_GRACE_SCORE - 1)).toBe(0);
    expect(getBombChance(BOMB_GRACE_SCORE)).toBeGreaterThan(0.08);
    expect(getBombChance(1000)).toBeCloseTo(0.16, 4);
  });

  it('scales speed multiplier with score', () => {
    expect(getSpeedMultiplier(0)).toBeCloseTo(1, 6);
    expect(getSpeedMultiplier(150)).toBeCloseTo(1.3, 6);
    expect(getSpeedMultiplier(300)).toBeCloseTo(1.3, 6);
  });

  it('throws single fruit at first and bigger volleys later', () => {
    expect(getVolleySize(0, 0)).toBe(1);
    expect(getVolleySize(0, 0.5)).toBe(1);
    expect(getVolleySize(40, 0.1)).toBe(3);
    expect(getVolleySize(40, 0.5)).toBe(2);
    expect(getVolleySize(40, 0.9)).toBe(1);
    expect(getVolleySize(80, 0.05)).toBe(4);
  });

  it('offers hearts only while a life is missing, more often when few are left', () => {
    expect(getLifeChance(5, 5)).toBe(0);
    expect(getLifeChance(4, 5)).toBeGreaterThan(0);
    expect(getLifeChance(1, 5)).toBeGreaterThan(getLifeChance(4, 5));
    expect(getLifeChance(0, 5)).toBeLessThanOrEqual(0.18);
  });

  it('gains a life without passing the maximum', () => {
    expect(applyLifeGain(3, 5)).toBe(4);
    expect(applyLifeGain(5, 5)).toBe(5);
    expect(applyLifeGain(Number.NaN, 5)).toBe(1);
  });

  it('computes distance to segment correctly', () => {
    expect(distanceToSegmentSq(5, 0, 0, 0, 10, 0)).toBeCloseTo(0, 6);
    expect(distanceToSegmentSq(5, 5, 0, 0, 10, 0)).toBeCloseTo(25, 6);
  });

  it('updates combo within window and caps max combo', () => {
    const first = updateComboOnSlice({
      combo: 0,
      maxCombo: 0,
      lastSliceTime: -Infinity,
      now: 1000
    });
    expect(first.combo).toBe(1);
    expect(first.maxCombo).toBe(1);
    expect(first.scoreDelta).toBe(1);

    const second = updateComboOnSlice({
      combo: first.combo,
      maxCombo: first.maxCombo,
      lastSliceTime: first.lastSliceTime,
      now: 1000 + COMBO_WINDOW * 1000 - 10
    });
    expect(second.combo).toBe(2);

    const capped = updateComboOnSlice({
      combo: MAX_COMBO,
      maxCombo: MAX_COMBO,
      lastSliceTime: second.lastSliceTime,
      now: second.lastSliceTime + 100
    });
    expect(capped.combo).toBe(MAX_COMBO);
    expect(capped.scoreDelta).toBe(MAX_COMBO);
  });

  it('resets combo after timeout', () => {
    const now = 5000;
    expect(shouldResetCombo(now + COMBO_TIMEOUT * 1000 + 1, now)).toBe(true);
    expect(shouldResetCombo(now + COMBO_TIMEOUT * 1000 - 1, now)).toBe(false);
  });

  it('applies miss and ends game at zero lives', () => {
    expect(applyMiss(3)).toEqual({ lives: 2, gameOver: false });
    expect(applyMiss(1)).toEqual({ lives: 0, gameOver: true });
  });
});

describe('isBladeActive', () => {
  it('cuts only right after the blade moved', () => {
    expect(isBladeActive(1000, 1000)).toBe(true);
    expect(isBladeActive(1000, 1000 + BLADE_IDLE_MS)).toBe(true);
    expect(isBladeActive(1000, 1001 + BLADE_IDLE_MS)).toBe(false);
  });

  it('stays idle before the first movement or with a clock going backwards', () => {
    expect(isBladeActive(-Infinity, 1000)).toBe(false);
    expect(isBladeActive(Number.NaN, 1000)).toBe(false);
    expect(isBladeActive(2000, 1000)).toBe(false);
  });
});

describe('splitAlongCut', () => {
  const body = { x: 100, y: 200, vx: 30, vy: -400 };
  const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;

  it('returns two halves on opposite sides of the cut', () => {
    const [a, b] = splitAlongCut(body, 10, 0);
    expect(a.side).toBe(1);
    expect(b.side).toBe(-1);
    expect(a.cutAngle).toBeCloseTo(0);
    expect(b.cutAngle).toBeCloseTo(0);
  });

  it('pushes the halves apart perpendicular to the cut, with opposite velocities', () => {
    const cut = { dx: 3, dy: 4 };
    const [a, b] = splitAlongCut(body, cut.dx, cut.dy, 50);
    const da = { x: a.vx - body.vx, y: a.vy - body.vy };
    const db = { x: b.vx - body.vx, y: b.vy - body.vy };

    expect(dot(da.x, da.y, cut.dx, cut.dy)).toBeCloseTo(0);
    expect(dot(db.x, db.y, cut.dx, cut.dy)).toBeCloseTo(0);
    expect(da.x).toBeCloseTo(-db.x);
    expect(da.y).toBeCloseTo(-db.y);
    expect(Math.hypot(da.x, da.y)).toBeCloseTo(50);
  });

  it('follows the swipe direction for vertical cuts', () => {
    const [a] = splitAlongCut(body, 0, 10);
    expect(a.cutAngle).toBeCloseTo(Math.PI / 2);
    expect(a.vy).toBeCloseTo(body.vy);
    expect(a.vx).not.toBeCloseTo(body.vx);
  });

  it('falls back to a horizontal cut when the swipe has no length', () => {
    const [a, b] = splitAlongCut(body, 0, 0, 20);
    expect(a.cutAngle).toBe(0);
    expect(a.vy - body.vy).toBeCloseTo(20);
    expect(b.vy - body.vy).toBeCloseTo(-20);
  });
});

describe('planLaunch', () => {
  const apexOf = (vy: number, gravity = STAGE_GRAVITY) => (vy * vy) / (2 * gravity);

  it('peaks at the requested fraction of the stage height', () => {
    const plan = planLaunch({ startX: 100, targetX: 100, height: 500, apexFraction: 0.8 });
    expect(plan.vy).toBeLessThan(0);
    expect(apexOf(plan.vy)).toBeCloseTo(400);
  });

  it('scales with the stage so short screens still see the whole arc', () => {
    const short = planLaunch({ startX: 0, targetX: 0, height: 300, apexFraction: 0.9 });
    const tall = planLaunch({ startX: 0, targetX: 0, height: 900, apexFraction: 0.9 });
    expect(apexOf(short.vy)).toBeLessThan(300);
    expect(apexOf(tall.vy)).toBeLessThan(900);
    expect(Math.abs(tall.vy)).toBeGreaterThan(Math.abs(short.vy));
  });

  it('lands on the target x when it returns to the launch line', () => {
    const plan = planLaunch({ startX: 100, targetX: 700, height: 600, apexFraction: 0.6 });
    expect(100 + plan.vx * plan.flightTime).toBeCloseTo(700);
  });

  it('clamps invalid heights and fractions', () => {
    const zero = planLaunch({ startX: 0, targetX: 0, height: 0, apexFraction: 2 });
    expect(Number.isFinite(zero.vy)).toBe(true);
    expect(apexOf(zero.vy)).toBeLessThanOrEqual(1);
    const nan = planLaunch({ startX: 0, targetX: 0, height: Number.NaN, apexFraction: Number.NaN });
    expect(Number.isFinite(nan.vx)).toBe(true);
    expect(Number.isFinite(nan.vy)).toBe(true);
  });
});
