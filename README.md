# Fruit Ninja — Shadow Dojo

Jogo de corte com rastreamento de mão em tempo real e modo alternativo por mouse/trackpad. A proposta é entregar uma experiência fluida, precisa e com visual premium, mantendo performance estável em diferentes taxas de quadro e foco total na responsividade do corte.

## Visão geral do projeto
- **Propósito**: oferecer uma experiência de “slice” com sensação de precisão, feedback visual forte e evolução de dificuldade.
- **Público‑alvo**: jogadores casuais e entusiastas de experiências interativas com câmera.
- **Fluxo principal**: escolher o modo de entrada → iniciar a partida → cortar frutas → evitar bombas → manter vidas e combos → ver resultados.

## Tecnologias utilizadas
- **React 19** + **TypeScript**
- **Vite** (build e dev server)
- **Tailwind CSS** (UI moderna e consistente)
- **MediaPipe Tasks Vision** (HandLandmarker)
- **Web APIs** (Canvas, `getUserMedia`, `requestVideoFrameCallback`)

## Funcionalidades principais
- Rastreamento de mão local (privacidade preservada)
- Modo **Mouse/Trackpad** para acessibilidade e testes
- Sistema de **vidas** e **bombas**
- **Combos** com multiplicador de pontuação
- **Dificuldade adaptativa** (spawn e velocidade)
- **Recorde persistente** via `localStorage`
- Painel de **ajustes visuais** (espelho, feed da câmera, trilha, efeitos)

## Instalação e uso

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Testes
```bash
npm run test
```

### Build de produção
```bash
npm run build
npm run preview
```

## Estrutura do projeto
- `App.tsx` — orquestra câmera, estados e fluxo principal
- `components/GameLayer.tsx` — canvas, física, colisões e partículas
- `components/UIOverlay.tsx` — HUD, menus e telas de resultado
- `hooks/useLocalStorage.ts` — persistência segura em `localStorage`
- `hooks/useWindowSize.ts` — dimensionamento responsivo
- `services/visionService.ts` — inicialização do rastreador (GPU/CPU)
- `services/senseiService.ts` — mensagens do sensei
- `public/vision` — assets de visão (modelo e wasm)
- `types.ts` — tipos compartilhados
- `index.css` — identidade visual e estilos globais

## Boas práticas aplicadas
- Loop do jogo desacoplado do estado do React para garantir 60 FPS
- Física baseada em **delta time** para consistência
- Cleanup de streams de câmera e listeners
- Fallback automático GPU → CPU no MediaPipe
- UI com hierarquia visual clara e acessibilidade básica

## Possíveis melhorias futuras
- Efeitos sonoros e feedback háptico
- Leaderboard online com autenticação
- Novos modos (Time Attack, Zen, Treino)
- Analytics de performance e precisão
- Suporte a múltiplas mãos

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
