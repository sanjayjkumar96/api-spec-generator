import { app } from './app';
import { logger } from './utils/logger';
import { config } from './config/aws';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Using mock services: ${config.useMockServices}`);
  if (!config.useMockServices) {
    logger.info('AWS services configured for production use');
  }
});