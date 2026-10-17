import React from 'react';
import { Settings } from 'lucide-react';
import { GameStats } from '../types';
import { formatInteger } from '../lib/stats';

interface GameHudProps {
  stats: GameStats;
  maxLives: number;
  onOpenSettings: () => void;
}

// One 48px strip during play: numbers only, no cards, so the stage keeps the rest of the screen.
const GameHud: React.FC<GameHudProps> = ({ stats, maxLives, onOpenSettings }) => (
  <div className="flex h-12 shrink-0 items-center border-b border-line bg-canvas-subtle">
    <div className="ms-container flex items-center justify-between gap-4">
      <dl className="flex items-center gap-5 sm:gap-8">
        <div className="flex items-baseline gap-2">
          <dt className="sr-only sm:not-sr-only text-fine text-fg-secondary">Pontuação</dt>
          <dd className="ms-num text-small font-semibold text-fg">{formatInteger(stats.score)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="sr-only sm:not-sr-only text-fine text-fg-secondary">Combo</dt>
          <dd className="ms-num text-small font-semibold text-fg">
            {stats.combo >= 2 && <span aria-hidden="true">🔥 </span>}x{Math.max(1, stats.combo)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only sm:not-sr-only text-fine text-fg-secondary">Vidas</dt>
          <dd className="flex items-center gap-0.5" aria-live="polite">
            <span className="ms-sr-only">
              {stats.lives} de {maxLives}
            </span>
            {Array.from({ length: maxLives }).map((_, index) => {
              const alive = index < stats.lives;
              return (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`text-small leading-none transition-opacity ${alive ? '' : 'opacity-35 grayscale'}`}
                >
                  {alive ? '❤️' : '🖤'}
                </span>
              );
            })}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="ms-btn ms-btn--ghost ms-btn--icon"
        onClick={onOpenSettings}
        aria-label="Ajustes"
        title="Ajustes"
      >
        <Settings size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default GameHud;
