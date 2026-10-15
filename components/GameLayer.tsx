import React, { useEffect, useRef } from 'react';
import { GameOverReason, GameSettings, GameState, GameStats, VisionResult } from '../types';
import { readCanvasTokens } from '../config/artPalette';
import { createGameEngine, GameEngine } from '../lib/engine/gameEngine';
import { createSeededRng } from '../lib/engine/rng';
import { renderScene } from './game/renderScene';

interface GameLayerProps {
  handPositionRef: React.MutableRefObject<VisionResult | null>;
  gameState: GameState;
  settings: GameSettings;
  // Freezes the round (settings open): no physics, no cutting.
  paused: boolean;
  // Reduced motion (A.7): no blade trail and no particles.
  reducedMotion: boolean;
  // Seed for a reproducible round (daily challenge); null plays a random round.
  seed: number | null;
  maxLives: number;
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  onGameOver: (finalStats: GameStats, reason: GameOverReason) => void;
  width: number;
  height: number;
}

const TRAIL_LIMIT = 14;
const TRAIL_LIMIT_LOW_VFX = 8;

// React shell around the pure engine (lib/engine): owns the canvas and the frame loop,
// feeds the engine time and blade input, and hands its state to the renderer.
const GameLayer: React.FC<GameLayerProps> = ({
  handPositionRef,
  gameState,
  settings,
  paused,
  reducedMotion,
  seed,
  maxLives,
  onStatsUpdate,
  onGameOver,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  const effectsEnabled = !settings.lowVfx && !reducedMotion;
  const trailLimit = settings.lowVfx ? TRAIL_LIMIT_LOW_VFX : TRAIL_LIMIT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (width <= 0 || height <= 0) {
      // Outside a round the stage can be a long scrolling page: release the backing store.
      canvas.width = 0;
      canvas.height = 0;
      ctxRef.current = null;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    engineRef.current?.resize(width, height);
  }, [width, height]);

  // A new engine per round: fresh state, and a seeded generator for the daily challenge.
  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      engineRef.current = null;
      return;
    }
    engineRef.current = createGameEngine({
      width,
      height,
      maxLives,
      rng: seed === null ? Math.random : createSeededRng(seed),
      particles: effectsEnabled,
      trailLimit
    });
    lastFrameRef.current = null;
    onStatsUpdate({ ...engineRef.current.stats });
    // Only a new round (or seed) recreates the engine; size and effects are pushed in below.
  }, [gameState, seed, maxLives, onStatsUpdate]);

  useEffect(() => {
    engineRef.current?.setOptions({ particles: effectsEnabled, trailLimit });
  }, [effectsEnabled, trailLimit]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const engine = engineRef.current;
    if (!ctx) return;
    if (gameState !== GameState.PLAYING || !engine) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    if (paused) {
      // Keep the last frame on screen; on resume the clock and the blade start fresh.
      lastFrameRef.current = null;
      engine.breakStroke();
      return;
    }

    const tokens = readCanvasTokens();

    const loop = () => {
      const now = performance.now();
      const delta = lastFrameRef.current === null ? 0 : (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      const hand = handPositionRef.current;
      const blade = hand ? { x: hand.x * width, y: hand.y * height } : null;
      const result = engine.step(delta, now, blade);

      renderScene(ctx, engine.state, {
        width,
        height,
        tokens,
        landmarks: hand?.landmarks,
        showSkeleton: settings.showHandSkeleton,
        showTrail: settings.showTrail && !reducedMotion,
        trailWidth: settings.lowVfx ? 6 : 9
      });

      if (result.stats) onStatsUpdate(result.stats);
      if (result.gameOver) {
        onGameOver({ ...engine.stats }, result.gameOver);
        return;
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, paused, reducedMotion, width, height, settings, handPositionRef, onStatsUpdate, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  );
};

export default GameLayer;
