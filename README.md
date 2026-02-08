# Fruit Ninja - Shadow Dojo

Jogo web interativo de corte com rastreamento de mão em tempo real (MediaPipe) e modo alternativo por mouse/trackpad, agora evoluído com arquitetura em camadas, leaderboard com API versionada e experiência visual de nível produção.

## Visão geral

### Propósito do produto
Entregar uma experiência de gameplay rápida, responsiva e intuitiva, com foco em:
- Alta sensação de controle (precisão do corte).
- Recompensa por habilidade (combo, acurácia, ranking).
- Baixa fricção de entrada (fallback para mouse sem câmera).

### Público-alvo
- Jogadores casuais em desktop.
- Usuários sem hardware avançado de câmera.
- Portfólio técnico para demonstração de engenharia fullstack + UX/UI.

## Principais melhorias implementadas

### Arquitetura e estrutura
- Refatoração do `App.tsx` para orquestração limpa via hooks especializados.
- Separação explícita de responsabilidades:
  - `hooks/useCameraController.ts` para ciclo de vida da câmera.
  - `hooks/useHandTracking.ts` e `hooks/usePointerTracking.ts` para entradas.
  - `hooks/useGameHotkeys.ts` para acessibilidade por teclado.
  - `hooks/useLeaderboard.ts` + `services/leaderboardService.ts` para dados de ranking.
- Centralização de constantes e defaults em `config/gameConfig.ts`.
- Validação/normalização de leaderboard reutilizável em `lib/leaderboard.ts` (DRY).

### Frontend + UX/UI
- Redesign completo da interface com novo design system visual:
  - Tokens visuais em `index.css` (cores, glassmorphism, tipografia, atmosfera).
  - Layout responsivo e hierarquia de informação aprimorada.
  - Painel de ranking no menu e no game over.
- Melhorias de acessibilidade:
  - Atalhos de teclado (`Enter`, `M`, `R`).
  - `aria-live` para feedback de status/erros.
  - Estados de foco visíveis e melhores affordances.
- Melhorias de performance:
  - `devicePixelRatio` limitado no canvas para reduzir custo em telas de alta densidade.
  - Loop do canvas pausado fora do estado de jogo.
  - Controle de resize com `requestAnimationFrame`.

### Backend, APIs, dados e segurança
- Criação de backend dedicado para ranking em `server/`.
- API REST versionada: `/api/v1/leaderboard`.
- Segurança reforçada:
  - `helmet` para hardening de headers.
  - CORS configurável por ambiente (`CORS_ORIGIN`).
  - Rate limiting in-memory por IP.
  - Validação de payload com regras de domínio.
- Persistência em arquivo JSON com fila de escrita para evitar race conditions.
- Contrato OpenAPI em `server/openapi.yaml`.

### Novas features
- Leaderboard persistente com integração frontend-backend.
- Fallback automático para leaderboard local (`localStorage`) quando a API estiver indisponível.
- Salvamento de alias do jogador para reutilização em novas partidas.

### Qualidade e boas práticas
- Testes unitários e de domínio adicionados/expandidos:
  - `lib/gameLogic.test.ts`
  - `lib/leaderboard.test.ts`
  - `server/src/domain/leaderboardRepository.test.ts`
- Build e testes validados localmente com sucesso.

## Arquitetura técnica

### Frontend (React + TypeScript)
- **Camada de apresentação**: `components/`
- **Camada de aplicação**: `App.tsx` + hooks de orquestração
- **Camada de domínio**: `lib/gameLogic.ts` e `lib/leaderboard.ts`
- **Camada de infraestrutura**: `services/visionService.ts` e `services/leaderboardService.ts`

### Backend (Node + Express)
- **Entrada HTTP**: `server/src/server.ts`
- **Middleware transversal**: `server/src/middleware/rateLimiter.ts`
- **Domínio/persistência**: `server/src/domain/leaderboardRepository.ts`
- **Contrato**: `server/openapi.yaml`

## Stack e tecnologias

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- MediaPipe Tasks Vision

### Backend
- Node.js
- Express
- Helmet
- CORS

### Qualidade
- Vitest

## Estrutura do projeto

```text
.
|-- App.tsx
|-- components/
|   |-- GameLayer.tsx
|   `-- UIOverlay.tsx
|-- config/
|   `-- gameConfig.ts
|-- hooks/
|   |-- useCameraController.ts
|   |-- useGameHotkeys.ts
|   |-- useHandTracking.ts
|   |-- useLeaderboard.ts
|   |-- useLocalStorage.ts
|   |-- usePointerTracking.ts
|   |-- useReducedMotion.ts
|   `-- useWindowSize.ts
|-- lib/
|   |-- gameLogic.ts
|   |-- gameLogic.test.ts
|   |-- leaderboard.ts
|   `-- leaderboard.test.ts
|-- services/
|   |-- leaderboardService.ts
|   |-- senseiService.ts
|   `-- visionService.ts
|-- server/
|   |-- data/leaderboard.json
|   |-- openapi.yaml
|   `-- src/
|       |-- domain/leaderboardRepository.ts
|       |-- middleware/rateLimiter.ts
|       `-- server.ts
`-- types.ts
```

## Instalação e execução

### Pré-requisitos
- Node.js 20+
- npm 10+

### Instalação
```bash
npm install
```

### Rodar frontend
```bash
npm run dev
```

### Rodar backend (ranking)
```bash
npm run dev:server
```

### Rodar frontend + backend
- Terminal 1: `npm run dev`
- Terminal 2: `npm run dev:server`

### Variáveis de ambiente
Copie `.env.example` e ajuste se necessário:

```env
VITE_LEADERBOARD_API_URL=/api/v1
PORT=3333
# CORS_ORIGIN=http://localhost:3000
```

## API (resumo)

### `GET /api/v1/health`
Healthcheck do serviço.

### `GET /api/v1/leaderboard?limit=10`
Retorna ranking ordenado por score/acurácia/combo.

### `POST /api/v1/leaderboard`
Payload:

```json
{
  "player": "Matheus",
  "score": 120,
  "accuracy": 87,
  "maxCombo": 5,
  "inputMode": "camera"
}
```

Contrato completo em `server/openapi.yaml`.

## Testes e validação

### Testes
```bash
npm run test:run
```

### Build frontend
```bash
npm run build
```

### Build backend
```bash
npm run build:server
```

## Boas práticas adotadas
- Separação de responsabilidades por camada.
- Princípios DRY (normalização/validação compartilhada).
- Fallback resiliente para indisponibilidade de API.
- Tratamento de erro explícito no frontend e backend.
- Acessibilidade e responsividade como requisitos de primeira classe.
- Segurança mínima para produção (CORS, helmet, rate limiting, validação).

## Possíveis melhorias futuras
- Autenticação e perfis de jogador (JWT/session).
- Banco de dados relacional (PostgreSQL) para leaderboard persistente.
- WebSockets para ranking em tempo real.
- Observabilidade (logs estruturados, métricas e tracing).
- Modos adicionais de jogo (Time Attack, Zen, Daily Challenge).
- e2e tests com Playwright.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
