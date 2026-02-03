import React, { useEffect, useRef } from 'react';
import { VisionResult, GameState, Fruit, Particle, GameSettings, GameStats } from '../types';
import {
  TARGET_FPS,
  applyMiss,
  distanceToSegmentSq,
  getBombChance,
  getSpawnInterval,
  getSpeedMultiplier,
  shouldResetCombo,
  updateComboOnSlice
} from '../lib/gameLogic';

interface GameLayerProps {
  handPositionRef: React.MutableRefObject<VisionResult | null>;
  gameState: GameState;
  settings: GameSettings;
  maxLives: number;
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  onGameOver: (finalScore: number) => void;
  width: number;
  height: number;
}

const GRAVITY = 30; // px/s^2
const PARTICLE_GRAVITY = 12; // px/s^2
const PARTICLE_FADE = 1.2; // life per second
const MAX_DELTA = 0.05;

const COLORS = {
  APPLE: '#F97316',
  ORANGE: '#FDBA74',
  WATERMELON: '#34D399',
  BOMB: '#0B1220',
  TRAIL: '#F8FAFC',
  PARTICLE_FRUIT: '#FDE68A',
  PARTICLE_BOMB: '#64748B'
};

const FRUIT_COLORS = [COLORS.APPLE, COLORS.ORANGE, COLORS.WATERMELON];

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

const GameLayer: React.FC<GameLayerProps> = ({
  handPositionRef,
  gameState,
  settings,
  maxLives,
  onStatsUpdate,
  onGameOver,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{x: number; y: number}[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const slicedRef = useRef(0);
  const missedRef = useRef(0);
  const livesRef = useRef(maxLives);
  const spawnAccumulatorRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastSliceTimeRef = useRef<number>(-Infinity);
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
  }, [width, height]);

  const resetGame = () => {
    fruitsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
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

    const spawnFruit = () => {
      const score = scoreRef.current;
      const speedMultiplier = getSpeedMultiplier(score);
      const isBomb = Math.random() < getBombChance(score);
      const radius = isBomb ? 38 : 30 + Math.random() * 18;
      const x = Math.random() * (width - 100) + 50;

      fruitsRef.current.push({
        id: createId(),
        x,
        y: height + radius,
        vx: (Math.random() - 0.5) * (width * 0.016) * TARGET_FPS * speedMultiplier,
        vy: -(Math.random() * 8 + 14) * TARGET_FPS * speedMultiplier,
        radius,
        color: isBomb ? COLORS.BOMB : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
        type: isBomb ? 'bomb' : 'fruit',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.18 * TARGET_FPS,
        sliced: false
      });
    };

    const createExplosion = (x: number, y: number, color: string, count = 10) => {
      if (settings.lowVfx) {
        count = Math.max(4, Math.floor(count * 0.6));
      }
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
          size: Math.random() * 5 + 2
        });
      }
    };

    const loop = () => {
      const now = performance.now();
      const lastFrame = lastFrameRef.current ?? now;
      const delta = Math.min((now - lastFrame) / 1000, MAX_DELTA);
      lastFrameRef.current = now;

      if (gameState !== GameState.PLAYING) {
        if (gameState === GameState.MENU || gameState === GameState.GAME_OVER || gameState === GameState.LOADING) {
          ctx.clearRect(0, 0, width, height);
        }
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const handPosition = handPositionRef.current;

      if (settings.showHandSkeleton && handPosition?.landmarks) {
        const lms = handPosition.landmarks;
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        HAND_CONNECTIONS.forEach(([start, end]) => {
          const p1 = lms[start];
          const p2 = lms[end];
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
        });
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38BDF8';
        lms.forEach((lm) => {
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      if (handPosition) {
        const screenX = handPosition.x * width;
        const screenY = handPosition.y * height;
        const lastPoint = trailRef.current[trailRef.current.length - 1];
        const shouldAdd = !lastPoint
          || Math.abs(lastPoint.x - screenX) > 1
          || Math.abs(lastPoint.y - screenY) > 1;
        if (shouldAdd) {
          trailRef.current.push({ x: screenX, y: screenY });
        }
        const trailLimit = settings.lowVfx ? 8 : 14;
        if (trailRef.current.length > trailLimit) {
          trailRef.current.splice(0, trailRef.current.length - trailLimit);
        }
      } else if (trailRef.current.length > 0) {
        trailRef.current.shift();
      }

      if (settings.showTrail && trailRef.current.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
          const point = trailRef.current[i];
          const prev = trailRef.current[i - 1];
          const midX = (prev.x + point.x) / 2;
          const midY = (prev.y + point.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.lineTo(
          trailRef.current[trailRef.current.length - 1].x,
          trailRef.current[trailRef.current.length - 1].y
        );
        ctx.strokeStyle = COLORS.TRAIL;
        ctx.lineWidth = settings.lowVfx ? 6 : 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#38BDF8';
        ctx.stroke();
        ctx.restore();
      }

      if (comboRef.current > 0 && shouldResetCombo(now, lastSliceTimeRef.current)) {
        comboRef.current = 0;
        onStatsUpdate({ combo: 0 });
      }

      spawnAccumulatorRef.current += delta;
      const spawnInterval = getSpawnInterval(scoreRef.current);
      while (spawnAccumulatorRef.current >= spawnInterval) {
        spawnFruit();
        spawnAccumulatorRef.current -= spawnInterval;
      }

      const cutterTip = trailRef.current[trailRef.current.length - 1];
      const cutterPrev = trailRef.current[trailRef.current.length - 2];

      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];
        fruit.x += fruit.vx * delta;
        fruit.y += fruit.vy * delta;
        fruit.vy += GRAVITY * delta;
        fruit.rotation += fruit.rotationSpeed * delta;

        let hit = false;
        if (cutterTip && cutterPrev && !fruit.sliced) {
          const hitRadius = fruit.radius + 10;
          const distSq = distanceToSegmentSq(
            fruit.x,
            fruit.y,
            cutterPrev.x,
            cutterPrev.y,
            cutterTip.x,
            cutterTip.y
          );
          if (distSq < hitRadius * hitRadius) {
            hit = true;
          }
        }

        if (hit) {
          if (fruit.type === 'bomb') {
            createExplosion(fruit.x, fruit.y, COLORS.PARTICLE_BOMB, 30);
            onGameOver(scoreRef.current);
            return;
          }

          fruit.sliced = true;
          createExplosion(fruit.x, fruit.y, COLORS.PARTICLE_FRUIT, 14);

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
              onGameOver(scoreRef.current);
              return;
            }
          }
          continue;
        }

        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
        ctx.fillStyle = fruit.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-fruit.radius / 3, -fruit.radius / 3, fruit.radius / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();
        ctx.restore();
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
  }, [gameState, width, height, settings, onStatsUpdate, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
    />
  );
};

export default GameLayer;
