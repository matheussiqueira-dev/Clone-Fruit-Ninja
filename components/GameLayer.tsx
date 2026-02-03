import React, { useEffect, useRef } from 'react';
import { VisionResult, GameState, Fruit, Particle } from '../types';

interface GameLayerProps {
  handPositionRef: React.MutableRefObject<VisionResult | null>;
  gameState: GameState;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  width: number;
  height: number;
}

const TARGET_FPS = 60;
const GRAVITY = 30; // px/s^2
const PARTICLE_GRAVITY = 12; // px/s^2
const PARTICLE_FADE = 1.2; // life per second
const TRAIL_LENGTH = 10;
const BASE_SPAWN_FRAMES = 60;
const MIN_SPAWN_FRAMES = 20;
const MAX_DELTA = 0.05;

const COLORS = {
  APPLE: '#EF4444',
  ORANGE: '#F97316',
  WATERMELON: '#22C55E',
  BOMB: '#1F2937', // Dark gray
  TRAIL: '#FFFFFF',
  PARTICLE_APPLE: '#FECACA',
  PARTICLE_BOMB: '#4B5563'
};

const FRUIT_COLORS = [COLORS.APPLE, COLORS.ORANGE, COLORS.WATERMELON];

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[3,4], // Thumb
  [0,5],[5,6],[6,7],[7,8], // Index
  [5,9],[9,10],[10,11],[11,12], // Middle
  [9,13],[13,14],[14,15],[15,16], // Ring
  [13,17],[17,18],[18,19],[19,20], // Pinky
  [0,17] // Palm base
];

const getSpawnInterval = (score: number) => {
  const spawnFrames = Math.max(MIN_SPAWN_FRAMES, BASE_SPAWN_FRAMES - Math.floor(score / 5));
  return spawnFrames / TARGET_FPS;
};

const GameLayer: React.FC<GameLayerProps> = ({ 
  handPositionRef, 
  gameState, 
  onScoreUpdate, 
  onGameOver,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for performance loop)
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{x: number, y: number}[]>([]);
  const scoreRef = useRef(0);
  const spawnAccumulatorRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const requestRef = useRef<number>();

  // Reset game function
  const resetGame = () => {
    fruitsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    scoreRef.current = 0;
    spawnAccumulatorRef.current = 0;
    lastFrameRef.current = null;
    onScoreUpdate(0);
  };

  // Trigger reset when switching to PLAYING
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      resetGame();
    }
  }, [gameState]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper: Spawn a fruit
    const spawnFruit = () => {
      const isBomb = Math.random() < 0.15; // 15% chance of bomb
      const radius = isBomb ? 40 : 35 + Math.random() * 20;
      const x = Math.random() * (width - 100) + 50;
      
      fruitsRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        x,
        y: height + radius,
        vx: (Math.random() - 0.5) * (width * 0.015) * TARGET_FPS, // px/s
        vy: -(Math.random() * 8 + 14) * TARGET_FPS, // px/s
        radius,
        color: isBomb ? COLORS.BOMB : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
        type: isBomb ? 'bomb' : 'fruit',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2 * TARGET_FPS,
        sliced: false
      });
    };

    // Helper: Create particles
    const createExplosion = (x: number, y: number, color: string, count: number = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5 + 2) * TARGET_FPS;
        particlesRef.current.push({
          id: Math.random().toString(),
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
        // Just clear canvas if not playing
        if (gameState === GameState.MENU || gameState === GameState.GAME_OVER) {
             ctx.clearRect(0, 0, width, height);
        }
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const handPosition = handPositionRef.current;

      // 0. Draw Hand Landmarks (Tech/Cyberpunk visual)
      if (handPosition?.landmarks) {
        const lms = handPosition.landmarks;
        
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Draw Skeleton connections
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'; // Faint Cyan
        ctx.lineWidth = 3;
        ctx.beginPath();
        HAND_CONNECTIONS.forEach(([start, end]) => {
          const p1 = lms[start];
          const p2 = lms[end];
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
        });
        ctx.stroke();

        // Draw Joints
        ctx.fillStyle = '#00FFFF';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00FFFF';
        
        lms.forEach((lm) => {
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        
        ctx.restore();
      }

      // 1. Update Hand Trail
      if (handPosition) {
        const screenX = handPosition.x * width;
        const screenY = handPosition.y * height;
        trailRef.current.push({ x: screenX, y: screenY });
        if (trailRef.current.length > TRAIL_LENGTH) {
          trailRef.current.shift();
        }
      } else {
        // Decay trail if hand lost
        if (trailRef.current.length > 0) trailRef.current.shift();
      }

      // Draw Trail
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
          const point = trailRef.current[i];
          // Simple smoothing
          const prev = trailRef.current[i-1];
          const midX = (prev.x + point.x) / 2;
          const midY = (prev.y + point.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.lineTo(trailRef.current[trailRef.current.length-1].x, trailRef.current[trailRef.current.length-1].y);
        ctx.strokeStyle = COLORS.TRAIL;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FFFF';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 2. Spawning Logic
      spawnAccumulatorRef.current += delta;
      const spawnInterval = getSpawnInterval(scoreRef.current);
      while (spawnAccumulatorRef.current >= spawnInterval) {
        spawnFruit();
        spawnAccumulatorRef.current -= spawnInterval;
      }

      // 3. Update & Draw Fruits
      // Check collision with the line segment formed by the last 2 trail points
      const cutterTip = trailRef.current[trailRef.current.length - 1];
      const cutterPrev = trailRef.current[trailRef.current.length - 2];

      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];
        
        // Physics
        fruit.x += fruit.vx * delta;
        fruit.y += fruit.vy * delta;
        fruit.vy += GRAVITY * delta;
        fruit.rotation += fruit.rotationSpeed * delta;

        // Collision Detection (Circle vs Line Segment)
        let hit = false;
        if (cutterTip && cutterPrev && !fruit.sliced) {
          // Simplified: just check distance to current tip for responsiveness
          const dx = cutterTip.x - fruit.x;
          const dy = cutterTip.y - fruit.y;
          const hitRadius = fruit.radius + 10;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < hitRadius * hitRadius) { // +10 for generous hitbox
            hit = true;
          }
        }

        if (hit) {
          if (fruit.type === 'bomb') {
            createExplosion(fruit.x, fruit.y, COLORS.PARTICLE_BOMB, 30);
            onGameOver(scoreRef.current);
            return; // Stop loop immediately
          } else {
            // Slice Fruit
            fruit.sliced = true;
            createExplosion(fruit.x, fruit.y, fruit.color);
            scoreRef.current += 1;
            onScoreUpdate(scoreRef.current);
            // Remove from array immediately
            fruitsRef.current.splice(i, 1);
            continue; 
          }
        }

        // Remove if off screen (only below bottom)
        if (fruit.y > height + fruit.radius + 50) {
           fruitsRef.current.splice(i, 1);
           continue;
        }

        // Draw Fruit
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        ctx.beginPath();
        ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
        ctx.fillStyle = fruit.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add a "shine"
        ctx.beginPath();
        ctx.arc(-fruit.radius/3, -fruit.radius/3, fruit.radius/4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        
        ctx.restore();
      }

      // 4. Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += PARTICLE_GRAVITY * delta; // Gravity
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
  }, [gameState, width, height, onScoreUpdate, onGameOver]); // handPositionRef is a ref, so it's stable, no need to depend on it.

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
    />
  );
};

export default GameLayer;
