import { GameSettings, GameStats } from '../types';

export const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
};

export const STORAGE_KEYS = {
  bestScore: 'fruit-ninja:best-score',
  settings: 'fruit-ninja:settings',
  inputMode: 'fruit-ninja:input-mode',
  localLeaderboard: 'fruit-ninja:local-leaderboard',
  playerAlias: 'fruit-ninja:player-alias'
} as const;

export const DEFAULT_SETTINGS: GameSettings = {
  mirrorVideo: true,
  showCameraFeed: true,
  showHandSkeleton: true,
  showTrail: true,
  lowVfx: false
};

export const MAX_LIVES = 3;

export const INITIAL_STATS: GameStats = {
  score: 0,
  lives: MAX_LIVES,
  combo: 0,
  maxCombo: 0,
  sliced: 0,
  missed: 0
};

export const LEADERBOARD_LIMIT = 8;

export const GAME_SHORTCUTS = {
  startOrRestart: 'Enter',
  toggleInputMode: 'M',
  refreshLeaderboard: 'R'
} as const;
