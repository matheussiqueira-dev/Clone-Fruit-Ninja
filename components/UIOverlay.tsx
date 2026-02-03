import React, { useMemo, useState } from 'react';
import { CameraStatus, GameSettings, GameState, GameStats, InputMode } from '../types';

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
  onStart: () => void;
  onRestart: () => void;
  onInputModeChange: (mode: InputMode) => void;
  onSettingsChange: (settings: GameSettings) => void;
}

const StatPill = ({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-[0_0_20px_rgba(15,23,42,0.35)]">
    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-300/70">{label}</div>
    <div className={`text-2xl font-semibold ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</div>
  </div>
);

const Toggle = ({
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
    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-white transition hover:border-amber-400/50"
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-300/80">{description}</div>
      </div>
      <div className={`h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-amber-400' : 'bg-slate-700'}`}>
        <div className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
    </div>
  </button>
);

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
  onStart,
  onRestart,
  onInputModeChange,
  onSettingsChange
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accuracy = useMemo(() => {
    const total = stats.sliced + stats.missed;
    if (total === 0) return 0;
    return Math.round((stats.sliced / total) * 100);
  }, [stats.sliced, stats.missed]);

  const cameraStatusLabel = useMemo(() => {
    if (inputMode === 'pointer') return 'Modo Mouse';
    if (cameraStatus === 'ready') return 'Câmera pronta';
    if (cameraStatus === 'loading') return 'Calibrando câmera';
    if (cameraStatus === 'error') return 'Sem câmera';
    return 'Câmera inativa';
  }, [inputMode, cameraStatus]);

  const startLabel = useMemo(() => {
    if (inputMode === 'camera') {
      if (cameraStatus === 'loading') return 'Preparando...';
      if (cameraStatus !== 'ready') return 'Ativar câmera';
    }
    return 'Iniciar corte';
  }, [inputMode, cameraStatus]);

  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 flex flex-col pointer-events-none">
      <header className="flex flex-wrap items-center justify-between gap-4 p-6 pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.4em] text-amber-200/70">Fruit Ninja</div>
            <div className="font-display text-4xl text-amber-300">Shadow Dojo</div>
          </div>
          <div className="hidden md:flex flex-col gap-2 text-xs text-slate-200">
            <span className="rounded-full bg-white/5 px-3 py-1">Velocidade adaptativa</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Combos contam mais pontos</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatPill label="Score" value={stats.score} highlight />
          <StatPill label="Combo" value={stats.combo > 1 ? `x${stats.combo}` : '—'} />
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-300/70">Vidas</div>
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: maxLives }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full ${idx < stats.lives ? 'bg-amber-400' : 'bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
          <StatPill label="Recorde" value={bestScore} />
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
            {cameraStatusLabel}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white transition hover:border-amber-400/60"
          >
            Ajustes
          </button>
        </div>
      </header>

      {settingsOpen && (
        <div className="pointer-events-auto absolute right-6 top-24 z-30 w-[320px] space-y-3 rounded-3xl border border-white/10 bg-slate-950/90 p-5 shadow-[0_0_40px_rgba(15,23,42,0.6)]">
          <div className="text-xs uppercase tracking-[0.35em] text-amber-200">Preferências</div>
          <Toggle
            label="Espelho da câmera"
            description="Mantém o movimento natural na tela"
            checked={settings.mirrorVideo}
            onChange={() => onSettingsChange({ ...settings, mirrorVideo: !settings.mirrorVideo })}
          />
          <Toggle
            label="Mostrar feed da câmera"
            description="Exibe o vídeo como fundo"
            checked={settings.showCameraFeed}
            onChange={() => onSettingsChange({ ...settings, showCameraFeed: !settings.showCameraFeed })}
          />
          <Toggle
            label="Esqueleto da mão"
            description="Visual técnico para precisão"
            checked={settings.showHandSkeleton}
            onChange={() => onSettingsChange({ ...settings, showHandSkeleton: !settings.showHandSkeleton })}
          />
          <Toggle
            label="Trilha da lâmina"
            description="Mostra o rastro do corte"
            checked={settings.showTrail}
            onChange={() => onSettingsChange({ ...settings, showTrail: !settings.showTrail })}
          />
          <Toggle
            label="Efeitos reduzidos"
            description="Melhora performance em máquinas simples"
            checked={settings.lowVfx}
            onChange={() => onSettingsChange({ ...settings, lowVfx: !settings.lowVfx })}
          />
        </div>
      )}

      {cameraError && (
        <div className="pointer-events-auto px-6">
          <div className="rounded-2xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-100">
            {cameraError}
          </div>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center pointer-events-auto px-4">
        {gameState === GameState.LOADING && (
          <div className="text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-amber-400/70 border-t-transparent animate-spin"></div>
            <p className="text-sm uppercase tracking-[0.4em] text-amber-200/80">Calibrando katana</p>
          </div>
        )}

        {gameState === GameState.MENU && (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_0_60px_rgba(15,23,42,0.6)] backdrop-blur-xl">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-5xl text-amber-300">Prepare o corte</h2>
                <p className="text-slate-300">
                  Use movimentos rápidos para fatiar frutas. Desvie das bombas e mantenha combos para pontuar mais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => onInputModeChange('camera')}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    inputMode === 'camera'
                      ? 'border-amber-400/70 bg-amber-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="text-sm uppercase tracking-[0.3em]">Câmera</div>
                  <div className="mt-2 text-xs text-slate-300">Ideal para a experiência completa</div>
                </button>
                <button
                  type="button"
                  onClick={() => onInputModeChange('pointer')}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    inputMode === 'pointer'
                      ? 'border-amber-400/70 bg-amber-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="text-sm uppercase tracking-[0.3em]">Mouse/Trackpad</div>
                  <div className="mt-2 text-xs text-slate-300">Para testes e acessibilidade</div>
                </button>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Recorde atual: <span className="text-amber-300">{bestScore}</span>
                </div>
                <button
                  type="button"
                  onClick={onStart}
                  disabled={inputMode === 'camera' && cameraStatus === 'loading'}
                  className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {startLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/80 p-8 shadow-[0_0_60px_rgba(15,23,42,0.6)] backdrop-blur-xl">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-5xl text-red-400">Fim de jogo</h2>
                <p className="text-slate-300">Seu dojo espera o próximo corte.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatPill label="Pontuação" value={stats.score} highlight />
                <StatPill label="Recorde" value={bestScore} />
                <StatPill label="Combo Máx" value={`x${stats.maxCombo}`} />
                <StatPill label="Precisão" value={`${accuracy}%`} />
              </div>

              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
                "{senseiWisdom || 'Respire. O corte volta mais preciso.'}"
              </div>

              <button
                type="button"
                onClick={onRestart}
                className="rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:border-amber-400/60 hover:text-amber-200"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 p-6 text-xs text-slate-300">
        <div className="rounded-full bg-white/5 px-4 py-2">Projeto desenvolvido por Matheus Siqueira</div>
        <a
          href="https://www.matheussiqueira.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:border-amber-400/60"
        >
          Visitar site
        </a>
      </footer>
    </div>
  );
};

export default UIOverlay;
