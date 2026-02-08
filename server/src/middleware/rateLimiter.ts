import { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export const createRateLimiter = ({ windowMs, maxRequests }: RateLimiterOptions) => {
  const buckets = new Map<string, Bucket>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    buckets.forEach((bucket, key) => {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    });
  }, Math.max(windowMs, 30_000));

  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'Muitas requisições. Tente novamente em instantes.'
      });
    }

    bucket.count += 1;
    buckets.set(ip, bucket);

    return next();
  };
};
