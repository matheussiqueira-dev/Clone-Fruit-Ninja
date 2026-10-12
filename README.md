# Shadow Dojo

Jogo de corte no navegador: corte frutas com a ponta do indicador diante da webcam ou com o mouse. Inspirado em Fruit Ninja, sem afiliação.

[![Case no portfólio](https://img.shields.io/badge/Case-Portf%C3%B3lio-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.matheussiqueira.dev/pt-BR/projects/fruit-ninja)
[![Código](https://img.shields.io/badge/C%C3%B3digo-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/matheussiqueira-dev/Clone-Fruit-Ninja)

## Como se joga

- Frutas sobem do fundo do palco. Corte com um movimento: o cursor ou o dedo parado não corta.
- Cortes em sequência rápida formam combos de até x5, que multiplicam os pontos.
- Cortar uma bomba (a esfera com anel tracejado) encerra a partida. Três frutas no chão também.
- A fruta cortada se parte em duas metades na direção exata do corte.

### Modos

| Modo | Como funciona | Requisitos |
|---|---|---|
| Câmera | O [HandLandmarker do MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) rastreia a ponta do indicador (landmark 8). O vídeo é processado no navegador e não é enviado. | Webcam, HTTPS (ou localhost), boa iluminação |
| Mouse | Arraste o cursor (ou o dedo, em telas de toque) sobre as frutas. | Nenhum |

Atalhos: `Enter` começa, `M` troca o modo e `R` atualiza os resultados.

### Limites conhecidos

- O modelo rastreia uma mão só. Pouca luz ou fundo com a cor da pele reduzem a precisão.
- Na primeira vez, o modo câmera baixa o modelo (7,8 MB) e o runtime WASM (cerca de 11 MB), servidos pelo próprio site.
- Sem câmera, com a permissão negada, com a câmera em uso ou se o modelo não carregar, o jogo mostra uma mensagem própria e o modo mouse continua disponível.

## Onde ficam os resultados

Sem uma API configurada, que é o caso do deploy estático, os resultados ficam **neste navegador** (`localStorage`). A tela diz isso ("Seus melhores resultados · Salvo neste navegador").

O servidor opcional em `server/` (Express) oferece um ranking compartilhado para desenvolvimento local. Ele grava num arquivo JSON e não roda numa hospedagem estática.

## Stack

- React 19, TypeScript 5.8 e Vite 6.
- Tailwind CSS 3 mapeado para o design system compartilhado `ms-tokens.css` v1.0, com IBM Plex Sans servida pelo próprio site.
- MediaPipe Tasks Vision 0.10.32, com WASM e modelo em `public/vision/` (Apache 2.0, Google).
- Express 4 + Helmet no servidor opcional de ranking.
- Vitest (unitários) e Playwright + axe (ponta a ponta e acessibilidade).

## Rodar localmente

Pré-requisitos: Node.js 20+ e npm 10+.

```bash
npm ci
npm run dev
```

O jogo abre em `http://localhost:3000`. Para o ranking compartilhado local, rode em outro terminal:

```bash
npm run dev:server
```

Em `localhost`, o jogo usa esse servidor (`/api/v1`). Se ele não estiver rodando, os resultados ficam no navegador e o painel avisa.

### Variáveis de ambiente

Veja `.env.example`. No deploy estático, deixe `VITE_LEADERBOARD_API_URL` vazia: assim os resultados ficam no navegador.

| Variável | Onde | Uso |
|---|---|---|
| `VITE_LEADERBOARD_API_URL` | build do front | URL de uma API de ranking. Vazia = resultados no navegador (exceto em localhost) |
| `PORT` | servidor opcional | Porta do Express (padrão 3333) |
| `CORS_ORIGIN` | servidor opcional | Origens permitidas, separadas por vírgula |

## Qualidade

```bash
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # build de produção em dist/
npm run e2e         # Playwright (Edge local; Chromium no CI)
```

- O CI (`.github/workflows/ci.yml`) roda typecheck, testes, build, build do servidor, audit e a suíte de ponta a ponta em cada PR.
- A suíte de ponta a ponta cobre a partida no modo mouse, o cursor parado, o salvamento local e as falhas de câmera (simuladas). O axe roda no menu e no fim de jogo em 320, 768 e 1280 px.
- O `npm audit` não aponta nenhum alerta crítico. Os alertas altos restantes vêm da cadeia de build do Tailwind 3 (`braces`, `micromatch`, `chokidar`, `fast-glob`): negação de serviço por padrões glob, que só roda no build e com a configuração do próprio repositório. Corrigir exige migrar para o Tailwind 4.
- O `ms-tokens.css` é copiado do padrão, sem edição. Um teste confere o SHA-256 dele.

## Deploy

Site estático na Vercel (`vercel.json`): build `npm run build`, saída `dist/`. Os headers incluem uma CSP que permite o WASM (`'wasm-unsafe-eval'`) e `Permissions-Policy: camera=(self)`.

## Estrutura

```text
App.tsx                 shell: header, HUD, palco, telas e rodapé
components/             telas (menu, carregamento, fim de jogo), HUD, ajustes, ranking, canvas do jogo
config/                 regras do jogo, paleta de arte do canvas, links do projeto
hooks/                  câmera, rastreamento de mão e ponteiro, ranking, atalhos
lib/                    lógica pura testada (física, combos, câmera, estatísticas, ranking)
services/               visão computacional (MediaPipe) e ranking (local ou API)
server/                 servidor opcional de ranking (Express) e contrato OpenAPI
styles/ms-tokens.css    design system compartilhado (não editar)
e2e/                    testes Playwright
public/vision/          runtime WASM e modelo do MediaPipe
```

---

### Desenvolvido por Matheus Siqueira

**Analista de Dados & BI | Power BI • SQL • Python • DAX | ETL, Modelagem de Dados, KPIs e Automação**

Conecte-se e acesse meus projetos:

[![Portfólio](https://img.shields.io/badge/Portf%C3%B3lio-matheussiqueira.dev-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.matheussiqueira.dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Matheus_Siqueira-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/matheussiqueira-dev)
[![GitHub](https://img.shields.io/badge/GitHub-matheussiqueira--dev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/matheussiqueira-dev)
[![E-mail](https://img.shields.io/badge/E--mail-hellomatheusdev%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:hellomatheusdev@gmail.com)

<sub>Design system compartilhado ms-tokens v1.0 · IBM Plex Sans</sub>
