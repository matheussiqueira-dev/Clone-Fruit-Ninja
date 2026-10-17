import { describe, expect, it } from 'vitest';
import { createPointFilter, mapCoverPoint } from './handFilter';

describe('createPointFilter', () => {
  it('smooths jitter around a resting point', () => {
    const filter = createPointFilter();
    filter.filter({ x: 0.5, y: 0.5 }, 0);
    let maxDeviation = 0;
    for (let i = 1; i <= 60; i++) {
      const noise = i % 2 === 0 ? 0.01 : -0.01;
      const out = filter.filter({ x: 0.5 + noise, y: 0.5 - noise }, i * 33);
      maxDeviation = Math.max(maxDeviation, Math.abs(out.x - 0.5));
    }
    // Raw jitter is ±0.01; the filtered point moves far less.
    expect(maxDeviation).toBeLessThan(0.004);
  });

  it('follows a fast swipe closely', () => {
    const filter = createPointFilter();
    filter.filter({ x: 0.1, y: 0.5 }, 0);
    let out = { x: 0, y: 0 };
    for (let i = 1; i <= 8; i++) out = filter.filter({ x: 0.1 + i * 0.1, y: 0.5 }, i * 33);
    expect(out.x).toBeGreaterThan(0.75);
  });

  it('starts over after reset', () => {
    const filter = createPointFilter();
    filter.filter({ x: 0.1, y: 0.1 }, 0);
    filter.reset();
    expect(filter.filter({ x: 0.9, y: 0.9 }, 10)).toEqual({ x: 0.9, y: 0.9 });
  });
});

describe('mapCoverPoint', () => {
  it('is the identity when frame and stage share the aspect ratio', () => {
    const point = mapCoverPoint(
      { x: 0.25, y: 0.75 },
      { width: 1280, height: 720 },
      { width: 640, height: 360 }
    );
    expect(point.x).toBeCloseTo(0.25, 6);
    expect(point.y).toBeCloseTo(0.75, 6);
  });

  it('accounts for the cropped sides on a narrow stage', () => {
    // 16:9 frame on a square stage: the frame is scaled to the height and its sides are cut off.
    const stage = { width: 720, height: 720 };
    const frame = { width: 1280, height: 720 };
    expect(mapCoverPoint({ x: 0.5, y: 0.5 }, frame, stage).x).toBeCloseTo(0.5, 6);
    // A point at 25% of the frame lands left of the visible stage edge's 25%.
    expect(mapCoverPoint({ x: 0.25, y: 0.5 }, frame, stage).x).toBeLessThan(0.25);
    expect(mapCoverPoint({ x: 0.25, y: 0.5 }, frame, stage).y).toBeCloseTo(0.5, 6);
  });
});
