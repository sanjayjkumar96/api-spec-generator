import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only bypass authentication in development mode if USE_MOCK_SERVICES is true
    if (config.nodeEnv === 'development' && process.env.USE_MOCK_SERVICES === 'true') {
      req.user = {
        userId: 'dev-user-123',
        email: 'dev@localhost.com',
        role: 'user'
      };
      logger.info('Development mode: bypassing authentication', {});
      next();
      return;
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Optional authentication middleware for routes that work with or without auth
export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Only provide mock user in development mode if USE_MOCK_SERVICES is true
    if (config.nodeEnv === 'development' && process.env.USE_MOCK_SERVICES === 'true') {
      req.user = {
        userId: 'dev-user-123',
        email: 'dev@localhost.com',
        role: 'user'
      };
      next();
      return;
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't return an error, just continue without user
    logger.warn('Optional auth failed:', error);
    next();
  }
};

export const roleMiddleware = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};