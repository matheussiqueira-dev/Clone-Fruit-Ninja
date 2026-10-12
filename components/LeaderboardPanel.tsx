import React from 'react';
import { CircleAlert, RotateCw } from 'lucide-react';
import { LeaderboardEntry, LeaderboardScope } from '../types';
import { formatInteger, formatPercent } from '../lib/stats';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  scope: LeaderboardScope;
  loading: boolean;
  remoteUnavailable: boolean;
  onRefresh: () => void;
  headingId: string;
}

const modeLabel = (mode: LeaderboardEntry['inputMode']) => (mode === 'camera' ? 'Câmera' : 'Mouse');

// Says where results live: this browser unless a ranking API is configured (padrao: honest data).
const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  entries,
  scope,
  loading,
  remoteUnavailable,
  onRefresh,
  headingId
}) => {
  const isLocal = scope === 'local';
  const title = isLocal ? 'Seus melhores resultados' : 'Ranking';

  return (
    <section className="ms-card flex flex-col gap-4" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-h3 text-fg">{title}</h2>
          {isLocal && <p className="mt-1 text-caption text-fg-secondary">Salvo neste navegador.</p>}
        </div>
        <button type="button" className="ms-btn ms-btn--ghost ms-btn--icon" onClick={onRefresh} aria-label="Atualizar resultados" title="Atualizar resultados">
          <RotateCw size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {remoteUnavailable && (
        <div className="ms-alert" role="status">
          <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="ms-alert__icon" />
          <div>
            <p className="text-body font-semibold text-fg">Não foi possível carregar o ranking.</p>
            <p className="text-caption text-fg-secondary">Seus resultados locais continuam salvos.</p>
            <button type="button" className="ms-btn ms-btn--secondary mt-3" onClick={onRefresh}>Tentar novamente</button>
          </div>
        </div>
      )}

      <div aria-busy={loading}>
        {loading ? (
          <p className="text-caption text-fg-secondary" role="status">Carregando resultados…</p>
        ) : entries.length === 0 ? (
          <div className="py-4">
            <p className="text-body font-semibold text-fg">Nenhum resultado ainda.</p>
            <p className="text-caption text-fg-secondary">Termine uma partida para aparecer aqui.</p>
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {entries.map((entry, index) => (
              <li key={entry.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <span className="ms-num text-caption text-fg-tertiary">{index + 1}º</span>
                <div className="min-w-0">
                  <p className="truncate text-small font-semibold text-fg" title={entry.player}>{entry.player}</p>
                  <p className="text-fine text-fg-secondary">
                    {modeLabel(entry.inputMode)} · {formatPercent(entry.accuracy)} de precisão · combo x{entry.maxCombo}
                  </p>
                </div>
                <span className="ms-num text-right text-small font-semibold text-fg">{formatInteger(entry.score)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export default LeaderboardPanel;
