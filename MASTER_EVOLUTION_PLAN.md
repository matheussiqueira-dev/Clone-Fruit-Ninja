# Shadow Dojo: plano mestre de evolução

Documento executivo: de onde o projeto partiu, onde está, o que mudar na arquitetura a longo prazo e como implementar as próximas features. Os detalhes técnicos do estado atual estão em [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md); o roteiro e as bibliotecas, em [`ROADMAP_AND_SKILLS.md`](ROADMAP_AND_SKILLS.md); o histórico das versões 0.1 e 0.2, em [`docs/EVOLUCAO.md`](docs/EVOLUCAO.md).

## 1. Sumário executivo

### Do legado ao padrão atual

| Indicador | v0.0 (fev. 2026) | v0.2.0 (15/10/2026) | Hoje (17/10/2026, não lançado) |
|---|---|---|---|
| Erros de tipo em `strict` | 376 escondidos (`strict` desligado) | 0 | 0 |
| Lint | inexistente | inexistente | ESLint com tipos, 0 problemas |
| Testes unitários | 3 arquivos, sem CI | 73 | 91, cobertura de 85% do domínio com piso no CI |
| Testes de ponta a ponta | 0 | 26 | 29, todos sob a CSP de produção, incluindo uso offline |
| `npm audit` | alertas em Express, Vite e PostCSS | 0 críticos, 5 altos (Tailwind 3) | 0 alertas |
| Build | Vite 6 | Vite 6, 3,7 s | Vite 8 (Rolldown), 0,75 s |
| Estilo | Tailwind 3, cores soltas | Tailwind 3 + design system | Tailwind 4 + design system, sem PostCSS |
| Visão computacional | MediaPipe 0.10, sempre carregado | 0.10, sob demanda | 1.1.1, sob demanda, com teste de integridade do WASM |
| Node no CI | sem CI | 22 | 24 (mínimo declarado: 22.12) |

### Decisões desta fase

1. **Uma major por vez.** Tailwind 4, Vite 8 e MediaPipe 1.x entraram em commits separados, cada um com a suíte completa verde. Qualquer um pode ser revertido sozinho.
2. **Regressão visual medida, não estimada.** Um diff de 44 propriedades computadas por elemento, em todas as telas e duas larguras, achou a única regressão real da migração do Tailwind (diálogo descentralizado) antes do commit.
3. **Testes que pegam o que antes passava.** O WASM servido estava três versões atrás do JS do MediaPipe sem nenhum teste perceber; a CSP de produção não era aplicada nos testes. Os dois buracos agora têm teste, e cada teste foi visto falhando antes de passar.
4. **Escopo proporcional.** Não entrou contêiner de injeção de dependências nem camadas extras de Clean Architecture: o projeto já separa domínio puro, adaptadores e interface (ver `PROJECT_OVERVIEW.md`, seção 2), e mais camadas seriam custo sem retorno num jogo estático.

### O que falta para colher o resultado

- **Publicar a v0.3.0.** O deploy público ainda roda a v0.2.0.
- **Verificar o rastreamento com uma mão real.** Os testes provam que o runtime 1.1.1 carrega o modelo e processa quadros sob a CSP, mas usam uma câmera sintética sem mão. A precisão do rastreamento precisa de um teste manual com webcam.

## 2. Arquitetura de longo prazo

### 2.1 Motor compartilhado entre cliente e servidor

O motor (`lib/engine`) já é puro e semeável, e o servidor já importa `lib/leaderboard.ts` do front. O próximo passo natural é tratar `lib/` como um pacote de domínio compartilhado: o servidor passa a rodar o mesmo motor para validar partidas (seção 3.3). Uma divisão em workspaces (`packages/engine`, `apps/web`, `apps/api`) só vale quando houver um segundo consumidor real além do servidor; até lá, o caminho relativo atual é mais simples.

### 2.2 Servidor: do arquivo JSON a uma função gerenciada

