import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { documentsRouter } from './routes/documents';
import { promptsRouter } from './routes/prompts';
import { config } from './config/aws';
import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    mockServices: config.useMockServices
  });
});

// Routes for Lambda (serverless-http)
app.use('/auth', authRouter);
app.use('/documents', documentsRouter);
app.use('/prompts', promptsRouter);

// Routes for local development with /api prefix
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/prompts', promptsRouter);

export { app };