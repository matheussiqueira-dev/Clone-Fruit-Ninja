import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSenseiWisdom } from './services/senseiService';
import GameLayer from './components/GameLayer';
import GameHud from './components/GameHud';
import GameOverScreen from './components/GameOverScreen';
import LeaderboardPanel from './components/LeaderboardPanel';
import LoadingScreen from './components/LoadingScreen';
import MenuScreen from './components/MenuScreen';
import SettingsDialog, { SettingKey } from './components/SettingsDialog';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import StatsScreen from './components/StatsScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useElementSize } from './hooks/useElementSize';
import { useReducedMotion } from './hooks/useReducedMotion';
import {
  GameOverReason,
  GameSettings,
  GameState,
  GameStats,
  InputMode,
  LeaderboardSubmission,
  VisionResult
} from './types';
import { DEFAULT_SETTINGS, INITIAL_STATS, MAX_LIVES, STORAGE_KEYS } from './config/gameConfig';
import { useCameraController } from './hooks/useCameraController';
import { useHandTracking } from './hooks/useHandTracking';
import { usePointerTracking } from './hooks/usePointerTracking';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useGameHotkeys } from './hooks/useGameHotkeys';
import { computeAccuracy } from './lib/stats';
import { dayKey, seedFromKey } from './lib/engine/rng';
import { appendRun, bestForDay, normalizeHistory, RunMode, RunRecord } from './lib/history';
import { readChallengeDay } from './lib/share';

const STATS_HASH = '#desempenho';
type MenuView = 'menu' | 'stats';