| Hoje | Proposto |
|---|---|
| Express 4 rodando localmente, ranking em arquivo JSON | O mesmo Express como Vercel Function (a Vercel roda Express sem configuração extra), com banco gerenciado |
| `asyncRoute` encaminha erros assíncronos | Express 5 encaminha promessas rejeitadas nativamente: `asyncRoute` pode sair |
| Rate limit em memória | Rate limit em memória deixa de valer com várias instâncias: mover para o banco ou para o firewall da plataforma |

### 2.3 Visão computacional fora da thread principal

Hoje a inferência roda na thread principal, no mesmo quadro que a física e o desenho. Em aparelhos fracos, isso disputa o orçamento de 16 ms. Mover o HandLandmarker para um Web Worker (seção 3.2) é a maior melhoria de fluidez disponível.

### 2.4 Majors ainda pendentes

| Pacote | Situação em 17/10/2026 | Recomendação |
|---|---|---|
| Express 5 | Estável; exige Node 18+ | Migrar junto com a ida do servidor para função gerenciada, que já reescreve o ponto de entrada |
| TypeScript 7 | O `typescript-eslint` aceita até `<6.1.0` | Aguardar suporte do `typescript-eslint`; avaliar o 6.0 antes |
| Vitest 5 | Lançado | Migrar numa fase própria, com o mesmo método (suíte verde antes e depois) |
| `@types/express` 5 | Acompanha o Express 5 | Junto com o Express 5 |

## 3. Guias táticos das features sugeridas

### 3.1 PWA com cache do modelo (entregue)

> Implementado em `vite.config.ts` e coberto por `e2e/offline.spec.ts`. O cache leva a versão instalada do MediaPipe no nome (`vision-assets-<versão>`) e um script no service worker apaga os caches de versões anteriores na ativação. O guia abaixo fica como registro do desenho.

**Objetivo.** Na segunda visita, o modo câmera abre sem baixar de novo os 21 MB do modelo e do WASM.

**Passos.**

1. Instalar `vite-plugin-pwa` (MIT; aceita Vite 8).
2. Pré-cachear só o shell (HTML, JS, CSS, fontes). O modelo e o WASM entram por cache em tempo de execução, para que jogadores do modo mouse não os baixem.
3. A CSP atual já permite o service worker (`worker-src 'self'`).
4. Testar: segunda visita offline abre o menu; modo câmera offline funciona depois de uma visita online.

```ts
// vite.config.ts (proposta)
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2,svg}'],
    runtimeCaching: [
      {
        // Modelo e runtime WASM: só para quem usa a câmera, versionados pelo nome do pacote.
        urlPattern: ({ url }) => url.pathname.startsWith('/vision/'),
        handler: 'CacheFirst',
        options: { cacheName: 'vision-assets', expiration: { maxEntries: 8 } }
      }
    ]
  },
  manifest: {
    name: 'Shadow Dojo',
    short_name: 'Shadow Dojo',
    display: 'standalone',
    lang: 'pt-BR'
  }
});
```

**Risco.** Ao atualizar o MediaPipe, o cache `CacheFirst` serviria o WASM antigo com o JS novo, o mesmo descompasso que o teste de integridade previne no repositório. Mitigação: incluir a versão do pacote no nome do cache (`vision-assets-1.1.1`).

### 3.2 Visão em Web Worker

**Objetivo.** Tirar a inferência da thread principal.

**Passos.**

1. Criar `services/vision.worker.ts` com `initializeVision` e `detect(bitmap)`, expostos com `comlink` (Apache-2.0).
2. Na thread principal, a cada quadro novo de vídeo: `createImageBitmap(video)` e enviar com `Comlink.transfer` (sem cópia).
3. Workers do tipo módulo não têm `importScripts`. O MediaPipe 1.x aceita `FilesetResolver.forVisionTasks(basePath, true)` para carregar a variante ES module do WASM (`vision_wasm_module_internal.*`). Incluir esses arquivos no `sync:vision` e no teste de integridade. Validar essa rota num protótipo antes de migrar.
4. Manter a API pública de `visionLoader` (`loadVision`, `getLoadedVision`) para que os hooks não mudem.

