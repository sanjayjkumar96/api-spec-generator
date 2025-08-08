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
  
  // Bedrock Configuration - Multi-Agent Setup
  bedrock: {
    // Base model for simple jobs and consolidation
    modelId: process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0',
    region: process.env.AWS_REGION || 'ap-south-1',
    
    // Knowledge Base Configuration
    knowledgeBase: {
      knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || 'JNYBRB0XCG',
      numberOfResults: parseInt(process.env.KNOWLEDGE_BASE_RESULTS || '5', 10),
      enableKnowledgeBase: process.env.ENABLE_KNOWLEDGE_BASE !== 'false' // Default to true
    },
    
    // Default agent (for backward compatibility and consolidation tasks)
    defaultAgent: {
      agentId: process.env.BEDROCK_AGENT_ID || 'EDZEP7ZPCP',
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'UAHRZEARPW',
    },
    
    // Specialized agents for complex job tasks
    agents: {
      // Architecture & Diagram Generation Agent
      diagrams: {
        agentId: process.env.BEDROCK_DIAGRAM_AGENT_ID || process.env.BEDROCK_AGENT_ID || 'NYSFDNVY2G',
        agentAliasId: process.env.BEDROCK_DIAGRAM_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID || 'YVJ8AZG9X6',
      },
      // Developer & Code Generation Agent
      code: {
        agentId: process.env.BEDROCK_CODE_AGENT_ID || process.env.BEDROCK_AGENT_ID || 'WUIEZIG83P',
        agentAliasId: process.env.BEDROCK_CODE_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID || '8HRENVFQC2',
      },
      // Project Structure & Solution Architect Agent
      structure: {
        agentId: process.env.BEDROCK_STRUCTURE_AGENT_ID || process.env.BEDROCK_AGENT_ID || 'WRBWWR8H8N',
        agentAliasId: process.env.BEDROCK_STRUCTURE_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID || 'M7XCZFQLKD',
      },
      // Integration Plan Orchestrator Agent
      orchestrator: {
        agentId: process.env.BEDROCK_ORCHESTRATOR_AGENT_ID || process.env.BEDROCK_AGENT_ID || 'WRBWWR8H8N',
        agentAliasId: process.env.BEDROCK_ORCHESTRATOR_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID || 'M7XCZFQLKD',
      }
    }
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
    debugMode: process.env.DEBUG_MODE === 'true',
    useMultiAgent: process.env.USE_MULTI_AGENT !== 'false' // Default to true
  }
};

export default config;