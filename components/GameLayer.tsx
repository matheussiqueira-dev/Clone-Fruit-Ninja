import React, { useEffect, useRef } from 'react';
import { VisionResult, GameState, Fruit, Particle, GameSettings, GameStats, GameOverReason } from '../types';
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
} from '../lib/gameLogic';
import {
  BOMB_ART,
  CanvasTokens,
  FRUIT_ART,
  FRUIT_KINDS,
  FruitKind,
  readCanvasTokens
} from '../config/artPalette';

interface GameLayerProps {
  handPositionRef: React.MutableRefObject<VisionResult | null>;
  gameState: GameState;
  settings: GameSettings;
  // Freezes the round (settings open): no physics, no cutting.
  paused: boolean;
  // Reduced motion (A.7): no blade trail and no particles.
  reducedMotion: boolean;
  maxLives: number;
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  onGameOver: (finalScore: number, reason: GameOverReason) => void;
  width: number;
  height: number;
}

interface FlyingHalf extends SplitHalf {
  kind: FruitKind;
  radius: number;
  rotation: number;
  rotationSpeed: number;
}

interface JuiceSplat {
  x: number;
  y: number;
  radius: number;
  color: string;
  age: number;
}

const HALF_GRAVITY = STAGE_GRAVITY * 1.2; // halves drop a bit faster so they never hide new fruit
const PARTICLE_GRAVITY = 12; // px/s^2
const PARTICLE_FADE = 1.2; // life per second
const SPLAT_LIFETIME = 1.5; // seconds until a juice splat has dried
const MAX_DELTA = 0.05;
const TRAIL_LIMIT = 14;
const TRAIL_LIMIT_LOW_VFX = 8;
// A jump this large between two samples is a new stroke (hand re-acquired, new touch), never a cut.
const STROKE_BREAK_FRACTION = 0.25;

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const drawFruit = (ctx: CanvasRenderingContext2D, fruit: Fruit) => {
  const art = FRUIT_ART[fruit.kind as FruitKind];
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = art.skin;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -fruit.radius);
  ctx.lineTo(fruit.radius * 0.12, -fruit.radius * 1.28);
  ctx.strokeStyle = art.stem;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
};

const drawBomb = (ctx: CanvasRenderingContext2D, bomb: Fruit, tokens: CanvasTokens) => {
  ctx.save();
  ctx.translate(bomb.x, bomb.y);
  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius + 7, 0, Math.PI * 2);
  ctx.strokeStyle = tokens.alert;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(bomb.rotation);
  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
  ctx.fillStyle = BOMB_ART.body;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-bomb.radius * 0.35, -bomb.radius * 0.35, bomb.radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = BOMB_ART.highlight;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -bomb.radius);
  ctx.quadraticCurveTo(bomb.radius * 0.3, -bomb.radius * 1.45, bomb.radius * 0.55, -bomb.radius * 1.3);
  ctx.strokeStyle = BOMB_ART.fuse;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bomb.radius * 0.55, -bomb.radius * 1.3, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = BOMB_ART.spark;
  ctx.fill();
  ctx.restore();
};

// A half is the semicircle on its side of the cut line, with the flesh showing on the cut face.
const drawHalf = (ctx: CanvasRenderingContext2D, half: FlyingHalf) => {
  const art = FRUIT_ART[half.kind];
  const start = half.side === 1 ? half.cutAngle : half.cutAngle + Math.PI;
  // Spin around the half's own centre of mass (4r/3π from the cut, along its normal), so the
  // pieces tumble apart instead of pivoting on the old centre of the whole fruit.
  const centroid = (4 * half.radius) / (3 * Math.PI);
  const cx = -Math.sin(half.cutAngle) * half.side * centroid;
  const cy = Math.cos(half.cutAngle) * half.side * centroid;
  ctx.save();
  ctx.translate(half.x + cx, half.y + cy);
  ctx.rotate(half.rotation);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.arc(0, 0, half.radius, start, start + Math.PI);
  ctx.closePath();
  ctx.fillStyle = art.skin;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, half.radius * 0.8, start, start + Math.PI);
  ctx.closePath();
  ctx.fillStyle = art.flesh;
  ctx.fill();
  ctx.restore();
};

// Brush stroke: thin at the tail, full width at the tip, and thinner the faster the swipe.
const drawBlade = (ctx: CanvasRenderingContext2D, trail: Array<{ x: number; y: number }>, color: string, maxWidth: number) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1];
    const point = trail[i];
    const segment = Math.hypot(point.x - prev.x, point.y - prev.y);
    const speedFactor = Math.max(0.6, 1 - segment / 160);
    ctx.lineWidth = Math.max(2, maxWidth * (0.25 + 0.75 * (i / (trail.length - 1))) * speedFactor);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawSkeleton = (
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  tokens: CanvasTokens
) => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = new Path2D();
  HAND_CONNECTIONS.forEach(([start, end]) => {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    if (!p1 || !p2) return;
    path.moveTo(p1.x * width, p1.y * height);
    path.lineTo(p2.x * width, p2.y * height);
  });
  // Halo first so the marks stay readable over any camera frame.
  ctx.strokeStyle = tokens.halo;
  ctx.lineWidth = 4;
  ctx.stroke(path);
  ctx.strokeStyle = tokens.skeleton;
  ctx.lineWidth = 2;
  ctx.stroke(path);

  ctx.fillStyle = tokens.skeleton;
  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

