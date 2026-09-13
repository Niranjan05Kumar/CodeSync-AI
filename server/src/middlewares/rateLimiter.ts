import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  code?: string;
  skipFailedRequests?: boolean;
}

/**
 * Factory for creating configured rate limiters with standardized error JSON output
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 300,
    message = 'Too many requests from this IP, please try again later.',
    code = 'RATE_LIMIT_EXCEEDED',
    skipFailedRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          message,
          code,
        },
      });
    },
  });
}

/**
 * Global rate limiter: 300 requests per 15 minutes per IP.
 * Skips health check requests.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.path === '/health' || req.path === '/api/v1/health',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Auth rate limiter: 15 requests per 15 minutes per IP (100 in test mode).
 * Protects login and registration routes against credential stuffing and brute force.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : (process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 15),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Compute rate limiter: 30 requests per minute per IP (200 in test mode).
 * Protects CPU/memory-intensive endpoints (/execute, /ai, /rag).
 */
export const computeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 200 : (process.env.COMPUTE_RATE_LIMIT_MAX ? parseInt(process.env.COMPUTE_RATE_LIMIT_MAX, 10) : 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Compute rate limit reached. Please throttle your requests.',
        code: 'COMPUTE_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});