```ts
// services/vision.worker.ts (proposta)
import * as Comlink from 'comlink';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let landmarker: HandLandmarker | undefined;

const api = {
  async init(basePath: string, modelPath: string) {
    const fileset = await FilesetResolver.forVisionTasks(basePath, true);
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1
    });
  },
  detect(frame: ImageBitmap, timestampMs: number) {
    const result = landmarker?.detectForVideo(frame, timestampMs);
    frame.close();
    return result?.landmarks[0] ?? null;
  }
};

export type VisionWorkerApi = typeof api;
Comlink.expose(api);
```

**Como medir.** Duração média do quadro (já disponível via `performance.now()` no `GameLayer`) antes e depois, num notebook comum e num celular intermediário.

### 3.3 Ranking do desafio validado por replay

**Objetivo.** Ranking compartilhado do desafio diário em que uma pontuação forjada não entra.

**Ideia central.** O desafio usa uma semente pública e o motor é determinístico. O cliente envia o registro de entrada da partida (tamanho do palco e amostras da lâmina por passo). O servidor roda o mesmo motor com a mesma semente e aceita a pontuação só se ela bater.

**Passos.**

1. Gravar no `GameLayer`, a cada passo: `delta`, `now`, posição da lâmina (ou `null`) e redimensionamentos do palco. O arco depende da altura do palco, então o tamanho faz parte do registro.
2. Quantizar (inteiros em pixels e milissegundos) e comprimir. Uma partida de 2 minutos a 60 quadros por segundo são cerca de 7.200 amostras: o limite atual de 16 KB do `express.json` precisa subir para esse endpoint.
3. Validar o esquema com `zod`, depois reproduzir:

```ts
// server/src/domain/replay.ts (proposta)
import { MAX_LIVES } from '../../../config/gameConfig';
import { createGameEngine } from '../../../lib/engine/gameEngine';
import { createSeededRng, seedFromKey } from '../../../lib/engine/rng';

export interface ReplayStep {
  delta: number;
  now: number;
  blade: { x: number; y: number } | null;
  resize?: { width: number; height: number };
}

export const replayScore = (day: string, start: { width: number; height: number }, steps: ReplayStep[]) => {
  const engine = createGameEngine({
    ...start,
    maxLives: MAX_LIVES,
    rng: createSeededRng(seedFromKey(day)),
    cosmeticRng: () => 0.5, // efeitos não afetam o jogo; valor fixo basta
    particles: false,
    trailLimit: 8
  });
  for (const step of steps) {
    if (step.resize) engine.resize(step.resize.width, step.resize.height);
    if (engine.step(step.delta, step.now, step.blade).gameOver) break;
  }
  return engine.stats.score;
};
```

4. Gravar no banco por `(dia, pontuação)` com índice nessa ordem; rejeitar se `replayScore` divergir do enviado.

**Riscos.**

- Determinismo entre motores JavaScript: `Math.sin`, `Math.cos` e `Math.atan2` podem diferir no último bit entre V8 e JavaScriptCore. Testar o replay de partidas gravadas no Safari contra o Node antes de abrir o ranking; se divergir, aceitar uma tolerância pequena ou trocar essas chamadas por aproximações determinísticas.
- Um bot ainda pode gerar uma entrada sobre-humana válida. Limites de plausibilidade (velocidade máxima da lâmina, tempo de reação) ficam numa segunda etapa.

### 3.4 Telemetria de erros e de Web Vitals

**Passos.**

1. Em `lib/errors.ts`, manter `reportError` como ponto único e enviar para um SDK (`@sentry/react` apontando para um GlitchTip auto-hospedado, ou o plano gratuito do Sentry).
2. Anexar `__APP_VERSION__` e `__COMMIT_SHA__`, que o Vite já injeta.
3. Registrar `onLCP`, `onINP` e `onCLS` do `web-vitals` no mesmo relatório.
4. Adicionar o domínio do coletor ao `connect-src` da CSP em `vercel.json`. Como a suíte roda sob essa CSP, o teste da câmera (que falha com qualquer erro no console) acusa se faltar.

### 3.5 Pausa por gesto

O `GestureRecognizer` vem no mesmo pacote do MediaPipe e reconhece `Open_Palm`. Com a mão aberta parada por 600 ms, a partida pausa; punho fechado retoma. Risco: o reconhecedor é um segundo modelo (alguns MB). Carregá-lo só depois da primeira partida com câmera.

