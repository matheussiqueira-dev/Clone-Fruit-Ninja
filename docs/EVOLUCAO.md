# Shadow Dojo: documento de evolução

Roteiro técnico e de produto do Shadow Dojo, jogo de corte no navegador com rastreamento de mão (MediaPipe) e modo mouse. O documento registra de onde o projeto partiu, o que mudou, por quê, e o que vem a seguir.

| | |
|---|---|
| Versão | 0.2.0 (2026-10-15) |
| Demo | https://shadow-dojo.vercel.app |
| Código | https://github.com/matheussiqueira-dev/Clone-Fruit-Ninja |

## 1. Sumário executivo

**Ponto de partida (v0.0.0).** Um clone funcional de Fruit Ninja com boa intenção arquitetural, mas com problemas que um avaliador técnico encontra em minutos:

- o ranking se chamava "global", mas no deploy estático gravava só no navegador;
- todo erro de câmera virava a mesma frase;
- o cursor parado cortava frutas sozinho;
- as frutas subiam milhares de pixels além do topo (gravidade de 30 px/s² contra lançamentos de até 1320 px/s);
- no celular o botão de iniciar ficava fora da tela, sem rolagem;
- o `tsc --noEmit` falhava;
- não havia CI, CSP, testes de interface nem deploy.

**v0.1.0: produto honesto e publicável.**

- Nome próprio e design system compartilhado (`ms-tokens.css` v1.0).
- Estados de câmera distintos e ranking que diz onde os dados ficam.
- Física corrigida, CI com testes de ponta a ponta e acessibilidade.
- Deploy na Vercel com CSP. Lighthouse mobile: 99 / 100 / 100 / 100.

**v0.2.0: engenharia sênior e produto com retorno.**

- **Tipagem estrita.** O `tsconfig` não tinha `strict`, e faltavam os tipos do React, então todo componente era `any` sem ninguém perceber: eram 376 erros escondidos. Agora há zero erros em `strict`, no front e no servidor.
- **Motor de jogo puro.** Física, corte, pontuação e vidas saíram do componente de canvas (de 593 para 157 linhas) para `lib/engine`, sem DOM e com 10 testes próprios. O sorteio é injetável, o que tornou possível o desafio diário.
- **Erros tratados no topo.** Um error boundary e um ponto único de relatório de erros (`lib/errors.ts`) mantêm a página utilizável quando algo falha.
- **Performance.** A visão computacional carrega só no modo câmera: o bundle principal caiu de 371 KB para 247 KB (de 116 para 78 KB com gzip, 33% a menos).
- **Produto.**
  - Desafio diário: a mesma sequência de frutas para todos no dia, com link compartilhável.
  - Painel de desempenho: histórico local, KPIs, tendência e gráfico acessível com tabela.
  - Compartilhar resultado pela Web Share API, com a área de transferência como alternativa.

**Números atuais.**

- 73 testes unitários e 26 de ponta a ponta (Playwright + axe em 320, 768 e 1280 px).
- Zero erros de tipo em `strict`.
- Zero alerta crítico no `npm audit`.

### Uma decisão de escopo

Este projeto é um jogo de navegador sem backend obrigatório. Aplicar camadas completas de Clean Architecture, um contêiner de injeção de dependências ou "integrações B2B" acrescentaria código sem retorno, e um CTO leria isso como excesso de engenharia, não como maturidade.

A refatoração foi feita na profundidade que o domínio pede:

- regras puras e testáveis separadas da renderização e da entrada;
- dependências injetadas onde trocam comportamento: o gerador aleatório e a fonte de visão;
- tipagem estrita;
- erros tratados na borda.

## 2. Disciplinas de engenharia aplicadas

| Disciplina | Por que foi usada | Impacto na entrega |
|---|---|---|
| Análise de código e arquitetura | Localizar onde regra de jogo, entrada e desenho estavam misturadas | Motor puro em `lib/engine`, renderizador separado, `GameLayer` reduzido a laço de quadros |
| Segurança de tipos | O `strict` desligado escondia que o React inteiro estava sem tipos | `strict: true`, `@types/react`, `@types/express`; zero erros |
| Engenharia de performance | Usuários do modo mouse baixavam o MediaPipe sem usar | Carregamento sob demanda, 33% menos JS inicial; cache imutável de assets |
| Confiabilidade e tratamento de erros | Uma exceção no canvas deixava a tela em branco | Error boundary, relatório central, captura de `error`/`unhandledrejection` |
| Produto e retenção | Um jogo sem motivo para voltar não demonstra visão de produto | Desafio diário, histórico, painel e compartilhamento |
| Visualização de dados | O painel precisava ler como um relatório de BI, não como enfeite | Título que afirma o achado, eixo em zero, série única em `--ms-chart-1`, tabela alternativa |
| UI/UX e acessibilidade | Demo para avaliadores precisa funcionar em qualquer tela e para qualquer pessoa | axe sem violação séria, texto mínimo de 12 px no gráfico, teclado no gráfico, alvos de 44 px |
| Qualidade e CI | Garantir que nada disso regrida | Vitest, Playwright, CI no GitHub, checagem do hash dos tokens |

