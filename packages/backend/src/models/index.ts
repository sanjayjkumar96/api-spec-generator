export interface User {
  userId: string;
  email: string;
  password?: string; // Optional for responses (never send password in responses)
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface UserRegistration {
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  token?: string;
  error?: string;
}

// Enhanced structured content interfaces for integration plans
export interface IntegrationPlanSection {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'mermaid' | 'code' | 'text';
  language?: string; // for code sections
  order: number;
}

export interface ArchitectureDiagram {
  id: string;
  title: string;
  content: string;
  type: 'mermaid' | 'ascii' | 'text';
  category: 'high-level' | 'low-level' | 'data-flow' | 'deployment' | 'security' | 'component';
}

export interface CodeTemplate {
  id: string;
  title: string;
  content: string;
  language: string;
  category: 'interface' | 'dto' | 'service' | 'controller' | 'model' | 'config' | 'test' | 'schema';
  framework?: string;
}

export interface ProjectStructureItem {
  path: string;
  type: 'file' | 'directory';
  description?: string;
  content?: string; // for file templates
}

export interface IntegrationPlanOutput {
  // Main sections
  executiveSummary?: string;
  architecture?: string;
  apiSpecs?: string;
  security?: string;
  errorHandling?: string;
  testing?: string;
  deployment?: string;
  monitoring?: string;
  performance?: string;
  risks?: string;
  implementation?: string;
  
  // Structured content
  sections?: IntegrationPlanSection[];
  diagrams?: ArchitectureDiagram[];
  codeTemplates?: CodeTemplate[];
  projectStructure?: ProjectStructureItem[];
  
  // Consolidated content for legacy support
  consolidatedContent?: string;
  
  // Legacy fields
  integrationPlan?: string;
  content?: string;
}

export interface Job {
  jobId: string;
  userId: string;
  jobName: string;
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  inputData: string;
  s3OutputPath?: string;
  output?: {
    // For simple jobs (EARS_SPEC, USER_STORY)
    content?: string;
    
    // For complex jobs (INTEGRATION_PLAN) - include all IntegrationPlanOutput fields
    executiveSummary?: string;
    architecture?: string;
    apiSpecs?: string;
    security?: string;
    errorHandling?: string;
    testing?: string;
    deployment?: string;
    monitoring?: string;
    performance?: string;
    risks?: string;
    implementation?: string;
    
    // Structured content
    sections?: IntegrationPlanSection[];
    diagrams?: ArchitectureDiagram[];
    codeTemplates?: CodeTemplate[];
    projectStructure?: ProjectStructureItem[];
    
    // Consolidated content for legacy support
    consolidatedContent?: string;
    integrationPlan?: string;
    
    // Legacy support for existing frontend
    codeSnippets?: {
      client?: string;
      dto?: string;
    };
    
    // Metadata
    metadata?: {
      structuredDataAvailable?: boolean;
      structuredS3Key?: string;
      consolidatedS3Key?: string;
      generatedAt?: string;
      version?: string;
      modelId?: string;
      timestamp?: string;
      mockMode?: boolean;
    };
  };
  executionArn?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  estimatedDuration?: number;
  actualDuration?: number;
}

export interface Prompt {
  id: string;
  category: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN' | 'CUSTOM';
  title: string;
  description: string;
  template: string;
  variables: string[];
  tags: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface JobExecutionContext {
  jobId: string;
  jobType: string;
  input: Record<string, any>;
  userId: string;
  timestamp: string;
}

export interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: {
    modelId?: string;
    agentId?: string;
    agentAliasId?: string;
    agentType?: 'diagrams' | 'code' | 'structure' | 'orchestrator' | 'default';
    sessionId?: string;
    timestamp?: string;
    mode?: 'direct-model' | 'agent';
    mockMode?: boolean;
    knowledgeBaseUsed?: boolean;
    knowledgeBaseResultsCount?: number;
    [key: string]: any;
  };
}