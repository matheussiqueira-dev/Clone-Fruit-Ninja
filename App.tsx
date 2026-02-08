import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSenseiWisdom } from './services/senseiService';
import GameLayer from './components/GameLayer';
import UIOverlay from './components/UIOverlay';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWindowSize } from './hooks/useWindowSize';
import { useReducedMotion } from './hooks/useReducedMotion';
import {
  GameSettings,
  GameState,
  GameStats,
  InputMode,
  LeaderboardSubmission,
  VisionResult
} from './types';
import {
  DEFAULT_SETTINGS,
  INITIAL_STATS,
  MAX_LIVES,
  STORAGE_KEYS
} from './config/gameConfig';
import { useCameraController } from './hooks/useCameraController';
import { useHandTracking } from './hooks/useHandTracking';
import { usePointerTracking } from './hooks/usePointerTracking';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useGameHotkeys } from './hooks/useGameHotkeys';

const App: React.FC = () => {
  const handPositionRef = useRef<VisionResult | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const gameStateRef = useRef(gameState);

  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [senseiWisdom, setSenseiWisdom] = useState('');

  const [bestScore, setBestScore] = useLocalStorage<number>(STORAGE_KEYS.bestScore, 0);
  const [settings, setSettings] = useLocalStorage<GameSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [inputMode, setInputMode] = useLocalStorage<InputMode>(STORAGE_KEYS.inputMode, 'camera');
  const [playerAlias, setPlayerAlias] = useLocalStorage<string>(STORAGE_KEYS.playerAlias, '');

  const prefersReducedMotion = useReducedMotion();
  const windowSize = useWindowSize();

  const {
    videoRef,
    cameraStatus,
    cameraError,
    prepareCamera,
    stopCamera,
    clearCameraError,
    markCameraIdle
  } = useCameraController();

  const {
    entries: leaderboardEntries,
    loading: isLeaderboardLoading,
    submitting: isSubmittingScore,
    error: leaderboardError,
    refresh: refreshLeaderboard,
    submit: submitLeaderboard
  } = useLeaderboard();

  const resolvedSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, lowVfx: true }));
    }
  }, [prefersReducedMotion, setSettings]);

  useEffect(() => {
    if (stats.score > bestScore) {
      setBestScore(stats.score);
    }
  }, [stats.score, bestScore, setBestScore]);

  useEffect(() => {
    if (inputMode === 'pointer') {
      stopCamera();
      markCameraIdle();
      clearCameraError();
    }
  }, [inputMode, stopCamera, markCameraIdle, clearCameraError]);

  useHandTracking({
    enabled: inputMode === 'camera' && cameraStatus === 'ready' && gameState === GameState.PLAYING,
    mirror: resolvedSettings.mirrorVideo,
    inputMode,
    videoRef,
    handPositionRef
  });

  usePointerTracking({
    enabled: inputMode === 'pointer',
    gameStateRef,
    handPositionRef
  });

  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      handPositionRef.current = null;
    }
  }, [gameState]);

  const handleStatsUpdate = useCallback((partial: Partial<GameStats>) => {
    setStats((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleStartGame = useCallback(async () => {
    if (inputMode === 'camera') {
      setGameState(GameState.LOADING);
      const ready = await prepareCamera();
      if (!ready) {
        setGameState(GameState.MENU);
        return;
      }
    }

    setStats({ ...INITIAL_STATS, lives: MAX_LIVES });
    setSenseiWisdom('');
    setGameState(GameState.PLAYING);
  }, [inputMode, prepareCamera]);

  const handleGameOver = useCallback((finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    setSenseiWisdom(getSenseiWisdom(finalScore));
  }, []);

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
  }, [setInputMode]);

  const handleSettingsChange = useCallback((nextSettings: GameSettings) => {
    setSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
  }, [setSettings]);

  const handleSaveScore = useCallback(async (playerName: string) => {
    const normalizedPlayer = playerName.trim();
    if (normalizedPlayer) {
      setPlayerAlias(normalizedPlayer);
    }

    const attempts = stats.sliced + stats.missed;
    const accuracy = attempts > 0 ? Math.round((stats.sliced / attempts) * 100) : 0;

    const payload: LeaderboardSubmission = {
      player: normalizedPlayer || 'Ninja',
      score: stats.score,
      accuracy,
      maxCombo: stats.maxCombo,
      inputMode
    };

    await submitLeaderboard(payload);
  }, [inputMode, setPlayerAlias, stats.maxCombo, stats.missed, stats.score, stats.sliced, submitLeaderboard]);

  useGameHotkeys({
    gameState,
    inputMode,
    onStart: handleStartGame,
    onRestart: handleStartGame,
    onInputModeChange: handleInputModeChange,
    onRefreshLeaderboard: refreshLeaderboard
  });

  const showVideo = useMemo(() => {
    return resolvedSettings.showCameraFeed && inputMode === 'camera' && cameraStatus === 'ready';
  }, [resolvedSettings.showCameraFeed, inputMode, cameraStatus]);

  return (
    <div className="relative w-full h-screen overflow-hidden app-shell">
      <div className="absolute inset-0 app-gradient" />
      <div className="absolute inset-0 app-glow" />
      <div className="absolute inset-0 app-grid" />
      <div className="absolute inset-0 app-noise" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${
          resolvedSettings.mirrorVideo ? 'scale-x-[-1]' : ''
        } ${showVideo ? 'opacity-55' : 'opacity-0'}`}
      />

      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-950/70 via-slate-950/20 to-slate-950/85 pointer-events-none" />

      <GameLayer
        handPositionRef={handPositionRef}
        gameState={gameState}
        settings={resolvedSettings}
        maxLives={MAX_LIVES}
        onStatsUpdate={handleStatsUpdate}
        onGameOver={handleGameOver}
        width={windowSize.width}
        height={windowSize.height}
      />

      <UIOverlay
        gameState={gameState}
        stats={stats}
        bestScore={bestScore}
        maxLives={MAX_LIVES}
        senseiWisdom={senseiWisdom}
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        inputMode={inputMode}
        settings={resolvedSettings}
        playerAlias={playerAlias}
        leaderboardEntries={leaderboardEntries}
        leaderboardError={leaderboardError}
        isLeaderboardLoading={isLeaderboardLoading}
        isSubmittingScore={isSubmittingScore}
        onStart={handleStartGame}
        onRestart={handleStartGame}
        onInputModeChange={handleInputModeChange}
        onSettingsChange={handleSettingsChange}
        onRefreshLeaderboard={refreshLeaderboard}
        onSaveScore={handleSaveScore}
      />
    </div>
  );
};

export default App;
