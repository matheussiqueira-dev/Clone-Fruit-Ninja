// Canvas renderer for the game engine state. Drawing only: no physics, no scoring.
import { ArtKind, CanvasTokens, EMOJI_FONT_STACK, artFor } from '../../config/artPalette';
import { Fruit } from '../../types';
import { EngineState, FlyingHalf, Popup, SPLAT_LIFETIME } from '../../lib/engine/gameEngine';

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17]
];

// Emoji glyphs are rasterised once per kind and size, then blitted: fillText every frame is slow.
const spriteCache = new Map<string, HTMLCanvasElement>();
const SPRITE_PADDING = 1.25;

const getSprite = (kind: ArtKind, radius: number, scale: number): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;
  const bucket = Math.max(8, Math.round(radius / 2) * 2);
  const key = `${kind}:${bucket}:${scale}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const size = Math.ceil(bucket * 2 * SPRITE_PADDING * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Emoji glyphs fill about 85% of their em box: size the font so the art covers the hit circle.
  ctx.font = `${Math.round(bucket * 2.3 * scale)}px ${EMOJI_FONT_STACK}`;
  ctx.fillText(artFor(kind).emoji, size / 2, size / 2 + bucket * 0.08 * scale);
  spriteCache.set(key, canvas);
  return canvas;
};

const drawSprite = (ctx: CanvasRenderingContext2D, kind: ArtKind, radius: number, scale: number) => {
  const sprite = getSprite(kind, radius, scale);
  const extent = radius * SPRITE_PADDING;
  if (sprite) {
    ctx.drawImage(sprite, -extent, -extent, extent * 2, extent * 2);
    return;
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = artFor(kind).flesh;
  ctx.fill();
};

const drawTarget = (
  ctx: CanvasRenderingContext2D,
  fruit: Fruit,
  tokens: CanvasTokens,
  scale: number,
  now: number
) => {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  if (fruit.type === 'bomb') {
    // Pulsing alert ring: a bomb must read as "do not cut" at a glance.
    const pulse = 0.5 + 0.5 * Math.sin(now / 140);
    ctx.beginPath();
    ctx.arc(0, 0, fruit.radius + 8 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = tokens.alert;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  } else if (fruit.type === 'life') {
    const pulse = 0.5 + 0.5 * Math.sin(now / 180);
    ctx.beginPath();
    ctx.arc(0, 0, fruit.radius + 10 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = tokens.success;
    ctx.globalAlpha = 0.18 + pulse * 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.rotate(fruit.rotation);
  drawSprite(ctx, fruit.kind, fruit.radius, scale);
  ctx.restore();
};

// A half is the emoji clipped to its side of the cut line, with the juicy cut face along the line.
const drawHalf = (ctx: CanvasRenderingContext2D, half: FlyingHalf, scale: number) => {
  const art = artFor(half.kind);
  const start = half.side === 1 ? half.cutAngle : half.cutAngle + Math.PI;
  // Spin around the half's own centre of mass (4r/3π from the cut, along its normal), so the
  // pieces tumble apart instead of pivoting on the old centre of the whole fruit.
  const centroid = (4 * half.radius) / (3 * Math.PI);
  const cx = -Math.sin(half.cutAngle) * half.side * centroid;
  const cy = Math.cos(half.cutAngle) * half.side * centroid;
  const extent = half.radius * SPRITE_PADDING;
  ctx.save();
  ctx.translate(half.x + cx, half.y + cy);
  ctx.rotate(half.rotation);
  ctx.translate(-cx, -cy);

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, extent, start, start + Math.PI);
  ctx.closePath();
  ctx.clip();
  drawSprite(ctx, half.kind, half.radius, scale);
  ctx.restore();

  // Cut face.
  ctx.beginPath();
  ctx.moveTo(Math.cos(start) * half.radius * 0.8, Math.sin(start) * half.radius * 0.8);
  ctx.lineTo(Math.cos(start + Math.PI) * half.radius * 0.8, Math.sin(start + Math.PI) * half.radius * 0.8);
  ctx.strokeStyle = art.flesh;
  ctx.lineWidth = Math.max(3, half.radius * 0.14);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
};

// Brush stroke: thin at the tail, full width at the tip, and thinner the faster the swipe.
const drawBlade = (
  ctx: CanvasRenderingContext2D,
  trail: Array<{ x: number; y: number }>,
  color: string,
  maxWidth: number
) => {
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

const POPUP_COLORS: Record<Popup['tone'], string> = {
  score: '#ffffff',
  bonus: '#ffd166',
  life: '#ff9ccf',
  danger: '#ff8f70',
  info: '#ffffff'
};
const CUTTING_COLOR = '#ffd166';

const drawPopup = (ctx: CanvasRenderingContext2D, popup: Popup, tokens: CanvasTokens) => {
  const progress = popup.age / popup.lifetime;
  // Pop in, hold, fade out.
  const grow = Math.min(1, popup.age / 0.12);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - Math.max(0, progress - 0.55) / 0.45);
  ctx.translate(popup.x, popup.y);
  ctx.scale(0.7 + 0.3 * grow, 0.7 + 0.3 * grow);
  ctx.font = `700 ${popup.size}px "IBM Plex Sans Variable", system-ui, sans-serif, ${EMOJI_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, popup.size * 0.18);
  ctx.strokeStyle = tokens.halo;
  ctx.strokeText(popup.text, 0, 0);
  ctx.fillStyle = POPUP_COLORS[popup.tone];
  ctx.fillText(popup.text, 0, 0);
  ctx.restore();
};

