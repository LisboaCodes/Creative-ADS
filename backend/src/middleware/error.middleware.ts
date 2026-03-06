import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // AppError - custom operational errors with proper status codes
  if (error instanceof AppError) {
    logger.warn('Operational error:', {
      error: error.message,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId,
    });

    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error:', {
      errors: error.errors,
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId,
    });

    return res.status(422).json({
      success: false,
      error: 'Dados inválidos',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Unexpected errors
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    requestId: (req as any).requestId,
  });

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
      stack: error.stack,
    }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.path,
  });
}
