# Changelog

Todas as mudanças relevantes deste projeto. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões [SemVer](https://semver.org/lang/pt-BR/).

## Não lançado

### Alterado
- Tailwind CSS 4 com o plugin do Vite; sem PostCSS nem autoprefixer. O texto do corpo segue a altura de linha do design system (1,6).
- Vite 8 (Rolldown): build de produção em menos de 1 s e JS inicial 2,5% menor.
- MediaPipe Tasks Vision 1.1.1. O runtime WASM passa de 11,5 MB para 13,5 MB.
- React 19.3 e demais dependências atualizadas dentro da faixa.
- CI em Node 24, com lint, formatação, cobertura e `npm audit` sem exceções.

### Adicionado
- ESLint com regras que usam os tipos, Prettier e cobertura do domínio com piso de 80%.
- `npm run sync:vision` e um teste que falha se o WASM servido diferir do pacote instalado.
- Teste de ponta a ponta da partida com câmera (modelo real, câmera sintética).
- A suíte de ponta a ponta roda sob a CSP de produção.
- `PROJECT_OVERVIEW.md`, `ROADMAP_AND_SKILLS.md` e `MASTER_EVOLUTION_PLAN.md`.

### Corrigido
- Um nome de jogador que não era texto passava na validação do ranking como `"[object Object]"`.
- O WASM servido do MediaPipe era de uma versão anterior à do JS instalado.
- O servidor de ranking não encaminhava erros de rotas assíncronas ao tratador de erros.
- O diálogo de ajustes perdia a centralização com o Tailwind 4 (pego no diff de estilos, antes de publicar).

### Segurança
- `npm audit` zerado: os alertas da cadeia de build do Tailwind 3 e o do esbuild sumiram.

## 0.2.0 - 2026-10-15

### Adicionado
- Desafio diário: a mesma sequência de frutas para todos no dia, com link `?desafio=AAAA-MM-DD`.
- Painel "Seu desempenho" com as últimas 100 partidas: KPIs, tendência, gráfico acessível pelo teclado e tabela.
- Compartilhar resultado pela folha de compartilhamento do aparelho ou pela área de transferência.
- Tela de erro com "Recarregar" e registro central de erros inesperados.
- Documento de evolução técnica e de produto em `docs/EVOLUCAO.md`.

### Alterado
- Motor do jogo extraído para `lib/engine`, puro e testado; o canvas só desenha.
- TypeScript em modo `strict`, com os tipos do React, Express e CORS.
- O código de visão computacional só é baixado no modo câmera (JS inicial 33% menor).

### Corrigido
- Os testes de câmera falhavam no Chromium do CI, que esconde `mediaDevices` na origem de teste.

## 0.1.0 - 2026-10-12

### Adicionado
- Nome próprio: Shadow Dojo. O jogo original aparece só como inspiração no README.
- A fruta cortada se parte em duas metades na direção do corte, com a polpa à mostra. Uma mancha de suco seca em 1,5 s.
- Header, rodapé de autoria, favicon "SD" e metadados no padrão compartilhado.
- Mensagens distintas para permissão negada, câmera ausente, câmera em uso, página sem acesso à câmera e falha ao carregar o modelo da mão. O modo mouse continua disponível em todas.
- O carregamento da câmera nomeia a etapa ("Carregando modelo da mão", "Abrindo a câmera").
- O fim de jogo diz por que a partida acabou (bomba ou três frutas no chão).
- `vercel.json` com CSP que permite o WASM do MediaPipe e `Permissions-Policy: camera=(self)`.
- CI com typecheck, testes, build, audit e Playwright. Testes de ponta a ponta do modo mouse, das falhas de câmera e de acessibilidade (axe em 320, 768 e 1280 px).

### Alterado
- Interface migrada para o design system `ms-tokens.css` v1.0: IBM Plex Sans servida pelo próprio site, acento único e cards planos, sem vidro nem brilho.
- O ranking diz onde os resultados ficam: "Seus melhores resultados · Salvo neste navegador" quando não há API. Antes dizia "Ranking global".
- HUD numa faixa única de 48 px durante a partida. O palco ocupa o espaço entre o HUD e o rodapé.
- Ajustes num diálogo nativo, com interruptores acessíveis.
- Textos da interface em português e números em pt-BR.
- O servidor de desenvolvimento do Vite escuta só em `localhost`.

### Corrigido
- O cursor ou a mão parados cortavam o que passava por eles. Agora só um movimento corta.
- As frutas subiam muito além do topo e demoravam dezenas de segundos para voltar. O arco agora é calculado pela altura do palco.
- Em telas de celular, o botão de iniciar e o rodapé ficavam fora da tela, sem como rolar.
- `Enter` não iniciava a partida depois de escolher o modo.
- `tsc --noEmit` falhava (tipos do Vite e fallback de `matchMedia`).
- O teste do servidor rodava duas vezes, uma delas pela cópia compilada.

### Segurança
- `.env` e os dados de runtime do ranking (`server/data/leaderboard.runtime.json`) ficam fora do Git.
- Dependências atualizadas por `npm audit fix` (Express, Vite, PostCSS, Vitest). Restam só alertas da cadeia de build do Tailwind 3.

