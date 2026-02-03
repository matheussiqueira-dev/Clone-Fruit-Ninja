import { describe, expect, it } from 'vitest';
import {
  BASE_SPAWN_FRAMES,
  COMBO_TIMEOUT,
  COMBO_WINDOW,
  MAX_COMBO,
  MIN_SPAWN_FRAMES,
  TARGET_FPS,
  applyMiss,
  distanceToSegmentSq,
  getBombChance,
  getSpawnInterval,
  getSpeedMultiplier,
  shouldResetCombo,
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

  it('caps bomb chance at max', () => {
    expect(getBombChance(0)).toBeCloseTo(0.12, 4);
    expect(getBombChance(1000)).toBeCloseTo(0.22, 4);
  });

  it('scales speed multiplier with score', () => {
    expect(getSpeedMultiplier(0)).toBeCloseTo(1, 6);
    expect(getSpeedMultiplier(120)).toBeCloseTo(1.35, 6);
    expect(getSpeedMultiplier(240)).toBeCloseTo(1.35, 6);
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
