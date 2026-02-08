import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { isValidLeaderboardSubmission, normalizeSubmission } from '../../lib/leaderboard';
import { createFileLeaderboardRepository } from './domain/leaderboardRepository';
import { createRateLimiter } from './middleware/rateLimiter';

const PORT = Number(process.env.PORT ?? 3333);
const API_PREFIX = '/api/v1';

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();
const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin não permitida pelo CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS']
  })
);
app.use(express.json({ limit: '16kb' }));
app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 120 }));

const leaderboardRepository = createFileLeaderboardRepository();

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get(`${API_PREFIX}/leaderboard`, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const entries = await leaderboardRepository.list(limit);
    res.json({
      entries,
      total: entries.length
    });
  } catch (error) {
    next(error);
  }
});

app.post(`${API_PREFIX}/leaderboard`, async (req, res, next) => {
  try {
    if (!isValidLeaderboardSubmission(req.body)) {
      return res.status(400).json({
        error: 'Payload inválido. Envie player, score, accuracy, maxCombo e inputMode.'
      });
    }

    const payload = normalizeSubmission(req.body);
    const entries = await leaderboardRepository.add(payload);

    return res.status(201).json({
      entries,
      total: entries.length
    });
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada.'
  });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API ERROR]', error.message);
  if (error.message.includes('CORS')) {
    return res.status(403).json({ error: error.message });
  }

  return res.status(500).json({
    error: 'Erro interno do servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`[leaderboard-api] running on http://localhost:${PORT}${API_PREFIX}`);
});
