# Fruit Ninja

Experiência de corte com rastreamento de mão em tempo real. Use o indicador como lâmina, acumule pontos e evite bombas. Pensado para resposta rápida, visual limpo e execução consistente em diferentes taxas de quadros.

## Destaques
- Rastreamento de mão local, sem envio de dados para servidores
- Física baseada em delta time para consistência entre FPS
- Loop de jogo otimizado com menor trabalho fora do estado ativo
- Partículas e trilha com custo controlado
- Mensagens do sensei baseadas no desempenho

## Requisitos
- Navegador moderno com acesso à câmera
- Ambiente Node para instalação e execução local

## Instalação
```bash
npm install
```

## Desenvolvimento
```bash
npm run dev
```

## Build de produção
```bash
npm run build
npm run preview
```

## Estrutura do projeto
- `App.tsx` — orquestra câmera, estado e loop de rastreamento
- `components/GameLayer.tsx` — canvas, física e colisões
- `components/UIOverlay.tsx` — HUD e telas
- `services/visionService.ts` — inicialização do rastreador
- `services/senseiService.ts` — mensagens locais do sensei
- `public/vision` — assets de visão (modelo e wasm)

## Operação
1. Permita o acesso à câmera quando solicitado.
2. Mantenha a mão visível, com o indicador livre.
3. Faça cortes curtos e rápidos para maior precisão.

## Autoria
Matheus Siqueira

## Site
www.matheussiqueira.dev
