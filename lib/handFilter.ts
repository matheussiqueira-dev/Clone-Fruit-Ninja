// Fingertip signal conditioning for camera play: jitter filtering, short-dropout bridging and the
// mapping from camera-frame coordinates to the stage the player sees. Pure functions, no DOM.
import { Point } from '../types';

// One Euro filter (Casiez et al., 2012): heavy smoothing while the hand is almost still (kills the
// jitter that made a resting hand look like a slow swipe), almost none during a fast swipe (no lag).
export interface OneEuroOptions {
  minCutoff: number; // Hz; lower = smoother at rest
  beta: number; // speed coefficient; higher = less lag when moving fast
  derivativeCutoff: number; // Hz
}

export const DEFAULT_ONE_EURO: OneEuroOptions = { minCutoff: 1.2, beta: 9, derivativeCutoff: 1 };

const smoothingFactor = (cutoff: number, elapsedSeconds: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / elapsedSeconds);
};

export interface PointFilter {
  filter: (point: Point, timeMs: number) => Point;
  reset: () => void;
}

export const createPointFilter = (options: OneEuroOptions = DEFAULT_ONE_EURO): PointFilter => {
  let last: Point | null = null;
  let lastDerivative: Point = { x: 0, y: 0 };
  let lastTime = 0;

  return {
    filter: (point, timeMs) => {
      if (!last || !Number.isFinite(timeMs)) {
        last = { ...point };
        lastDerivative = { x: 0, y: 0 };
        lastTime = Number.isFinite(timeMs) ? timeMs : 0;
        return { ...last };
      }
      // Same timestamp twice (duplicate frame): treat as 1 ms apart rather than dividing by zero.
      const elapsed = Math.min(0.25, Math.max(0.001, (timeMs - lastTime) / 1000));
      lastTime = timeMs;

      const derivative = { x: (point.x - last.x) / elapsed, y: (point.y - last.y) / elapsed };
      const dAlpha = smoothingFactor(options.derivativeCutoff, elapsed);
      lastDerivative = {
        x: lastDerivative.x + dAlpha * (derivative.x - lastDerivative.x),
        y: lastDerivative.y + dAlpha * (derivative.y - lastDerivative.y)
      };
      const speed = Math.hypot(lastDerivative.x, lastDerivative.y);
      const alpha = smoothingFactor(options.minCutoff + options.beta * speed, elapsed);
      last = { x: last.x + alpha * (point.x - last.x), y: last.y + alpha * (point.y - last.y) };
      return { ...last };
    },
    reset: () => {
      last = null;
      lastDerivative = { x: 0, y: 0 };
      lastTime = 0;
    }
  };
};

// The camera frame is shown with `object-fit: cover`, so part of it is cropped. Landmarks are
// normalised to the frame; this maps them to the visible stage, so the blade sits on the hand.
export const mapCoverPoint = (
  point: Point,
  frame: { width: number; height: number },
  stage: { width: number; height: number }
): Point => {
  if (frame.width <= 0 || frame.height <= 0 || stage.width <= 0 || stage.height <= 0) return point;
  const scale = Math.max(stage.width / frame.width, stage.height / frame.height);
  const shownWidth = frame.width * scale;
  const shownHeight = frame.height * scale;
  return {
    x: ((stage.width - shownWidth) / 2 + point.x * shownWidth) / stage.width,
    y: ((stage.height - shownHeight) / 2 + point.y * shownHeight) / stage.height
  };
};

// A hand can vanish for a frame or two mid-swipe (motion blur). Keep the last position this long
// before reporting "no hand", so one missed frame never breaks a stroke.
export const HAND_LOST_GRACE_MS = 220;
