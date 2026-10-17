# Shadow Dojo: roteiro e competências

Plano de ação do projeto: as fases já aplicadas, as competências e ferramentas usadas em cada uma, as bibliotecas gratuitas em uso e as sugeridas para os próximos passos. Regra do projeto: só soluções open source ou gratuitas.

## 1. Fases aplicadas

| Fase | Período | Resultado |
|---|---|---|
| 0. Protótipo | fev. a jun. de 2026 | Protótipo Unity substituído por uma versão web (React + MediaPipe) com ranking Express |
| 1. Produto honesto e publicável (v0.1.0) | 11 a 12 de out. de 2026 | Nome próprio, design system, física corrigida, erros de câmera distintos, CI, CSP, deploy |
| 2. Engenharia sênior e produto com retorno (v0.2.0) | 15 de out. de 2026 | TypeScript `strict`, motor puro e semeável, error boundary, visão sob demanda, desafio diário, painel de desempenho, compartilhamento |
| 3. Modernização da cadeia e blindagem (não lançado) | 17 de out. de 2026 | Tailwind 4, Vite 8, MediaPipe 1.x, lint com tipos, cobertura, CSP de produção nos testes, zero alertas no `npm audit` |

O detalhe das fases 1 e 2 está em [`docs/EVOLUCAO.md`](docs/EVOLUCAO.md). A fase 3 está em [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md#5-como-as-tecnologias-novas-entraram-outubro-de-2026).

### Fase 3, passo a passo

Cada passo foi um commit separado, com a suíte completa verde (typecheck, lint, formatação, unitários com cobertura, build, build do servidor e Playwright) antes de seguir.

| # | Passo | Competências | Ferramentas |
|---|---|---|---|
| 1 | Diagnóstico | Leitura de arquitetura e histórico, auditoria de dependências | `git log`, `npm outdated`, `npm audit`, suíte existente |
| 2 | Atualizações dentro da faixa | Gestão de dependências, integridade de assets | `npm update`, `npm audit fix`, script `sync:vision`, teste de hash SHA-256 |
| 3 | Lint, formatação e cobertura | Análise estática, correção de causa raiz | ESLint 10 (typescript-eslint com tipos, react-hooks), Prettier, `@vitest/coverage-v8` |
| 4 | Tailwind 3 → 4 | Migração de CSS, regressão visual objetiva | `@tailwindcss/upgrade`, `@tailwindcss/vite`, diff de estilos computados via Playwright |
| 5 | Vite 6 → 8 | Migração de build (Rolldown) | Vite 8, `@vitejs/plugin-react` 6, carregador de config nativo |
| 6 | MediaPipe 0.10 → 1.1 | Migração de runtime WASM, testes de caminho feliz | Câmera sintética (`canvas.captureStream`), CSP de produção no `vite preview` |
| 7 | Documentação | Escrita técnica e executiva | Este documento, `PROJECT_OVERVIEW.md`, `MASTER_EVOLUTION_PLAN.md` |

#### Técnica de verificação usada nas migrações de front-end

Para Tailwind e Vite, a comparação não foi a olho. Um script do Playwright abre menu, ajustes, HUD, fim de jogo e desempenho em 375 e 1280 px e grava 44 propriedades computadas de cada elemento visível (cor, espaçamento, raio, sombra, tamanho, tipografia...). O diff entre antes e depois apontou:

- a regressão real (o diálogo de ajustes perdeu a centralização: o preflight do Tailwind 4 zera a margem do `<dialog>`), corrigida;
- as mudanças intencionais (altura de linha do corpo passa a seguir o token do design system, 1,6);
- o ruído conhecido (hover do mouse, frase aleatória do sensei).

## 2. Bibliotecas em uso

Todas gratuitas e open source.

| Biblioteca | Papel | Licença | Desde |
|---|---|---|---|
| React 19 | Interface | MIT | protótipo web |
| Vite 8 + `@vitejs/plugin-react` | Dev server e build | MIT | protótipo web (Vite 8 nesta fase) |
| Tailwind CSS 4 + `@tailwindcss/vite` | Utilitários de estilo sobre `ms-tokens.css` | MIT | v0.1 (v4 nesta fase) |
| `@mediapipe/tasks-vision` 1.1 | Rastreamento da mão no navegador | Apache-2.0 | protótipo web (1.x nesta fase) |
| lucide-react | Ícones | ISC | protótipo web |
| `@fontsource-variable/ibm-plex-sans` | Fonte servida pelo próprio site | OFL-1.1 | v0.1 |
| Express 4, Helmet, CORS | Servidor opcional de ranking | MIT | protótipo web |
| Vitest + `@vitest/coverage-v8` | Testes unitários e cobertura | MIT | v0.0 (cobertura nesta fase) |
| Playwright + `@axe-core/playwright` | Ponta a ponta e acessibilidade | Apache-2.0 / MPL-2.0 | v0.1 |
| ESLint, typescript-eslint, eslint-plugin-react-hooks, Prettier | Qualidade estática | MIT | nesta fase |
| tsx | Rodar o servidor TypeScript em dev | MIT | protótipo web |

## 3. Bibliotecas sugeridas para os próximos passos

Versões conferidas no npm em 17/10/2026. Nenhuma tem custo.

| Biblioteca | Para quê | Licença | Compatibilidade verificada |
|---|---|---|---|
| `vite-plugin-pwa` 2.0 (Workbox) | App instalável e offline; cache do modelo de 7,8 MB e do WASM de 13,5 MB entre visitas | MIT | aceita Vite 8; **já em uso** |
| `web-vitals` 6 | LCP, INP e CLS reais dos jogadores, enviados ao relatório central | Apache-2.0 | sem dependências |
| `comlink` 4 | Rodar o MediaPipe num Web Worker sem escrever o protocolo de mensagens à mão | Apache-2.0 | sem dependências |
| `zod` 4 | Esquema único para validar envios de ranking no servidor e no cliente | MIT | sem dependências |
| `@sentry/react` 11 + GlitchTip auto-hospedado | Monitoramento de erros em produção com servidor open source | MIT (SDK) / MIT (GlitchTip) | aceita React 19 |
| `better-sqlite3` ou Postgres no plano gratuito | Ranking compartilhado persistente | MIT / plano gratuito | a decidir com o desenho do ranking |

`@sentry/react` com GlitchTip mantém o custo zero, mas exige hospedar o GlitchTip. O plano gratuito do Sentry é a alternativa mais simples, com limite de eventos.

## 4. Roteiro dos próximos passos

Ordenado por retorno sobre esforço. Os guias de implementação estão em [`MASTER_EVOLUTION_PLAN.md`](MASTER_EVOLUTION_PLAN.md#3-guias-táticos-das-features-sugeridas).

| Prioridade | Item | Esforço | Por quê |
|---|---|---|---|
| 1 | Publicar v0.3.0 (release desta fase) | baixo | O deploy ainda roda Tailwind 3 / Vite 6 / MediaPipe 0.10 |
| 2 | ~~PWA com cache do modelo~~ (entregue em 17/10/2026) | baixo | Segunda visita do modo câmera sem baixar 21 MB de novo |
| 3 | Visão em Web Worker | médio | Libera a thread principal: o laço do jogo deixa de disputar CPU com a inferência |
| 4 | Ranking do desafio com validação por replay | alto | Transforma o desafio diário em competição real e impede pontuação forjada |
| 5 | Telemetria (erros + Web Vitals) | baixo | Falhas de câmera e modelo variam por aparelho |
| 6 | Pausa por gesto (mão aberta) | baixo | Usa o GestureRecognizer do mesmo pacote; o jogador não precisa ir ao teclado |
| 7 | Express 5 e TypeScript 7 | médio | Majors pendentes; ver riscos no plano executivo |

## 5. Competências demonstradas

| Competência | Onde aparece no código |
|---|---|
| Arquitetura de domínio puro | `lib/engine/gameEngine.ts`, `lib/engine/rng.ts` |
| Visão computacional no navegador | `services/visionService.ts`, `hooks/useHandTracking.ts`, `hooks/useCameraController.ts` |
| Tratamento de erros em camadas | `components/ErrorBoundary.tsx`, `lib/errors.ts`, `asyncRoute` em `server/src/server.ts` |
| Segurança web | CSP e Permissions-Policy em `vercel.json`, aplicadas também nos testes (`vite.config.ts`); Helmet, rate limit e validação no servidor |
| Performance | Visão sob demanda (`services/visionLoader.ts`), cache imutável de assets, build Rolldown |
| Acessibilidade | axe em três larguras, gráfico navegável por teclado com tabela equivalente, movimento reduzido |
| Visualização de dados | `components/stats/ScoreChart.tsx`, `lib/stats.ts` |
| Qualidade e CI | `.github/workflows/ci.yml`, `eslint.config.js`, cobertura com piso, teste de integridade dos assets de visão |
| Gestão de dependências | Migrações major isoladas por commit, cada uma validada por diff de estilos e suíte completa |