const newRunId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const App: React.FC = () => {
  const handPositionRef = useRef<VisionResult | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const gameStateRef = useRef(gameState);

  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [senseiWisdom, setSenseiWisdom] = useState('');
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('lives');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [bestScore, setBestScore] = useLocalStorage<number>(STORAGE_KEYS.bestScore, 0);
  const [settings, setSettings] = useLocalStorage<GameSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [inputMode, setInputMode] = useLocalStorage<InputMode>(STORAGE_KEYS.inputMode, 'camera');
  const [playerAlias, setPlayerAlias] = useLocalStorage<string>(STORAGE_KEYS.playerAlias, '');
  const [storedHistory, setStoredHistory] = useLocalStorage<unknown>(STORAGE_KEYS.history, []);
  const history = useMemo(() => normalizeHistory(storedHistory), [storedHistory]);

  // Daily challenge: today's, or a past day opened from a shared link (?desafio=YYYY-MM-DD).
  const [today] = useState(() => dayKey());
  const [linkedDay] = useState(() => readChallengeDay(window.location.search, today));
  const challengeDay = linkedDay ?? today;
  const [runMode, setRunMode] = useState<RunMode>(linkedDay ? 'daily' : 'free');
  // Fixed when a round starts, so switching the menu option never changes a round in progress.
  const [roundDay, setRoundDay] = useState<string | null>(null);
  const roundSeed = roundDay ? seedFromKey(roundDay) : null;

  const [view, setView] = useState<MenuView>(() => (window.location.hash === STATS_HASH ? 'stats' : 'menu'));

  const prefersReducedMotion = useReducedMotion();
  const stageSize = useElementSize(stageRef);

  const { videoRef, cameraStatus, cameraFailure, prepareCamera, resetCamera } = useCameraController();

  const leaderboard = useLeaderboard();
  const submitLeaderboard = leaderboard.submit;

  // Reduced motion forces the low-effects mode without overwriting the stored preference.
  const resolvedSettings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...settings, ...(prefersReducedMotion ? { lowVfx: true } : {}) }),
    [settings, prefersReducedMotion]
  );
  const isPlaying = gameState === GameState.PLAYING;

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (stats.score > bestScore) {
      setBestScore(stats.score);
    }
  }, [stats.score, bestScore, setBestScore]);

  useEffect(() => {
    if (inputMode === 'pointer') {
      resetCamera();
    }
  }, [inputMode, resetCamera]);

  useHandTracking({
    enabled: inputMode === 'camera' && cameraStatus === 'ready' && isPlaying,
    mirror: resolvedSettings.mirrorVideo,
    inputMode,
    videoRef,
    handPositionRef
  });

  usePointerTracking({
    enabled: inputMode === 'pointer',
    gameStateRef,
    handPositionRef,
    stageRef
  });

  useEffect(() => {
    if (!isPlaying) {
      handPositionRef.current = null;
    }
  }, [isPlaying]);

  // The stats view has its own address, so the browser's back button returns to the menu.
  useEffect(() => {
    const syncView = () => setView(window.location.hash === STATS_HASH ? 'stats' : 'menu');
    window.addEventListener('popstate', syncView);
    return () => window.removeEventListener('popstate', syncView);
  }, []);

  const openStats = useCallback(() => {
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${STATS_HASH}`);
    setView('stats');
  }, []);

  const closeStats = useCallback(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setView('menu');
  }, []);

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

    setRoundDay(runMode === 'daily' ? challengeDay : null);
    setStats({ ...INITIAL_STATS, lives: MAX_LIVES });
    setSenseiWisdom('');
    if (view === 'stats') closeStats();
    setGameState(GameState.PLAYING);
  }, [inputMode, prepareCamera, runMode, challengeDay, view, closeStats]);

  const handleGameOver = useCallback(
    (finalStats: GameStats, reason: GameOverReason) => {
      setGameOverReason(reason);
      setGameState(GameState.GAME_OVER);
      setSenseiWisdom(getSenseiWisdom(finalStats.score));

      const record: RunRecord = {
        id: newRunId(),
        at: new Date().toISOString(),
        score: finalStats.score,
        accuracy: computeAccuracy(finalStats.sliced, finalStats.missed),
        maxCombo: finalStats.maxCombo,
        sliced: finalStats.sliced,
        missed: finalStats.missed,
        inputMode,
        mode: roundDay ? 'daily' : 'free',
        ...(roundDay ? { day: roundDay } : {}),
        reason
      };
      setStoredHistory((previous: unknown) => appendRun(normalizeHistory(previous), record));

      // No round in progress, no camera: the next round reopens it (no new prompt once allowed).
      resetCamera();
    },
    [inputMode, resetCamera, roundDay, setStoredHistory]
  );

  const handleInputModeChange = useCallback(
    (mode: InputMode) => {
      setInputMode(mode);
    },
    [setInputMode]
  );

  // Functional update: rapid toggles never overwrite each other.
  const handleToggleSetting = useCallback(
    (key: SettingKey) => {
      setSettings((prev) => {
        const current = { ...DEFAULT_SETTINGS, ...prev };
        return { ...current, [key]: !current[key] };
      });
    },
    [setSettings]
  );

  const handleSaveScore = useCallback(
    async (playerName: string) => {
      const normalizedPlayer = playerName.trim();

      const payload: LeaderboardSubmission = {
        player: normalizedPlayer || 'Ninja',
        score: stats.score,
        accuracy: computeAccuracy(stats.sliced, stats.missed),
        maxCombo: stats.maxCombo,
        inputMode
      };

      const scope = await submitLeaderboard(payload);
      // Remember the name only once it was accepted.
      if (normalizedPlayer) {
        setPlayerAlias(normalizedPlayer);
      }
      return scope;
    },
    [inputMode, setPlayerAlias, stats.maxCombo, stats.missed, stats.score, stats.sliced, submitLeaderboard]
  );

  const refreshLeaderboard = leaderboard.refresh;
  useGameHotkeys({
    gameState,
    inputMode,
    onStart: handleStartGame,
    onRestart: handleStartGame,
    onInputModeChange: handleInputModeChange,
    onRefreshLeaderboard: refreshLeaderboard
  });

  const showVideo = resolvedSettings.showCameraFeed && inputMode === 'camera' && cameraStatus === 'ready';

  const leaderboardPanel = (
    <LeaderboardPanel
      entries={leaderboard.entries}
      scope={leaderboard.scope}
      loading={leaderboard.loading}
      remoteUnavailable={leaderboard.remoteUnavailable}
      onRefresh={() => void refreshLeaderboard()}
      headingId={`leaderboard-${gameState.toLowerCase()}`}
    />
  );

  return (
    // While playing the shell is locked to the viewport so the stage sits between HUD and footer;
    // in the other screens the page scrolls normally, so every action stays reachable on small screens.
    <div className={`flex flex-col ${isPlaying ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <a className="ms-skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        {isPlaying && (
          <>
            <h1 className="sr-only">Partida em andamento</h1>
            <GameHud stats={stats} maxLives={MAX_LIVES} onOpenSettings={() => setSettingsOpen(true)} />
          </>
        )}

        <div
          ref={stageRef}
          className={`relative flex min-h-0 flex-1 flex-col ${isPlaying ? 'touch-none overflow-hidden' : ''}`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-reveal ${
              resolvedSettings.mirrorVideo ? '-scale-x-100' : ''
            } ${showVideo && isPlaying ? 'opacity-40' : 'opacity-0'}`}
          />

          <GameLayer
            handPositionRef={handPositionRef}
            gameState={gameState}
            settings={resolvedSettings}
            paused={settingsOpen}
            reducedMotion={prefersReducedMotion}
            seed={roundSeed}
            maxLives={MAX_LIVES}
            onStatsUpdate={handleStatsUpdate}
            onGameOver={handleGameOver}
            width={isPlaying ? stageSize.width : 0}
            height={isPlaying ? stageSize.height : 0}
          />

          {gameState === GameState.LOADING && <LoadingScreen cameraStatus={cameraStatus} />}

          {gameState === GameState.MENU && view === 'stats' && (
            <StatsScreen history={history} onBack={closeStats} onPlay={() => void handleStartGame()} />
          )}

          {gameState === GameState.MENU && view === 'menu' && (
            <MenuScreen
              inputMode={inputMode}
              cameraStatus={cameraStatus}
              cameraFailure={cameraFailure}
              bestScore={bestScore}
              runMode={runMode}
              challengeDay={challengeDay}
              dailyBest={bestForDay(history, challengeDay)}
              onRunModeChange={setRunMode}
              onOpenStats={openStats}
              onInputModeChange={handleInputModeChange}
              onStart={() => void handleStartGame()}
              onOpenSettings={() => setSettingsOpen(true)}
              leaderboard={leaderboardPanel}
            />
          )}

          {gameState === GameState.GAME_OVER && (
            <GameOverScreen
              stats={stats}
              bestScore={bestScore}
              reason={gameOverReason}
              senseiWisdom={senseiWisdom}
              playerAlias={playerAlias}
              isSubmitting={leaderboard.submitting}
              onSave={handleSaveScore}
              onRestart={() => void handleStartGame()}
              challengeDay={roundDay}
              dailyBest={roundDay ? bestForDay(history, roundDay) : null}
              onOpenStats={() => {
                setGameState(GameState.MENU);
                openStats();
              }}
              leaderboard={leaderboardPanel}
            />
          )}
        </div>
      </main>

      <SiteFooter />

      <SettingsDialog
        open={settingsOpen}
        settings={resolvedSettings}
        lockedOn={prefersReducedMotion ? ['lowVfx'] : []}
        onToggle={handleToggleSetting}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
