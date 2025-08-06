import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Ensure CORS headers are always present in error responses
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control, Origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Log error
  logger.error('Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode: err.statusCode,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });

  // Handle JSON parsing errors (payload decoding issues)
  if (err.type === 'entity.parse.failed' || err.message?.includes('JSON')) {
    const message = 'Invalid JSON payload - please check your request format';
    error = { name: 'JSONParseError', message, statusCode: 400 } as CustomError;
  }

  // Handle payload too large errors
  if (err.type === 'entity.too.large') {
    const message = 'Request payload too large';
    error = { name: 'PayloadTooLargeError', message, statusCode: 413 } as CustomError;
  }

  // Handle encoding errors
  if (err.message?.includes('encoding') || err.message?.includes('charset')) {
    const message = 'Content encoding error - please check your request encoding';
    error = { name: 'EncodingError', message, statusCode: 400 } as CustomError;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { name: 'CastError', message, statusCode: 404 } as CustomError;
  }

  // Mongoose duplicate key
  if (err.code === '11000') {
    const message = 'Duplicate field value entered';
    error = { name: 'DuplicateError', message, statusCode: 400 } as CustomError;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    error = { name: 'ValidationError', message, statusCode: 400 } as CustomError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { name: 'JsonWebTokenError', message, statusCode: 401 } as CustomError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { name: 'TokenExpiredError', message, statusCode: 401 } as CustomError;
  }

  // CORS-related errors
  if (err.message?.includes('CORS') || err.message?.includes('cross-origin')) {
    const message = 'Cross-origin request error';
    error = { name: 'CORSError', message, statusCode: 400 } as CustomError;
  }

  // Network/timeout errors
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    const message = 'Network connection error';
    error = { name: 'NetworkError', message, statusCode: 502 } as CustomError;
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: error.message || 'Server Error',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.name 
    })
  };

  res.status(statusCode).json(response);
};