## 3. Melhorias propostas e entregues

### Arquitetura

| Melhoria | Estado |
|---|---|
| Motor de jogo puro e semeável (`lib/engine/gameEngine.ts`) | Entregue |
| Renderização separada (`components/game/renderScene.ts`) | Entregue |
| Geradores aleatórios injetáveis, com jogo e efeitos em fontes separadas | Entregue |
| TypeScript `strict` no front e no servidor | Entregue |
| Error boundary e relatório central de erros | Entregue |
| Visão computacional carregada sob demanda | Entregue |
| Persistência validada: histórico normalizado na leitura, nunca confiando no `localStorage` | Entregue |
| Ranking remoto real (API + banco gerenciado) | Proposto: seção 4.4 |
| Monitoramento de erros em produção | Proposto: seção 4.5 |

### Visual e experiência

| Melhoria | Estado |
|---|---|
| Design system `ms-tokens`, IBM Plex Sans servida pelo próprio site, header e rodapé de autoria | Entregue (v0.1.0) |
| Fruta partida na direção do corte, arte "tinta sobre laca" | Entregue (v0.1.0) |
| Painel de desempenho com KPIs, gráfico e tabela | Entregue |
| Gráfico desenhado 1:1 na largura real (texto sempre com 12 px) | Entregue |
| Ícones PNG/ICO e imagem OG | Pendente: precisa de rasterização |

### Produto

| Melhoria | Estado |
|---|---|
| Desafio diário com link `?desafio=AAAA-MM-DD` | Entregue |
| Compartilhar resultado | Entregue |
| Histórico das últimas 100 partidas | Entregue |
| Ranking do desafio entre jogadores | Proposto: seção 4.4 |
| App instalável (PWA) | Proposto, fora deste ciclo |

## 4. Guias de implementação

### 4.1 Motor puro e semeável

**Como.** Todo o estado da partida (frutas, metades, manchas, gotas, rastro) e as regras ficam em `createGameEngine`. Quem chama passa o tempo decorrido e a posição da lâmina e recebe as estatísticas alteradas e o eventual fim de jogo. O componente React só mede o palco, roda o `requestAnimationFrame` e entrega `engine.state` ao renderizador.

**Bibliotecas.** Nenhuma.

**Justificativa de negócio.** As regras ficam testáveis sem navegador (10 testes rodam em milissegundos) e o motor fica reaproveitável: um replay, um modo multijogador ou uma versão nativa usariam o mesmo núcleo.

### 4.2 Desafio diário

**Como.**

1. A semente vem do dia local do jogador (`seedFromKey(dayKey())`, FNV-1a).
2. O gerador é o mulberry32.
3. Cada fruta consome sempre seis sorteios, então pontuações diferentes, que mudam a chance de bomba, não desalinham a sequência.
4. Os efeitos visuais usam outra fonte de aleatoriedade, então "efeitos reduzidos" não muda o desafio.

**Bibliotecas.** Nenhuma.

**Justificativa de negócio.** Dá um motivo diário para voltar e uma comparação justa entre jogadores sem servidor. O link do dia é o gancho de compartilhamento.

### 4.3 Painel de desempenho

**Como.**

1. Cada partida terminada vira um `RunRecord` no `localStorage` (limite de 100).
2. Na leitura, `normalizeHistory` descarta qualquer registro malformado.
3. O painel mostra quatro KPIs e um gráfico de linha com uma série e eixo em zero.
4. O título afirma o achado ("Sua média subiu 44% nas últimas 5 partidas").
5. O gráfico tem navegação por setas e anúncio para leitor de tela, e um botão "Ver dados em tabela".

**Bibliotecas.** Nenhuma: SVG próprio, cerca de 140 linhas.

**Justificativa de negócio.** É a parte de dados do perfil do autor (BI) aplicada ao próprio produto. Também é retenção: progresso visível faz o jogador voltar.

### 4.4 Próximo passo: ranking compartilhado do desafio

**Como.**

1. Mover a API `server/` para uma função da Vercel.
2. Trocar o arquivo JSON por um banco gerenciado (Postgres pelo Marketplace da Vercel).
3. Indexar o ranking por `(dia, pontuação)`.
4. Validar o envio no servidor reaplicando o desafio. A semente é pública, então o servidor pode conferir que a pontuação é possível para aquela sequência, junto com limites de taxa já existentes no `rateLimiter`.

