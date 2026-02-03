import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraStatus, GameSettings, GameState, GameStats, InputMode, VisionResult } from './types';
import { initializeVision, detectHands } from './services/visionService';
import { getSenseiWisdom } from './services/senseiService';
import GameLayer from './components/GameLayer';
import UIOverlay from './components/UIOverlay';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWindowSize } from './hooks/useWindowSize';
import { useReducedMotion } from './hooks/useReducedMotion';

const VIDEO_CONSTRAINTS = {
  audio: false,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
};

const STORAGE_KEYS = {
  bestScore: 'fruit-ninja:best-score',
  settings: 'fruit-ninja:settings',
  inputMode: 'fruit-ninja:input-mode'
} as const;

const DEFAULT_SETTINGS: GameSettings = {
  mirrorVideo: true,
  showCameraFeed: true,
  showHandSkeleton: true,
  showTrail: true,
  lowVfx: false
};

const MAX_LIVES = 3;

const INITIAL_STATS: GameStats = {
  score: 0,
  lives: MAX_LIVES,
  combo: 0,
  maxCombo: 0,
  sliced: 0,
  missed: 0
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const handPositionRef = useRef<VisionResult | null>(null);

  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const gameStateRef = useRef(gameState);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [senseiWisdom, setSenseiWisdom] = useState('');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [bestScore, setBestScore] = useLocalStorage<number>(STORAGE_KEYS.bestScore, 0);
  const [settings, setSettings] = useLocalStorage<GameSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [inputMode, setInputMode] = useLocalStorage<InputMode>(STORAGE_KEYS.inputMode, 'camera');

  const prefersReducedMotion = useReducedMotion();

  const windowSize = useWindowSize();

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

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (inputMode === 'pointer') {
      stopCamera();
      setCameraStatus('idle');
      setCameraError(null);
    }
  }, [inputMode, stopCamera]);

  const prepareCamera = useCallback(async () => {
    if (cameraStatus === 'loading' || cameraStatus === 'ready') {
      return cameraStatus === 'ready';
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Câmera não suportada neste navegador.');
      setCameraStatus('error');
      return false;
    }

    setCameraStatus('loading');
    setCameraError(null);
    setGameState(GameState.LOADING);

    try {
      await initializeVision();
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        if (videoRef.current.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (!videoRef.current) return resolve();
            videoRef.current.addEventListener('loadeddata', () => resolve(), { once: true });
          });
        }
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraStatus('ready');
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Permita o acesso à câmera para jogar.');
      setCameraStatus('error');
      setGameState(GameState.MENU);
      return false;
    }
  }, [cameraStatus]);

  const handleStatsUpdate = useCallback((partial: Partial<GameStats>) => {
    setStats((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleStartGame = useCallback(async () => {
    if (inputMode === 'camera') {
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

  useEffect(() => {
    if (inputMode !== 'camera' || cameraStatus !== 'ready' || gameState !== GameState.PLAYING) {
      return;
    }

    let rafId: number | null = null;
    let videoFrameId: number | null = null;
    let cancelled = false;

    const processFrame = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video) {
        const result = detectHands(video, { mirror: resolvedSettings.mirrorVideo });
        if (result !== undefined) {
          handPositionRef.current = result ?? null;
        }
      }
      schedule();
    };

    const schedule = () => {
      if (!videoRef.current) {
        rafId = requestAnimationFrame(processFrame);
        return;
      }
      if ('requestVideoFrameCallback' in videoRef.current) {
        videoFrameId = videoRef.current.requestVideoFrameCallback(() => processFrame());
      } else {
        rafId = requestAnimationFrame(processFrame);
      }
    };

    schedule();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (videoFrameId && videoRef.current?.cancelVideoFrameCallback) {
        videoRef.current.cancelVideoFrameCallback(videoFrameId);
      }
    };
  }, [inputMode, cameraStatus, gameState, resolvedSettings.mirrorVideo]);

  useEffect(() => {
    if (inputMode !== 'pointer') return;

    const updatePointer = (event: PointerEvent) => {
      if (gameStateRef.current !== GameState.PLAYING) return;
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      handPositionRef.current = {
        x: event.clientX / width,
        y: event.clientY / height
      };
    };

    const clearPointer = () => {
      handPositionRef.current = null;
    };

    window.addEventListener('pointermove', updatePointer);
    window.addEventListener('pointerdown', updatePointer);
    window.addEventListener('blur', clearPointer);
    window.addEventListener('mouseleave', clearPointer);

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerdown', updatePointer);
      window.removeEventListener('blur', clearPointer);
      window.removeEventListener('mouseleave', clearPointer);
    };
  }, [inputMode]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      handPositionRef.current = null;
    }
  }, [gameState]);

  const showVideo = useMemo(() => {
    return resolvedSettings.showCameraFeed && inputMode === 'camera' && cameraStatus === 'ready';
  }, [resolvedSettings.showCameraFeed, inputMode, cameraStatus]);

  const handleSettingsChange = useCallback(
    (nextSettings: GameSettings) => {
      setSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
    },
    [setSettings]
  );

  return (
    <div className="relative w-full h-screen overflow-hidden app-shell">
      <div className="absolute inset-0 app-gradient" />
      <div className="absolute inset-0 app-glow" />
      <div className="absolute inset-0 app-noise" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${
          resolvedSettings.mirrorVideo ? 'scale-x-[-1]' : ''
        } ${showVideo ? 'opacity-60' : 'opacity-0'}`}
      />

      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-950/70 via-slate-950/10 to-slate-950/80 pointer-events-none" />

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
        onStart={handleStartGame}
        onRestart={handleStartGame}
        onInputModeChange={setInputMode}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
};

export default App;
