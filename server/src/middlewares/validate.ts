import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        const primaryMessage = details.map((d) => d.message).join('. ') || 'Validation error';
        next(ApiError.badRequest(primaryMessage, 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        const primaryMessage = details.map((d) => d.message).join('. ') || 'Query validation error';
        next(ApiError.badRequest(primaryMessage, 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        const primaryMessage = details.map((d) => d.message).join('. ') || 'Parameter validation error';
        next(ApiError.badRequest(primaryMessage, 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
};