**Bibliotecas.** Driver do banco escolhido. O Express atual já vem com `helmet` e validação.

**Justificativa de negócio.** Transforma o desafio diário numa competição real, o principal motor de retorno.

**Risco.** Fraude de pontuação: exige a validação no servidor descrita acima antes de abrir o ranking.

### 4.5 Próximo passo: monitoramento em produção

**Como.** `lib/errors.ts` já centraliza os relatórios. Basta trocar o `console.error` por um SDK de monitoramento e enviar a versão e o commit do build (já injetados pelo Vite) como contexto.

**Justificativa de negócio.** Erros de câmera e de modelo variam por dispositivo. Sem telemetria, só se descobrem por reclamação.

## 5. Código crítico refatorado, por domínio

### 5.1 Jogo: passo do motor (`lib/engine/gameEngine.ts`, resumo)

```ts
export interface GameEngine {
  readonly state: EngineState;
  readonly stats: Readonly<GameStats>;
  step: (deltaSeconds: number, nowMs: number, blade: Point | null) => StepResult;
  resize: (width: number, height: number) => void;
  setOptions: (options: Partial<Pick<EngineOptions, 'particles' | 'trailLimit'>>) => void;
  breakStroke: () => void;
}

const spawnFruit = () => {
  // Always draw the same number of values per spawn, so a seeded sequence stays aligned
  // even when different scores change the bomb threshold.
  const bombRoll = rng();
  const radiusRoll = rng();
  const startRoll = rng();
  const targetRoll = rng();
  const kindRoll = rng();
  const apexRoll = rng();
  // ...
};
```

### 5.2 Jogo: aleatoriedade determinística (`lib/engine/rng.ts`)

```ts
export const createSeededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A real calendar day: rejects 2026-02-31, which Date would silently roll into March.
export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
```

### 5.3 Dados: histórico validado na leitura (`lib/history.ts`)

```ts
// Storage is user-controlled: keep only well-formed records instead of trusting the shape.
export const normalizeHistory = (raw: unknown): RunRecord[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is RunRecord => {
    if (!item || typeof item !== 'object') return false;
    const r = item as Record<string, unknown>;
    return typeof r.id === 'string'
      && typeof r.at === 'string' && !Number.isNaN(Date.parse(r.at))
      && isFiniteNonNegative(r.score)
      && isFiniteNonNegative(r.accuracy) && (r.accuracy as number) <= 100
      // ...
      && (r.mode === 'free' || (r.mode === 'daily' && isDayKey(r.day)))
      && (r.reason === 'bomb' || r.reason === 'lives');
  }).slice(-HISTORY_LIMIT);
};
```

### 5.4 Segurança: link de desafio que não aceita sementes arbitrárias (`lib/share.ts`)

```ts
// A shared link may carry a past challenge day; the future, malformed dates and anything
// else fall back to today, so a link can never seed an arbitrary run.
export const readChallengeDay = (search: string, today: string): string | null => {
  const value = new URLSearchParams(search).get(CHALLENGE_PARAM);
  if (value === null) return null;
  if (!isDayKey(value) || value > today) return today;
  return value;
};
```

### 5.5 Performance: visão sob demanda (`services/visionLoader.ts`)

```ts
export const loadVision = (): Promise<VisionModule> => {
  if (!pending) {
    pending = import('./visionService')
      .then((module) => {
        loaded = module;
        return module;
      })
      .catch((error: unknown) => {
        // Let the next attempt retry (e.g. after a network blip) instead of caching the failure.
        pending = null;
        throw error;
      });
  }
  return pending;
};
```

### 5.6 Confiabilidade: tratamento global de erros (`lib/errors.ts`, `components/ErrorBoundary.tsx`)

```ts
export const reportError = (source: ErrorSource, error: unknown) => {
  console.error('[shadow-dojo]', toErrorReport(source, error));
};

export const installGlobalErrorReporting = () => {
  window.addEventListener('error', (event) => reportError('window', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => reportError('promise', event.reason));
};
```

```tsx
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    reportError('render', error);
  }
  // render(): alerta com "O jogo parou de responder." e botão "Recarregar"
}
```

## Pendências conhecidas

- Ícones `favicon.ico`, `apple-touch-icon.png` e `icon-512.png`, e imagem OG (precisam de rasterização).
- Canonical, `og:url` e JSON-LD dependem do domínio definitivo.
- Monograma "SD" igual ao de outro projeto do portfólio.
- `npm audit`: 5 alertas altos na cadeia de build do Tailwind 3 (somente build); corrigir exige o Tailwind 4.