## 4. Código crítico refatorado, por domínio

Trechos reais desta fase. Os da v0.2 (motor, gerador semeado, boundary) estão em `docs/EVOLUCAO.md`, seção 5.

### 4.1 Infraestrutura: CSP de produção nos testes (`vite.config.ts`)

```ts
import vercelConfig from './vercel.json' with { type: 'json' };

// The preview server sends the deploy's site-wide headers (CSP, Permissions-Policy...), so the
// Playwright suite runs under the same policy as production.
const deployHeaders = Object.fromEntries(
  (vercelConfig.headers.find((rule) => rule.source === '/(.*)')?.headers ?? []).map(({ key, value }) => [
    key,
    value
  ])
);
// ...
preview: {
  allowedHosts: ['shadow-dojo.test'],
  headers: deployHeaders
}
```

### 4.2 Infraestrutura: integridade do runtime de visão (`lib/visionAssets.test.ts`)

```ts
describe('public/vision/wasm', () => {
  it.each(FILES)('%s matches the installed @mediapipe/tasks-vision (run npm run sync:vision)', (file) => {
    expect(sha256(fromRoot(`public/vision/wasm/${file}`))).toBe(
      sha256(fromRoot(`node_modules/@mediapipe/tasks-vision/wasm/${file}`))
    );
  });
});
```

Junto com `public/vision/** -text` no `.gitattributes`, para que a conversão de fim de linha do Git nunca altere esses arquivos.

### 4.3 Servidor: erros assíncronos no tratador global (`server/src/server.ts`)

```ts
// Express 4 does not await handlers: forward a rejected promise to the error handler at the bottom.
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    handler(req, res).catch(next);
  };

app.get(
  `${API_PREFIX}/leaderboard`,
  asyncRoute(async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const entries = await leaderboardRepository.list(limit);
    res.json({ entries, total: entries.length });
  })
);
```

### 4.4 Domínio: validação do nome no ranking (`lib/leaderboard.ts`)

Antes, `String(candidate.player ?? '')` transformava um objeto em `"[object Object]"`, um nome válido de 15 caracteres. Agora um nome que não é texto é recusado, no cliente e no servidor:

```ts
export const sanitizePlayerName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return collapseSpaces(value).slice(0, MAX_PLAYER_LENGTH);
};

// isValidLeaderboardSubmission
const player = sanitizePlayerName(candidate.player);
```

### 4.5 Aplicação: primeira carga do ranking sem atualização tardia (`hooks/useLeaderboard.ts`)

```ts
useEffect(() => {
  let active = true;
  void fetchLeaderboard(LEADERBOARD_LIMIT).then((result) => {
    if (!active) return;
    setEntries(result.entries);
    setRemoteUnavailable(scope === 'remote' && result.source === 'local');
    setLoading(false);
  });
  return () => {
    active = false;
  };
}, [scope]);
```

### 4.6 Aplicação: callback de vídeo cancelado no elemento certo (`hooks/useHandTracking.ts`)

```ts
// The element that owns videoFrameId: the ref may point elsewhere by cleanup time.
let videoFrameOwner: HTMLVideoElement | null = null;
// ...
videoFrameOwner = videoRef.current;
videoFrameId = videoFrameOwner.requestVideoFrameCallback(() => processFrame());
// cleanup
if (videoFrameId !== null && videoFrameOwner?.cancelVideoFrameCallback) {
  videoFrameOwner.cancelVideoFrameCallback(videoFrameId);
}
```

### 4.7 Estilo: o tema do Tailwind 4 sobre o design system (`index.css`)

```css
@import './styles/ms-tokens.css' layer(base);
@import 'tailwindcss';

@theme {
  --color-*: initial; /* só as cores do design system existem */
  --color-accent: var(--ms-accent);
  --radius-*: initial;
  --radius-card: var(--ms-radius-card);
  /* ... */
}

@utility ms-dialog {
  /* Tailwind 4's preflight zeroes every margin, including the UA's centring of a modal dialog. */
  margin: auto;
  /* ... */
}
```
