import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChartLine } from 'lucide-react';
import { describeTrend, RunRecord, summarizeHistory } from '../lib/history';
import { formatInteger, formatPercent } from '../lib/stats';
import { formatDayShort } from '../lib/share';
import ScoreChart from './stats/ScoreChart';

interface StatsScreenProps {
  history: RunRecord[];
  onBack: () => void;
  onPlay: () => void;
}

const CHART_RUNS = 30;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

// Personal performance from the run history in this browser (no account, no server).
const StatsScreen: React.FC<StatsScreenProps> = ({ history, onBack, onPlay }) => {
  const [showTable, setShowTable] = useState(false);
  const summary = useMemo(() => summarizeHistory(history), [history]);
  const recent = useMemo(() => history.slice(-CHART_RUNS), [history]);
  const headline = describeTrend(summary);

  const kpis = [
    { label: 'Partidas', value: formatInteger(summary.runs) },
    { label: 'Melhor pontuação', value: formatInteger(summary.best) },
    { label: 'Média por partida', value: formatInteger(summary.averageScore) },
    { label: 'Precisão média', value: formatPercent(summary.averageAccuracy) }
  ];

  return (
    <div className="ms-container flex w-full max-w-280 flex-col gap-6 py-6 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-fg">Seu desempenho</h1>
        <button type="button" className="ms-btn ms-btn--ghost" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Voltar ao menu
        </button>
      </div>

      {summary.runs === 0 ? (
        <section className="ms-card flex flex-col items-start gap-3" aria-labelledby="stats-empty">
          <ChartLine size={24} strokeWidth={1.75} aria-hidden="true" className="text-fg-tertiary" />
          <h2 id="stats-empty" className="text-body font-semibold text-fg">
            Nenhuma partida ainda
          </h2>
          <p className="text-caption text-fg-secondary">
            Termine uma partida e a sua evolução aparece aqui. Tudo fica salvo só neste navegador.
          </p>
          <button type="button" className="ms-btn ms-btn--primary" onClick={onPlay}>
            Jogar agora
          </button>
        </section>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="ms-card flex flex-col gap-1">
                <dt className="text-fine font-semibold text-fg-secondary">{kpi.label}</dt>
                <dd className="ms-num text-kpi text-fg">{kpi.value}</dd>
              </div>
            ))}
          </dl>

          <section className="ms-card flex flex-col gap-4" aria-labelledby="stats-trend">
            <div>
              <h2 id="stats-trend" className="text-h3 text-fg">
                {headline}
              </h2>
              <p className="text-caption text-fg-secondary">
                Pontos por partida, últimas {formatInteger(recent.length)} partidas. Melhor combo: x
                {Math.max(1, summary.bestCombo)}.
              </p>
            </div>

            <ScoreChart
              runs={recent}
              label={`${headline}. Gráfico de pontos nas últimas ${recent.length} partidas.`}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-fine text-fg-tertiary">
                Salvo neste navegador. Guardamos as últimas 100 partidas.
              </p>
              <button
                type="button"
                className="ms-btn ms-btn--secondary"
                aria-expanded={showTable}
                aria-controls="stats-table"
                onClick={() => setShowTable((open) => !open)}
              >
                {showTable ? 'Ocultar tabela' : 'Ver dados em tabela'}
              </button>
            </div>

            {showTable && (
              <div
                id="stats-table"
                className="overflow-x-auto"
                role="region"
                aria-labelledby="stats-table-caption"
                tabIndex={0}
              >
                <table className="w-full text-left text-caption">
                  <caption id="stats-table-caption" className="ms-sr-only">
                    Partidas mais recentes
                  </caption>
                  <thead className="bg-canvas-subtle text-fine font-semibold text-fg-secondary">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Quando
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Tipo
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Pontos
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Precisão
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Combo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...recent].reverse().map((run) => (
                      <tr key={run.id}>
                        <th scope="row" className="px-4 py-3 font-normal text-fg">
                          <time dateTime={run.at}>{dateFormatter.format(new Date(run.at))}</time>
                        </th>
                        <td className="px-4 py-3 text-fg-secondary">
                          {run.mode === 'daily' && run.day ? `Desafio ${formatDayShort(run.day)}` : 'Livre'} ·{' '}
                          {run.inputMode === 'camera' ? 'Câmera' : 'Mouse'}
                        </td>
                        <td className="ms-num px-4 py-3 text-right text-fg">{formatInteger(run.score)}</td>
                        <td className="ms-num px-4 py-3 text-right text-fg">{formatPercent(run.accuracy)}</td>
                        <td className="ms-num px-4 py-3 text-right text-fg">x{Math.max(1, run.maxCombo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default StatsScreen;
