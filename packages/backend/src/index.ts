import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import serverless from 'serverless-http';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';

// Route imports
import authRoutes from './controllers/authController';
import jobRoutes from './controllers/jobController';
import promptRoutes from './controllers/promptController';
import { LoggerMiddleware } from './utils/logger.middleware';

const app = express();
app.use(LoggerMiddleware.setRequestContext)
.use(LoggerMiddleware.setCorrelationID);

// Security middleware with relaxed settings for CORS compatibility
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Very permissive CORS configuration - allow all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: false, // Don't require credentials
}));


// More permissive JSON parsing with better error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      logger.error('JSON parsing error:', { error: err, body: buf.toString().substring(0, 500) });
      // Don't throw here, let express handle it
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    origin: req.get('Origin'),
    contentType: req.get('Content-Type')
  });
  next();
});

// Middleware to ensure proper response headers for content encoding
app.use((req, res, next) => {
  // Override res.json to ensure proper headers
  const originalJson = res.json;
  res.json = function(obj) {
    // Ensure content-type is set properly
    if (!res.get('Content-Type')) {
      res.type('application/json');
    }
    
    // Add cache control headers to prevent caching issues
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return originalJson.call(this, obj);
  };
  
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SpecGen AI Backend API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/jobs', authMiddleware, jobRoutes);
app.use('/prompts', authMiddleware, promptRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use(errorHandler)
.use(LoggerMiddleware.requestInfoLogger);

// Local development server
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = config.port || 3001;
  
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`, {
      port: PORT,
      environment: config.nodeEnv,
      mockServices: process.env.USE_MOCK_SERVICES === 'true'
    });
    
    if (process.env.USE_MOCK_SERVICES === 'true') {
      logger.info('🔧 Running with mock services for local development', {});
      logger.info('📝 Mock data includes:', {});
      logger.info('   - Sample prompts for all job types', {});
      logger.info('   - Mock AI content generation', {});
      logger.info('   - In-memory job processing simulation', {});
    }
  });
}

// Export for serverless
export const handler = serverless(app, {
  binary: false
});

// Export app for local development
export default app;