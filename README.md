# Fruit Ninja

Jogo de corte com rastreamento de mão usando a câmera. Use o indicador como lâmina, marque pontos e evite bombas.

## Recursos
- Rastreamento de mão em tempo real
- Física baseada em delta time para consistência entre FPS
- Partículas e trilha com custo controlado
- Mensagens do sensei baseadas no desempenho

## Como rodar
1. `npm install`
2. `npm run dev`

## Build
- `npm run build`
- `npm run preview`

## Estrutura
- `App.tsx` — orquestra câmera, estado e loop de rastreamento
- `components/GameLayer.tsx` — canvas, física e colisões
- `components/UIOverlay.tsx` — HUD e telas
- `services/visionService.ts` — inicialização do rastreador
- `services/senseiService.ts` — mensagens locais do sensei
- `public/vision` — arquivos do modelo e wasm

## Autor
Projeto desenvolvido por Matheus Siqueira
