export interface Point {
  x: number;
  y: number;
}

export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Fruit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: 'fruit' | 'bomb';
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // 0 to 1
  size: number;
}

export interface VisionResult {
  x: number; // 0-1 normalized (Index Tip)
  y: number; // 0-1 normalized (Index Tip)
  landmarks: { x: number; y: number }[]; // All hand landmarks
}