// Fingertip marker: always visible, so the player knows where the blade is before swiping.
// Hollow while hovering, filled while the blade is fast enough to cut.
const drawCursor = (
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  cutting: boolean,
  tokens: CanvasTokens
) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, cutting ? 9 : 13, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = tokens.halo;
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = cutting ? CUTTING_COLOR : tokens.blade;
  ctx.stroke();
  if (cutting) {
    ctx.fillStyle = CUTTING_COLOR;
    ctx.fill();
  }
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
  // Blade position in stage pixels (null when no hand or pointer is on the stage).
  cursor: { x: number; y: number } | null;
  showCursor: boolean;
  // Full-screen flashes after a bomb or a heart; off for reduced motion.
  flashes: boolean;
  now: number;
}

// Draw order: juice underneath, then the hand, whole targets, flying halves, drops, the blade and text on top.
export const renderScene = (ctx: CanvasRenderingContext2D, state: EngineState, options: SceneOptions) => {
  const { width, height, tokens, now } = options;
  const scale = Math.min(3, Math.max(1, Math.round(ctx.getTransform().a)));
  ctx.clearRect(0, 0, width, height);

  state.splats.forEach((splat) => {
    ctx.globalAlpha = 0.35 * (1 - splat.age / SPLAT_LIFETIME);
    ctx.fillStyle = artFor(splat.kind).flesh;
    ctx.beginPath();
    ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (options.showSkeleton && options.landmarks) {
    drawSkeleton(ctx, options.landmarks, width, height, tokens);
  }

  state.fruits.forEach((fruit) => drawTarget(ctx, fruit, tokens, scale, now));
  state.halves.forEach((half) => drawHalf(ctx, half, scale));

  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (options.showTrail && state.trail.length > 1) {
    drawBlade(ctx, state.trail, state.bladeCutting ? CUTTING_COLOR : tokens.blade, options.trailWidth);
  }
  if (options.showCursor && options.cursor) {
    drawCursor(ctx, options.cursor, state.bladeCutting, tokens);
  }

  state.popups.forEach((popup) => drawPopup(ctx, popup, tokens));

  if (options.flashes && (state.dangerFlash > 0 || state.lifeFlash > 0)) {
    const danger = state.dangerFlash >= state.lifeFlash;
    ctx.globalAlpha = 0.25 * (danger ? state.dangerFlash : state.lifeFlash);
    ctx.fillStyle = danger ? tokens.alert : tokens.success;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
};
