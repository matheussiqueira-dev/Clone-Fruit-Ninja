# Shadow Dojo

Jogo de corte no navegador: corte frutas com a ponta do indicador diante da webcam ou com o mouse. Inspirado em Fruit Ninja, sem afiliação.

[![Case no portfólio](https://img.shields.io/badge/Case-Portf%C3%B3lio-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.matheussiqueira.dev/pt-BR/projects/fruit-ninja)
[![Código](https://img.shields.io/badge/C%C3%B3digo-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/matheussiqueira-dev/Clone-Fruit-Ninja)

## Como se joga

- Frutas sobem do fundo do palco. Corte com um movimento: o cursor ou o dedo parado não corta.
- Cortes em sequência rápida formam combos de até x5, que multiplicam os pontos.
- Você tem cinco vidas. Cada fruta no chão e cada bomba 💣 cortada (anel tracejado) tira uma; o coração 💖 devolve uma.
- A fruta cortada se parte em duas metades na direção exata do corte.

### Modos

| Modo | Como funciona | Requisitos |
|---|---|---|
| Câmera | O [HandLandmarker do MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) rastreia a ponta do indicador (landmark 8). O vídeo é processado no navegador e não é enviado. | Webcam, HTTPS (ou localhost), boa iluminação |
| Mouse | Arraste o cursor (ou o dedo, em telas de toque) sobre as frutas. | Nenhum |

Atalhos: `Enter` começa, `M` troca o modo e `R` atualiza os resultados.

### Desafio diário, desempenho e compartilhamento

- **Desafio do dia:** a mesma sequência de frutas para todo mundo no mesmo dia, gerada por uma semente derivada da data. Um link `?desafio=AAAA-MM-DD` abre o desafio daquele dia; datas futuras ou inválidas caem no dia de hoje.
- **Seu desempenho** (`#desempenho`): as últimas 100 partidas ficam neste navegador. O painel mostra partidas, melhor pontuação, média, precisão média e a evolução em gráfico, com navegação pelo teclado e uma tabela com os mesmos dados.
- **Compartilhar:** no fim da partida, envia o resultado e o link pela folha de compartilhamento do aparelho ou copia para a área de transferência.

### Instalar e jogar offline

O Shadow Dojo é um PWA: o navegador oferece instalá-lo (ícone de instalar na barra de endereço ou "Adicionar à tela inicial"), e ele abre em janela própria. Depois de uma visita online, o menu e o modo mouse funcionam sem conexão; o modo câmera também, se ele já foi usado online uma vez.

- O service worker pré-carrega só o shell (HTML, JS, CSS, fontes e SVG, cerca de 480 KB).
- O modelo, o runtime WASM e o módulo de visão entram no cache só quando o modo câmera é usado, então quem joga com o mouse não os baixa. O nome do cache leva a versão instalada de `@mediapipe/tasks-vision` (por exemplo `vision-assets-1.1.1`): ao atualizar o pacote, o cache começa do zero e o da versão anterior é apagado, para nunca juntar WASM antigo com JS novo.
- Ícone: ainda não há PNGs no repositório, então o manifesto usa o `favicon.svg` (tamanho `any`). Alguns sistemas exibem ícones PNG melhor; gerá-los fica como melhoria.

### Limites conhecidos

- O modelo rastreia uma mão só. Pouca luz ou fundo com a cor da pele reduzem a precisão.
- Na primeira vez, o modo câmera baixa o modelo (7,8 MB) e o runtime WASM (cerca de 13,5 MB), servidos pelo próprio site. Depois disso eles ficam no cache do service worker e não são baixados de novo.
- Sem câmera, com a permissão negada, com a câmera em uso ou se o modelo não carregar, o jogo mostra uma mensagem própria e o modo mouse continua disponível.

## Onde ficam os resultados

Sem uma API configurada, que é o caso do deploy estático, os resultados ficam **neste navegador** (`localStorage`). A tela diz isso ("Seus melhores resultados · Salvo neste navegador").

O servidor opcional em `server/` (Express) oferece um ranking compartilhado para desenvolvimento local. Ele grava num arquivo JSON e não roda numa hospedagem estática.

## Stack

- React 19, TypeScript 5.8 e Vite 8 (Rolldown).
- Tailwind CSS 4 (plugin do Vite) mapeado para o design system compartilhado `ms-tokens.css` v1.0, com IBM Plex Sans servida pelo próprio site.
- MediaPipe Tasks Vision 1.1.1, com WASM e modelo em `public/vision/` (Apache 2.0, Google).
- `vite-plugin-pwa` 2.0 (MIT) com Workbox: manifesto e service worker.
- Express 4 + Helmet no servidor opcional de ranking.
- Vitest com cobertura (unitários), Playwright + axe (ponta a ponta e acessibilidade), ESLint com tipos e Prettier.

Arquitetura, lógica central e decisões: [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md). Roteiro e bibliotecas: [`ROADMAP_AND_SKILLS.md`](ROADMAP_AND_SKILLS.md). Plano executivo e próximas features: [`MASTER_EVOLUTION_PLAN.md`](MASTER_EVOLUTION_PLAN.md).

## Rodar localmente

Pré-requisitos: Node.js 22.12+ (o CI usa o 24) e npm 10+.

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
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint com regras que usam os tipos
npm run format:check   # Prettier
npm test               # Vitest
npm run test:coverage  # Vitest com cobertura do domínio (piso de 80%)
npm run build          # build de produção em dist/
npm run e2e            # Playwright (Edge local; Chromium no CI)
```

- O CI (`.github/workflows/ci.yml`, Node 24) roda typecheck, lint, formatação, testes com cobertura, build, build do servidor, `npm audit` e a suíte de ponta a ponta em cada PR.
- A suíte de ponta a ponta roda sob a CSP do `vercel.json` (o `vite preview` envia os mesmos headers) e cobre a partida no modo mouse, o cursor parado, o salvamento local, a partida com câmera (modelo real, câmera sintética), as falhas de câmera (simuladas), o desafio diário, o painel de desempenho, o compartilhamento e o uso offline (menu e partida no mouse sem rede, sem baixar `/vision/`; modo câmera offline depois de uma sessão online). O axe roda no menu, no fim de jogo e no painel em 320, 768 e 1280 px.
- TypeScript em modo `strict` no front e no servidor.
- O `npm audit` não aponta nenhum alerta, e o CI falha se aparecer algum.
- O runtime WASM em `public/vision/wasm` é cópia exata do pacote instalado. Depois de mudar a versão de `@mediapipe/tasks-vision`, rode `npm run sync:vision`; um teste confere o SHA-256 de cada arquivo.
- O `ms-tokens.css` é copiado do padrão, sem edição. Um teste confere o SHA-256 dele.

## Deploy

Site estático na Vercel (`vercel.json`): build `npm run build`, saída `dist/`. Os headers incluem uma CSP que permite o WASM (`'wasm-unsafe-eval'`) e `Permissions-Policy: camera=(self)`. A diretiva `worker-src 'self' blob:` permite o service worker (`/sw.js`), e a suíte de ponta a ponta confirma isso sob a mesma CSP.

## Estrutura

```text
App.tsx                 shell: header, HUD, palco, telas e rodapé
components/             telas (menu, carregamento, fim de jogo, desempenho), HUD, ajustes, ranking, canvas do jogo
components/game/        renderização do canvas (só desenho)
config/                 regras do jogo, paleta de arte do canvas, links do projeto
hooks/                  câmera, rastreamento de mão e ponteiro, ranking, atalhos
lib/engine/             motor do jogo puro e semeável (física, corte, pontuação, vidas)
lib/                    lógica pura testada (histórico, compartilhamento, câmera, estatísticas, erros, ranking)
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
