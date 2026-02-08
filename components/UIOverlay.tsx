import React, { useEffect, useMemo, useState } from 'react';
import {
  CameraStatus,
  GameSettings,
  GameState,
  GameStats,
  InputMode,
  LeaderboardEntry
} from '../types';
import { GAME_SHORTCUTS } from '../config/gameConfig';

interface UIOverlayProps {
  gameState: GameState;
  stats: GameStats;
  bestScore: number;
  maxLives: number;
  senseiWisdom: string;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  inputMode: InputMode;
  settings: GameSettings;
  playerAlias: string;
  leaderboardEntries: LeaderboardEntry[];
  leaderboardError: string | null;
  isLeaderboardLoading: boolean;
  isSubmittingScore: boolean;
  onStart: () => void;
  onRestart: () => void;
  onInputModeChange: (mode: InputMode) => void;
  onSettingsChange: (settings: GameSettings) => void;
  onRefreshLeaderboard: () => void;
  onSaveScore: (playerName: string) => Promise<void>;
}

const StatCard = ({
  label,
  value,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'accent' | 'danger';
}) => {
  const toneClass = tone === 'accent'
    ? 'text-amber-200 border-amber-300/40 bg-amber-400/10'
    : tone === 'danger'
      ? 'text-rose-100 border-rose-300/40 bg-rose-500/10'
      : 'text-slate-100 border-white/10 bg-white/5';

  return (
    <div className={`rounded-2xl border px-4 py-3 backdrop-blur-xl ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-300/80">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
};

const ToggleSwitch = ({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-left text-white transition hover:border-amber-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-300/85">{description}</div>
      </div>
      <span className={`relative h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-amber-300' : 'bg-slate-700'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </div>
  </button>
);

const ModeCard = ({
  active,
  title,
  subtitle,
  onClick
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
      active
        ? 'border-amber-300/70 bg-amber-400/15 text-white shadow-[0_12px_26px_rgba(251,191,36,0.2)]'
        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
    }`}
  >
    <div className="text-xs uppercase tracking-[0.24em]">{title}</div>
    <div className="mt-2 text-xs text-slate-300/90">{subtitle}</div>
  </button>
);

const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-300/80">Sem resultados ainda. Seja o primeiro no ranking.</p>;
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <span className="text-sm font-semibold text-amber-200">#{index + 1}</span>
          <div>
            <div className="text-sm font-semibold text-white">{entry.player}</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300/70">
              {entry.inputMode === 'camera' ? 'Camera' : 'Mouse'} · {entry.accuracy}% precisão · x{entry.maxCombo}
            </div>
          </div>
          <span className="text-lg font-semibold text-amber-200">{entry.score}</span>
        </li>
      ))}
    </ol>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  stats,
  bestScore,
  maxLives,
  senseiWisdom,
  cameraStatus,
  cameraError,
  inputMode,
  settings,
  playerAlias,
  leaderboardEntries,
  leaderboardError,
  isLeaderboardLoading,
  isSubmittingScore,
  onStart,
  onRestart,
  onInputModeChange,
  onSettingsChange,
  onRefreshLeaderboard,
  onSaveScore
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(playerAlias || '');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const accuracy = useMemo(() => {
    const total = stats.sliced + stats.missed;
    if (total === 0) return 0;
    return Math.round((stats.sliced / total) * 100);
  }, [stats.sliced, stats.missed]);

  const cameraStatusLabel = useMemo(() => {
    if (inputMode === 'pointer') return 'Modo mouse ativo';
    if (cameraStatus === 'ready') return 'Câmera pronta';
    if (cameraStatus === 'loading') return 'Calibrando câmera';
    if (cameraStatus === 'error') return 'Falha de câmera';
    return 'Câmera inativa';
  }, [cameraStatus, inputMode]);

  const startLabel = useMemo(() => {
    if (inputMode === 'camera') {
      if (cameraStatus === 'loading') return 'Preparando';
      if (cameraStatus !== 'ready') return 'Ativar câmera';
    }
    return 'Iniciar sessão';
  }, [cameraStatus, inputMode]);

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
      setNameInput((current) => current || playerAlias || '');
      setSaveStatus('idle');
      setSaveFeedback(null);
    }
  }, [gameState, playerAlias]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [settingsOpen]);

  const handleSaveScore = async () => {
    try {
      await onSaveScore(nameInput);
      setSaveStatus('saved');
      setSaveFeedback('Resultado salvo no ranking.');
    } catch {
      setSaveStatus('error');
      setSaveFeedback('Não foi possível salvar agora.');
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
      <header className="pointer-events-auto px-4 pt-4 md:px-6 md:pt-6">
        <div className="glass-card flex flex-col gap-4 rounded-3xl border border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-100/75">Dojo realtime</p>
              <h1 className="hero-title text-4xl leading-none text-amber-200 md:text-5xl">Fruit Ninja</h1>
            </div>
            <div className="hidden rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100 md:block">
              {cameraStatusLabel}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:items-center md:gap-3">
            <StatCard label="Score" value={stats.score} tone="accent" />
            <StatCard label="Combo" value={stats.combo > 1 ? `x${stats.combo}` : 'x1'} />
            <StatCard label="Recorde" value={bestScore} />
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-300/70">Vidas</div>
              <div className="mt-2 flex items-center gap-1.5">
                {Array.from({ length: maxLives }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${index < stats.lives ? 'bg-amber-300' : 'bg-slate-600'}`}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white transition hover:border-amber-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Ajustes
            </button>
          </div>
        </div>
      </header>

      {settingsOpen && (
        <section className="pointer-events-auto absolute right-4 top-24 z-30 w-[min(92vw,360px)] space-y-3 rounded-3xl border border-white/10 bg-slate-950/92 p-5 shadow-[0_28px_80px_rgba(2,6,23,0.7)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.33em] text-amber-200">Preferências</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-full border border-white/15 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200 hover:border-white/40"
            >
              Fechar
            </button>
          </div>
          <ToggleSwitch
            label="Espelho da câmera"
            description="Deixa o movimento natural na tela"
            checked={settings.mirrorVideo}
            onChange={() => onSettingsChange({ ...settings, mirrorVideo: !settings.mirrorVideo })}
          />
          <ToggleSwitch
            label="Feed da câmera"
            description="Mostra o vídeo ao fundo"
            checked={settings.showCameraFeed}
            onChange={() => onSettingsChange({ ...settings, showCameraFeed: !settings.showCameraFeed })}
          />
          <ToggleSwitch
            label="Esqueleto da mão"
            description="Exibe landmarks para calibragem"
            checked={settings.showHandSkeleton}
            onChange={() => onSettingsChange({ ...settings, showHandSkeleton: !settings.showHandSkeleton })}
          />
          <ToggleSwitch
            label="Trilha da lâmina"
            description="Rastro visual do corte"
            checked={settings.showTrail}
            onChange={() => onSettingsChange({ ...settings, showTrail: !settings.showTrail })}
          />
          <ToggleSwitch
            label="Baixo VFX"
            description="Reduz partículas para melhor FPS"
            checked={settings.lowVfx}
            onChange={() => onSettingsChange({ ...settings, lowVfx: !settings.lowVfx })}
          />
        </section>
      )}

      {cameraError && (
        <div className="pointer-events-auto px-4 pt-3 md:px-6" role="status" aria-live="polite">
          <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
            {cameraError}
          </div>
        </div>
      )}

      <main className="pointer-events-auto flex flex-1 items-center justify-center px-4 py-4 md:px-6" aria-live="polite">
        {gameState === GameState.LOADING && (
          <section className="glass-card w-full max-w-lg rounded-3xl border border-white/10 px-8 py-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-cyan-200/60 border-t-transparent animate-spin" />
            <p className="mt-6 text-xs uppercase tracking-[0.45em] text-cyan-100/75">Calibrando katana</p>
            <p className="mt-2 text-sm text-slate-300">Preparando câmera e rastreamento em tempo real.</p>
          </section>
        )}

        {gameState === GameState.MENU && (
          <section className="grid w-full max-w-6xl gap-4 lg:grid-cols-[1.4fr_1fr]">
            <article className="glass-card rounded-3xl border border-white/10 px-6 py-7 md:px-8 md:py-8">
              <h2 className="hero-title text-5xl leading-none text-amber-200 md:text-6xl">Prepare o corte</h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Fatie frutas com movimentos rápidos, mantenha combos vivos e evite bombas. A progressão se adapta ao seu ritmo.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ModeCard
                  active={inputMode === 'camera'}
                  title="Modo câmera"
                  subtitle="Experiência completa com hand tracking"
                  onClick={() => onInputModeChange('camera')}
                />
                <ModeCard
                  active={inputMode === 'pointer'}
                  title="Modo mouse"
                  subtitle="Ideal para notebooks sem câmera"
                  onClick={() => onInputModeChange('pointer')}
                />
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">Recorde atual: {bestScore}</p>
                <button
                  type="button"
                  onClick={onStart}
                  disabled={inputMode === 'camera' && cameraStatus === 'loading'}
                  className="rounded-full bg-amber-300 px-8 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {startLabel}
                </button>
              </div>

              <div className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 sm:grid-cols-3">
                <span>{GAME_SHORTCUTS.startOrRestart}: iniciar</span>
                <span>{GAME_SHORTCUTS.toggleInputMode}: trocar modo</span>
                <span>{GAME_SHORTCUTS.refreshLeaderboard}: atualizar ranking</span>
              </div>
            </article>

            <aside className="glass-card rounded-3xl border border-white/10 px-5 py-6 md:px-6" aria-label="Leaderboard">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xs uppercase tracking-[0.33em] text-cyan-100">Ranking global</h3>
                <button
                  type="button"
                  onClick={onRefreshLeaderboard}
                  className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-100 transition hover:border-cyan-200/70"
                >
                  Atualizar
                </button>
              </div>

              {isLeaderboardLoading ? (
                <p className="text-sm text-slate-300">Carregando ranking...</p>
              ) : (
                <LeaderboardList entries={leaderboardEntries.slice(0, 8)} />
              )}

              {leaderboardError && (
                <p className="mt-3 text-xs text-rose-200" role="status" aria-live="polite">
                  {leaderboardError}
                </p>
              )}
            </aside>
          </section>
        )}

        {gameState === GameState.GAME_OVER && (
          <section className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.3fr_1fr]">
            <article className="glass-card rounded-3xl border border-white/10 px-6 py-7 md:px-8">
              <h2 className="hero-title text-5xl leading-none text-rose-300 md:text-6xl">Fim de jogo</h2>
              <p className="mt-2 text-slate-300">Revise seu desempenho e salve no ranking.</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatCard label="Pontuação" value={stats.score} tone="accent" />
                <StatCard label="Recorde" value={bestScore} />
                <StatCard label="Combo máximo" value={`x${stats.maxCombo}`} />
                <StatCard label="Precisão" value={`${accuracy}%`} tone={accuracy < 45 ? 'danger' : 'default'} />
              </div>

              <blockquote className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                "{senseiWisdom || 'Respire. O próximo corte será mais preciso.'}"
              </blockquote>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="text-xs uppercase tracking-[0.22em] text-slate-300">
                  Nome no ranking
                  <input
                    type="text"
                    maxLength={24}
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    placeholder="Seu nome"
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSaveScore}
                  disabled={isSubmittingScore}
                  className="h-fit self-end rounded-full border border-cyan-200/30 bg-cyan-300/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-200/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingScore ? 'Salvando...' : 'Salvar score'}
                </button>
              </div>

              {saveFeedback && (
                <p
                  className={`mt-3 text-sm ${saveStatus === 'saved' ? 'text-emerald-200' : 'text-rose-200'}`}
                  role="status"
                  aria-live="polite"
                >
                  {saveFeedback}
                </p>
              )}

              <button
                type="button"
                onClick={onRestart}
                className="mt-7 rounded-full bg-white/10 px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/20"
              >
                Jogar novamente
              </button>
            </article>

            <aside className="glass-card rounded-3xl border border-white/10 px-5 py-6 md:px-6" aria-label="Leaderboard">
              <h3 className="mb-4 text-xs uppercase tracking-[0.33em] text-cyan-100">Top jogadores</h3>
              {isLeaderboardLoading ? (
                <p className="text-sm text-slate-300">Carregando ranking...</p>
              ) : (
                <LeaderboardList entries={leaderboardEntries.slice(0, 8)} />
              )}
            </aside>
          </section>
        )}
      </main>

      <footer className="pointer-events-auto px-4 pb-4 md:px-6 md:pb-6">
        <div className="glass-card flex flex-col gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">
          <span>Desenvolvido por Matheus Siqueira</span>
          <a
            href="https://www.matheussiqueira.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white transition hover:border-amber-300/70"
          >
            Website
          </a>
        </div>
      </footer>
    </div>
  );
};

export default UIOverlay;
