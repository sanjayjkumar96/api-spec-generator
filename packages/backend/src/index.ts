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
const PORT = process.env.PORT || 3001;

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

app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/prompts', promptsRouter);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Using mock services: ${config.useMockServices}`);
  if (!config.useMockServices) {
    logger.info('AWS services configured for production use');
  }
});