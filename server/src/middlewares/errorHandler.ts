import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle custom ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Handle JSON parsing syntax errors from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload',
        code: 'INVALID_JSON'
      }
    });
  }

  // Handle common PostgreSQL errors
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({
      success: false,
      error: {
        message: 'A record with this identifier already exists',
        code: 'DUPLICATE_KEY',
        ...(process.env.NODE_ENV !== 'production' && err.detail ? { detail: err.detail } : {})
      }
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      success: false,
      error: {
        message: 'Referenced foreign record does not exist',
        code: 'FOREIGN_KEY_VIOLATION'
      }
    });
  }

  if (err.code === '22P02') {
    // Invalid UUID / type representation
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid parameter type or UUID format',
        code: 'INVALID_TYPE'
      }
    });
  }

  // Fallback to 500 Internal Server Error with production masking
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Exception]:', err);
  }

  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Unknown error occurred'),
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
}
