// Canvas renderer for the game engine state. Drawing only: no physics, no scoring.
import { BOMB_ART, CanvasTokens, FRUIT_ART, FruitKind } from '../../config/artPalette';
import { Fruit } from '../../types';
import { EngineState, FlyingHalf, SPLAT_LIFETIME } from '../../lib/engine/gameEngine';

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

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

export interface SceneOptions {
  width: number;
  height: number;
  tokens: CanvasTokens;
  landmarks?: Array<{ x: number; y: number }>;
  showSkeleton: boolean;
  showTrail: boolean;
  trailWidth: number;
}

// Draw order: juice underneath, then the hand, the blade, whole fruit, flying halves and drops on top.
export const renderScene = (ctx: CanvasRenderingContext2D, state: EngineState, options: SceneOptions) => {
  const { width, height, tokens } = options;
  ctx.clearRect(0, 0, width, height);

  state.splats.forEach((splat) => {
    ctx.globalAlpha = 0.3 * (1 - splat.age / SPLAT_LIFETIME);
    ctx.fillStyle = FRUIT_ART[splat.kind].flesh;
    ctx.beginPath();
    ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (options.showSkeleton && options.landmarks) {
    drawSkeleton(ctx, options.landmarks, width, height, tokens);
  }

  if (options.showTrail && state.trail.length > 1) {
    drawBlade(ctx, state.trail, tokens.blade, options.trailWidth);
  }

  state.fruits.forEach((fruit) => {
    if (fruit.type === 'bomb') drawBomb(ctx, fruit, tokens);
    else drawFruit(ctx, fruit);
  });

  state.halves.forEach((half) => drawHalf(ctx, half));

  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};
