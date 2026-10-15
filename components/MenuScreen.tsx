import React from 'react';
import { ChartLine, CircleAlert, LoaderCircle, Settings } from 'lucide-react';
import { CameraFailure, CameraStatus, InputMode } from '../types';
import { CAMERA_FAILURE_MESSAGES, getCameraStatusLabel, isCameraBusy } from '../lib/camera';
import { formatInteger } from '../lib/stats';
import { PRODUCT_NAME } from '../config/project';
import { GAME_SHORTCUTS } from '../config/gameConfig';
import { RunMode } from '../lib/history';
import { formatDayShort } from '../lib/share';

interface MenuScreenProps {
  inputMode: InputMode;
  cameraStatus: CameraStatus;
  cameraFailure: CameraFailure | null;
  bestScore: number;
  runMode: RunMode;
  // Challenge day (YYYY-MM-DD): today, or a past day opened from a shared link.
  challengeDay: string;
  dailyBest: number | null;
  onInputModeChange: (mode: InputMode) => void;
  onRunModeChange: (mode: RunMode) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  leaderboard: React.ReactNode;
}

const MenuScreen: React.FC<MenuScreenProps> = ({
  inputMode,
  cameraStatus,
  cameraFailure,
  bestScore,
  runMode,
  challengeDay,
  dailyBest,
  onInputModeChange,
  onRunModeChange,
  onStart,
  onOpenSettings,
  onOpenStats,
  leaderboard
}) => {
  const usingCamera = inputMode === 'camera';
  const busy = usingCamera && isCameraBusy(cameraStatus);
  const primaryLabel = busy ? 'Preparando…' : usingCamera && cameraStatus !== 'ready' ? 'Ativar câmera' : 'Começar';
  const statusText = usingCamera ? getCameraStatusLabel(cameraStatus, cameraFailure) : 'Modo mouse selecionado';

  return (
    <div className="ms-container grid w-full max-w-[70rem] gap-6 py-6 lg:grid-cols-[3fr_2fr] lg:items-start lg:py-10">
      <section className="ms-card flex flex-col gap-6" aria-labelledby="menu-title">
        <div className="flex flex-col gap-2">
          <h1 id="menu-title" className="text-display text-fg">{PRODUCT_NAME}</h1>
          <p className="max-w-measure text-lead text-fg-secondary">
            Corte as frutas que sobem, encadeie combos e desvie das bombas. Três frutas no chão encerram a partida.
          </p>
          <p className="text-caption text-fg-secondary" role="status">{statusText}</p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-small font-semibold text-fg">Como você vai jogar</legend>
          <label className="ms-choice">
            <input
              type="radio"
              name="input-mode"
              value="camera"
              checked={usingCamera}
              onChange={() => onInputModeChange('camera')}
            />
            <span>
              <span className="block text-small font-semibold text-fg">Câmera</span>
              <span className="block text-caption text-fg-secondary">Corte com a ponta do indicador diante da webcam.</span>
            </span>
          </label>
          <label className="ms-choice">
            <input
              type="radio"
              name="input-mode"
              value="pointer"
              checked={!usingCamera}
              onChange={() => onInputModeChange('pointer')}
            />
            <span>
              <span className="block text-small font-semibold text-fg">Mouse</span>
              <span className="block text-caption text-fg-secondary">Arraste o cursor sobre as frutas. Funciona sem câmera.</span>
            </span>
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-small font-semibold text-fg">Tipo de partida</legend>
          <label className="ms-choice">
            <input type="radio" name="run-mode" value="free" checked={runMode === 'free'} onChange={() => onRunModeChange('free')} />
            <span>
              <span className="block text-small font-semibold text-fg">Livre</span>
              <span className="block text-caption text-fg-secondary">Frutas sorteadas a cada partida.</span>
            </span>
          </label>
          <label className="ms-choice">
            <input type="radio" name="run-mode" value="daily" checked={runMode === 'daily'} onChange={() => onRunModeChange('daily')} />
            <span>
              <span className="block text-small font-semibold text-fg">Desafio de {formatDayShort(challengeDay)}</span>
              <span className="block text-caption text-fg-secondary">
                A mesma sequência de frutas para todo mundo neste dia.
                {dailyBest !== null && <> Seu melhor: <span className="ms-num font-semibold text-fg">{formatInteger(dailyBest)}</span>.</>}
              </span>
            </span>
          </label>
        </fieldset>

        {usingCamera && cameraStatus === 'error' && cameraFailure && (
          <div className="ms-alert" role="alert">
            <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="ms-alert__icon" />
            <div>
              <p className="text-body font-semibold text-fg">{getCameraStatusLabel(cameraStatus, cameraFailure)}</p>
              <p className="text-caption text-fg-secondary">{CAMERA_FAILURE_MESSAGES[cameraFailure]}</p>
              <button type="button" className="ms-btn ms-btn--secondary mt-3" onClick={() => onInputModeChange('pointer')}>
                Jogar com o mouse
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {usingCamera && cameraStatus !== 'ready' && (
            <p className="text-caption text-fg-secondary">O vídeo é processado no seu navegador e não é enviado.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="ms-btn ms-btn--primary" onClick={onStart} disabled={busy} aria-busy={busy}>
              {busy && <LoaderCircle size={16} strokeWidth={1.75} aria-hidden="true" className="ms-spinner" />}
              {primaryLabel}
            </button>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={onOpenStats}>
              <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
              Seu desempenho
            </button>
            <button type="button" className="ms-btn ms-btn--secondary" onClick={onOpenSettings}>
              <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
              Ajustes
            </button>
          </div>
          <p className="text-caption text-fg-secondary">
            Recorde neste navegador: <span className="ms-num font-semibold text-fg">{formatInteger(bestScore)}</span>
          </p>
        </div>

        <p className="text-micro text-fg-tertiary">
          Atalhos: <kbd>{GAME_SHORTCUTS.startOrRestart}</kbd> começa · <kbd>{GAME_SHORTCUTS.toggleInputMode}</kbd> troca o modo · <kbd>{GAME_SHORTCUTS.refreshLeaderboard}</kbd> atualiza os resultados
        </p>
      </section>

      {leaderboard}
    </div>
  );
};

export default MenuScreen;