const GameLayer: React.FC<GameLayerProps> = ({
  handPositionRef,
  gameState,
  settings,
  paused,
  reducedMotion,
  maxLives,
  onStatsUpdate,
  onGameOver,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const fruitsRef = useRef<Fruit[]>([]);
  const halvesRef = useRef<FlyingHalf[]>([]);
  const splatsRef = useRef<JuiceSplat[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{x: number; y: number}[]>([]);
  const lastMoveAtRef = useRef<number>(-Infinity);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const slicedRef = useRef(0);
  const missedRef = useRef(0);
  const livesRef = useRef(maxLives);
  const spawnAccumulatorRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastSliceTimeRef = useRef<number>(-Infinity);
  const requestRef = useRef<number | null>(null);

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
  }, [width, height]);

  const resetGame = () => {
    fruitsRef.current = [];
    halvesRef.current = [];
    splatsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    lastMoveAtRef.current = -Infinity;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    slicedRef.current = 0;
    missedRef.current = 0;
    livesRef.current = maxLives;
    spawnAccumulatorRef.current = 0;
    lastFrameRef.current = null;
    lastSliceTimeRef.current = -Infinity;
    onStatsUpdate({
      score: 0,
      combo: 0,
      maxCombo: 0,
      sliced: 0,
      missed: 0,
      lives: maxLives
    });
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      resetGame();
    }
  }, [gameState, maxLives, onStatsUpdate]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (gameState !== GameState.PLAYING) {
      ctx.clearRect(0, 0, width, height);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
    if (paused) {
      // Keep the last frame on screen; on resume the clock and the blade start fresh.
      lastFrameRef.current = null;
      trailRef.current = [];
      lastMoveAtRef.current = -Infinity;
      return;
    }

    const tokens = readCanvasTokens();

    const spawnFruit = () => {
      const score = scoreRef.current;
      const isBomb = Math.random() < getBombChance(score);
      const radius = isBomb ? 34 : 30 + Math.random() * 18;
      const margin = Math.min(width / 2, 50 + radius);
      const x = margin + Math.random() * Math.max(1, width - margin * 2);
      const targetX = margin + Math.random() * Math.max(1, width - margin * 2);
      const kind = isBomb ? 'bomb' : FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
      const launch = planLaunch({
        startX: x,
        targetX,
        height: height + radius,
        apexFraction: 0.55 + Math.random() * 0.4
      });

      fruitsRef.current.push({
        id: createId(),
        x,
        y: height + radius,
        vx: launch.vx,
        vy: launch.vy,
        radius,
        kind,
        type: isBomb ? 'bomb' : 'fruit',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.18 * TARGET_FPS,
        // Difficulty speeds the whole arc up instead of throwing fruit off the top of the stage.
        timeScale: getSpeedMultiplier(score),
        sliced: false
      });
    };

    const createDrops = (x: number, y: number, color: string, count: number) => {
      if (settings.lowVfx || reducedMotion) return;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5 + 2) * TARGET_FPS;
        particlesRef.current.push({
          id: createId(),
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life: 1.0,
          size: Math.random() * 4 + 2
        });
      }
    };

    const loop = () => {
      const now = performance.now();
      const lastFrame = lastFrameRef.current ?? now;
      const delta = Math.min((now - lastFrame) / 1000, MAX_DELTA);
      lastFrameRef.current = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = splatsRef.current.length - 1; i >= 0; i--) {
        const splat = splatsRef.current[i];
        splat.age += delta;
        if (splat.age >= SPLAT_LIFETIME) {
          splatsRef.current.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 0.3 * (1 - splat.age / SPLAT_LIFETIME);
        ctx.fillStyle = splat.color;
        ctx.beginPath();
        ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const handPosition = handPositionRef.current;

      if (settings.showHandSkeleton && handPosition?.landmarks) {
        drawSkeleton(ctx, handPosition.landmarks, width, height, tokens);
      }

      if (!handPosition) {
        // Hand lost or touch lifted: the next sample starts a new stroke.
        trailRef.current = [];
      } else {
        const screenX = handPosition.x * width;
        const screenY = handPosition.y * height;
        const lastPoint = trailRef.current[trailRef.current.length - 1];
        const jump = lastPoint ? Math.hypot(lastPoint.x - screenX, lastPoint.y - screenY) : 0;
        if (!lastPoint || jump > Math.hypot(width, height) * STROKE_BREAK_FRACTION) {
          trailRef.current = [{ x: screenX, y: screenY }];
        } else if (jump >= MIN_BLADE_SEGMENT_PX) {
          trailRef.current.push({ x: screenX, y: screenY });
          lastMoveAtRef.current = now;
        }
        const trailLimit = settings.lowVfx ? TRAIL_LIMIT_LOW_VFX : TRAIL_LIMIT;
        if (trailRef.current.length > trailLimit) {
          trailRef.current.splice(0, trailRef.current.length - trailLimit);
        }
      }

      const bladeActive = handPosition !== null && isBladeActive(lastMoveAtRef.current, now);
      if (!bladeActive && trailRef.current.length > 1) {
        // A resting blade fades out instead of hanging in place.
        trailRef.current.shift();
      }

      if (settings.showTrail && !reducedMotion && trailRef.current.length > 1) {
        drawBlade(ctx, trailRef.current, tokens.blade, settings.lowVfx ? 6 : 9);
      }

      if (comboRef.current > 0 && shouldResetCombo(now, lastSliceTimeRef.current)) {
        comboRef.current = 0;
        onStatsUpdate({ combo: 0 });
      }

      spawnAccumulatorRef.current += delta;
      const spawnInterval = getSpawnInterval(scoreRef.current);
      let spawned = 0;
      while (spawnAccumulatorRef.current >= spawnInterval && spawned < 4) {
        spawnFruit();
        spawnAccumulatorRef.current -= spawnInterval;
        spawned += 1;
      }

      const cutterTip = trailRef.current[trailRef.current.length - 1];
      const cutterPrev = trailRef.current[trailRef.current.length - 2];
      const canCut = bladeActive && cutterTip !== undefined && cutterPrev !== undefined;

      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];
        const step = delta * fruit.timeScale;
        fruit.x += fruit.vx * step;
        fruit.y += fruit.vy * step;
        fruit.vy += STAGE_GRAVITY * step;
        fruit.rotation += fruit.rotationSpeed * step;

        let hit = false;
        if (canCut && !fruit.sliced) {
          const hitRadius = fruit.radius + 10;
          const distSq = distanceToSegmentSq(
            fruit.x,
            fruit.y,
            cutterPrev.x,
            cutterPrev.y,
            cutterTip.x,
            cutterTip.y
          );
          hit = distSq < hitRadius * hitRadius;
        }

        if (hit) {
          if (fruit.type === 'bomb') {
            onGameOver(scoreRef.current, 'bomb');
            return;
          }

          const kind = fruit.kind as FruitKind;
          fruit.sliced = true;
          const [first, second] = splitAlongCut(fruit, cutterTip.x - cutterPrev.x, cutterTip.y - cutterPrev.y, 220);
          [first, second].forEach((half) => {
            halvesRef.current.push({
              ...half,
              kind,
              radius: fruit.radius,
              rotation: 0,
              rotationSpeed: half.side * 1.4
            });
          });
          splatsRef.current.push({
            x: fruit.x,
            y: fruit.y,
            radius: fruit.radius * 1.15,
            color: FRUIT_ART[kind].flesh,
            age: 0
          });
          createDrops(fruit.x, fruit.y, FRUIT_ART[kind].flesh, 10);

          const comboUpdate = updateComboOnSlice({
            combo: comboRef.current,
            maxCombo: maxComboRef.current,
            lastSliceTime: lastSliceTimeRef.current,
            now
          });
          comboRef.current = comboUpdate.combo;
          maxComboRef.current = comboUpdate.maxCombo;
          lastSliceTimeRef.current = comboUpdate.lastSliceTime;

          scoreRef.current += comboUpdate.scoreDelta;
          slicedRef.current += 1;

          onStatsUpdate({
            score: scoreRef.current,
            combo: comboRef.current,
            maxCombo: maxComboRef.current,
            sliced: slicedRef.current
          });

          fruitsRef.current.splice(i, 1);
          continue;
        }

        if (fruit.y > height + fruit.radius + 60) {
          fruitsRef.current.splice(i, 1);
          if (fruit.type === 'fruit') {
            missedRef.current += 1;
            const missResult = applyMiss(livesRef.current);
            livesRef.current = missResult.lives;
            onStatsUpdate({ missed: missedRef.current, lives: missResult.lives });
            if (missResult.gameOver) {
              onGameOver(scoreRef.current, 'lives');
              return;
            }
          }
          continue;
        }

        if (fruit.type === 'bomb') {
          drawBomb(ctx, fruit, tokens);
        } else {
          drawFruit(ctx, fruit);
        }
      }

      for (let i = halvesRef.current.length - 1; i >= 0; i--) {
        const half = halvesRef.current[i];
        half.x += half.vx * delta;
        half.y += half.vy * delta;
        half.vy += HALF_GRAVITY * delta;
        half.rotation += half.rotationSpeed * delta;
        if (half.y > height + half.radius * 2) {
          halvesRef.current.splice(i, 1);
          continue;
        }
        drawHalf(ctx, half);
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += PARTICLE_GRAVITY * delta;
        p.life -= PARTICLE_FADE * delta;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, paused, reducedMotion, width, height, settings, onStatsUpdate, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  );
};

export default GameLayer;
