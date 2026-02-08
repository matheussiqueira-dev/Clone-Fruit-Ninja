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

export type InputMode = 'camera' | 'pointer';

export type CameraStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface GameSettings {
  mirrorVideo: boolean;
  showCameraFeed: boolean;
  showHandSkeleton: boolean;
  showTrail: boolean;
  lowVfx: boolean;
}

export interface GameStats {
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  sliced: number;
  missed: number;
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
  landmarks?: { x: number; y: number }[]; // All hand landmarks
}

export interface LeaderboardEntry {
  id: string;
  player: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  inputMode: InputMode;
  createdAt: string;
}

export interface LeaderboardSubmission {
  player: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  inputMode: InputMode;
}
