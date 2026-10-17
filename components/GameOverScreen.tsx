import React, { useId, useState } from 'react';
import { GameOverReason, GameStats, LeaderboardScope } from '../types';
import { computeAccuracy, formatInteger, formatPercent } from '../lib/stats';
import { MAX_PLAYER_LENGTH, MIN_PLAYER_LENGTH, sanitizePlayerName } from '../lib/leaderboard';
import { buildShareText, buildShareUrl, formatDayShort } from '../lib/share';
import { ChartLine, Share2 } from 'lucide-react';

interface GameOverScreenProps {
  stats: GameStats;
  bestScore: number;
  reason: GameOverReason;
  senseiWisdom: string;
  playerAlias: string;
  isSubmitting: boolean;
  onSave: (playerName: string) => Promise<LeaderboardScope>;
  onRestart: () => void;
  // Set for daily challenge rounds.
  challengeDay: string | null;
  dailyBest: number | null;
  onOpenStats: () => void;
  leaderboard: React.ReactNode;
}

type ShareState = 'idle' | 'copied' | 'error';

// Web Share where the device offers it (mobile), clipboard elsewhere. A cancelled share is not an error.
const shareOrCopy = async (title: string, text: string, url: string): Promise<'shared' | 'copied'> => {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
      // Fall through to the clipboard when sharing is refused for any other reason.
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
};

const REASON_TEXT: Record<GameOverReason, string> = {
  bomb: 'Uma bomba levou sua última vida. 💣',
  lives: 'Cinco erros: suas vidas acabaram. 💔'
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
  challengeDay,
  dailyBest,
  onOpenStats,
  leaderboard
}) => {
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [name, setName] = useState(playerAlias);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const nameId = useId();
  const helpId = useId();

  // The saved alias can arrive after mount; fill an empty field with it, adjusting state during render.
  const [seenAlias, setSeenAlias] = useState(playerAlias);
  if (playerAlias !== seenAlias) {
    setSeenAlias(playerAlias);
    setName((current) => current || playerAlias);
  }

  const accuracy = computeAccuracy(stats.sliced, stats.missed);

  const handleShare = async () => {
    const text = buildShareText({
      score: stats.score,
      accuracy,
      maxCombo: stats.maxCombo,
      day: challengeDay ?? undefined
    });
    try {
      const outcome = await shareOrCopy(
        'Shadow Dojo',
        text,
        buildShareUrl(window.location.origin, challengeDay ?? undefined)
      );
      setShareState(outcome === 'copied' ? 'copied' : 'idle');
    } catch {
      setShareState('error');
    }
  };

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
  const feedback =
    saveState.status === 'saved'
      ? saveState.scope === 'remote'
        ? 'Resultado salvo no ranking.'
        : 'Resultado salvo neste navegador.'
      : saveState.status === 'error'
        ? 'Não foi possível salvar o resultado. Tente de novo.'
        : invalid
          ? `Use pelo menos ${MIN_PLAYER_LENGTH} caracteres ou deixe o campo vazio.`
          : '';

  const numbers: Array<{ label: string; value: string }> = [
    { label: 'Pontuação', value: formatInteger(stats.score) },
    { label: 'Recorde', value: formatInteger(bestScore) },
    { label: 'Combo máximo', value: `x${Math.max(1, stats.maxCombo)}` },
    { label: 'Precisão', value: formatPercent(accuracy) }
  ];

  return (
    <div className="ms-container grid w-full max-w-280 gap-6 py-6 lg:grid-cols-[3fr_2fr] lg:items-start lg:py-10">
      <section className="ms-card flex flex-col gap-6" aria-labelledby="game-over-title">
        <div className="flex flex-col gap-2">
          <h1 id="game-over-title" className="text-h1 text-fg">
            Fim de jogo
          </h1>
          <p className="text-lead text-fg-secondary">
            {REASON_TEXT[reason]} {senseiWisdom}
          </p>
          {challengeDay && (
            <p className="text-caption text-fg-secondary">
              Desafio de {formatDayShort(challengeDay)}
              {dailyBest !== null && (
                <>
                  {' '}
                  · seu melhor neste desafio:{' '}
                  <span className="ms-num font-semibold text-fg">{formatInteger(dailyBest)}</span>
                </>
              )}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {numbers.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-fine font-semibold text-fg-secondary">{label}</dt>
              <dd className="ms-num text-kpi text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <form className="flex flex-col gap-2" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor={nameId} className="text-small font-semibold text-fg">
            Nome no ranking
          </label>
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
            <button
              type="submit"
              className="ms-btn ms-btn--secondary"
              disabled={isSubmitting || saved}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Salvando…' : saved ? 'Resultado salvo' : 'Salvar resultado'}
            </button>
          </div>
          <p id={helpId} className="text-caption text-fg-secondary">
            De {MIN_PLAYER_LENGTH} a {MAX_PLAYER_LENGTH} caracteres. Sem nome, salvamos como "Ninja".
          </p>
          <p
            className={`text-caption ${saveState.status === 'error' || invalid ? 'text-danger' : 'text-fg-secondary'}`}
            role="status"
          >
            {feedback}
          </p>
        </form>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="ms-btn ms-btn--primary" onClick={onRestart}>
              Jogar de novo
            </button>
            <button type="button" className="ms-btn ms-btn--secondary" onClick={() => void handleShare()}>
              <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />
              Compartilhar
            </button>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={onOpenStats}>
              <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
              Seu desempenho
            </button>
          </div>
          <p
            className={`mt-2 text-caption ${shareState === 'error' ? 'text-danger' : 'text-fg-secondary'}`}
            role="status"
          >
            {shareState === 'copied'
              ? 'Resultado e link copiados.'
              : shareState === 'error'
                ? 'Não foi possível compartilhar. Copie o endereço da página.'
                : ''}
          </p>
        </div>
      </section>

      {leaderboard}
    </div>
  );
};

export default GameOverScreen;
