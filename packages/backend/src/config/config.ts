import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    stage: process.env.STAGE || 'dev'
  },
  
  // DynamoDB Tables
  tables: {
    jobs: process.env.JOBS_TABLE || 'spec-gen-ai-dev-jobs-dev',
    users: process.env.USERS_TABLE || 'spec-gen-ai-dev-users-dev',
    prompts: process.env.PROMPTS_TABLE || 'spec-gen-ai-dev-prompts-dev'
  },
  
  // S3 Configuration
  s3: {
    bucket: process.env.S3_BUCKET || 'spec-gen-ai-dev-outputs-dev'
  },
  
  // Step Functions
  stepFunctions: {
    stateMachineArn: process.env.STATE_MACHINE_ARN || 'arn:aws:states:ap-south-1:339713070060:stateMachine:spec-gen-ai-dev-job-processing-dev'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as { secret: string; expiresIn: string },
  
  // Bedrock Configuration
  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0',
    region: process.env.AWS_REGION || 'ap-south-1',
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Feature flags
  features: {
    enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    debugMode: process.env.DEBUG_MODE === 'true'
  }
};

export default config;