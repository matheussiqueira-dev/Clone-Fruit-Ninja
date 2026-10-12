import React, { useEffect, useId, useState } from 'react';
import { GameOverReason, GameStats, LeaderboardScope } from '../types';
import { computeAccuracy, formatInteger, formatPercent } from '../lib/stats';
import { MAX_PLAYER_LENGTH, MIN_PLAYER_LENGTH, sanitizePlayerName } from '../lib/leaderboard';

interface GameOverScreenProps {
  stats: GameStats;
  bestScore: number;
  reason: GameOverReason;
  senseiWisdom: string;
  playerAlias: string;
  isSubmitting: boolean;
  onSave: (playerName: string) => Promise<LeaderboardScope>;
  onRestart: () => void;
  leaderboard: React.ReactNode;
}

const REASON_TEXT: Record<GameOverReason, string> = {
  bomb: 'Você cortou uma bomba.',
  lives: 'Três frutas caíram no chão.'
};

type SaveState =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'saved'; scope: LeaderboardScope }
  | { status: 'error' };

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  bestScore,
  reason,
  senseiWisdom,
  playerAlias,
  isSubmitting,
  onSave,
  onRestart,
  leaderboard
}) => {
  const [name, setName] = useState(playerAlias);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const nameId = useId();
  const helpId = useId();

  useEffect(() => {
    setName((current) => current || playerAlias);
  }, [playerAlias]);

  const accuracy = computeAccuracy(stats.sliced, stats.missed);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saveState.status === 'saved') return;
    // An empty name is saved as "Ninja"; anything else must meet the ranking's minimum length.
    const cleanName = sanitizePlayerName(name);
    if (cleanName.length > 0 && cleanName.length < MIN_PLAYER_LENGTH) {
      setSaveState({ status: 'invalid' });
      return;
    }
    try {
      const scope = await onSave(name);
      setSaveState({ status: 'saved', scope });
    } catch {
      setSaveState({ status: 'error' });
    }
  };

  const saved = saveState.status === 'saved';
  const invalid = saveState.status === 'invalid';
  const feedback = saveState.status === 'saved'
    ? saveState.scope === 'remote' ? 'Resultado salvo no ranking.' : 'Resultado salvo neste navegador.'
    : saveState.status === 'error' ? 'Não foi possível salvar o resultado. Tente de novo.'
      : invalid ? `Use pelo menos ${MIN_PLAYER_LENGTH} caracteres ou deixe o campo vazio.` : '';

  const numbers: Array<{ label: string; value: string }> = [
    { label: 'Pontuação', value: formatInteger(stats.score) },
    { label: 'Recorde', value: formatInteger(bestScore) },
    { label: 'Combo máximo', value: `x${Math.max(1, stats.maxCombo)}` },
    { label: 'Precisão', value: formatPercent(accuracy) }
  ];

  return (
    <div className="ms-container grid w-full max-w-[70rem] gap-6 py-6 lg:grid-cols-[3fr_2fr] lg:items-start lg:py-10">
      <section className="ms-card flex flex-col gap-6" aria-labelledby="game-over-title">
        <div className="flex flex-col gap-2">
          <h1 id="game-over-title" className="text-h1 text-fg">Fim de jogo</h1>
          <p className="text-lead text-fg-secondary">{REASON_TEXT[reason]} {senseiWisdom}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {numbers.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-fine font-semibold text-fg-secondary">{label}</dt>
              <dd className="ms-num text-kpi text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <label htmlFor={nameId} className="text-small font-semibold text-fg">Nome no ranking</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id={nameId}
              type="text"
              className="ms-input sm:max-w-xs"
              maxLength={MAX_PLAYER_LENGTH}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (invalid) setSaveState({ status: 'idle' });
              }}
              readOnly={saved}
              aria-invalid={invalid || undefined}
              placeholder="ex.: Ninja"
              autoComplete="nickname"
              aria-describedby={helpId}
            />
            <button type="submit" className="ms-btn ms-btn--secondary" disabled={isSubmitting || saved} aria-busy={isSubmitting}>
              {isSubmitting ? 'Salvando…' : saved ? 'Resultado salvo' : 'Salvar resultado'}
            </button>
          </div>
          <p id={helpId} className="text-caption text-fg-secondary">
            De {MIN_PLAYER_LENGTH} a {MAX_PLAYER_LENGTH} caracteres. Sem nome, salvamos como "Ninja".
          </p>
          <p className={`text-caption ${saveState.status === 'error' || invalid ? 'text-danger' : 'text-fg-secondary'}`} role="status">
            {feedback}
          </p>
        </form>

        <div>
          <button type="button" className="ms-btn ms-btn--primary" onClick={onRestart}>Jogar de novo</button>
        </div>
      </section>

      {leaderboard}
    </div>
  );
};

export default GameOverScreen;
