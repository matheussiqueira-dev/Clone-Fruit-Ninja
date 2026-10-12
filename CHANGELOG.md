# Changelog

Todas as mudanças relevantes deste projeto. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões [SemVer](https://semver.org/lang/pt-BR/).

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

