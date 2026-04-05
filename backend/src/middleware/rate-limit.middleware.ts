import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDev ? 1000 : env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 5, // relaxed in dev
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Per-user rate limiter - keyed by authenticated user ID.
 * More generous than general limiter since it's per-user, not per-IP.
 */
export const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: isDev ? 500 : 200, // 200 requests per user per minute
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em instantes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !((req as any).user), // Only apply to authenticated users
});

export const trackingWebhookLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 500 : 30,
  message: {
    success: false,
    error: 'Rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const platformWebhookLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 1000 : 300,
  message: {
    success: false,
    error: 'Rate limit exceeded for platform webhooks',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const redirectLimiter = rateLimit({
  windowMs: 60_000,
  max: isDev ? 1000 : 120,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});
