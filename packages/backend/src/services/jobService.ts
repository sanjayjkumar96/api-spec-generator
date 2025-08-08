import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { Job, JobExecutionContext } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { BedrockService } from './bedrockService';

// Mock data store for local development
const mockJobs: Map<string, Job> = new Map();
const mockExecutions: Map<string, any> = new Map();

export class JobService {
  private dynamoClient: DynamoDBDocumentClient;
  private stepFunctionsClient: SFNClient;
  private s3Client: S3Client;
  private tableName: string;
  private bedrockService: BedrockService;

  constructor() {
    const client = new DynamoDBClient({ region: config.aws.region });
    // Configure DynamoDB client to automatically remove undefined values
    this.dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
      }
    });
    this.stepFunctionsClient = new SFNClient({ region: config.aws.region });
    this.s3Client = new S3Client({ region: config.aws.region });
    this.tableName = config.tables.jobs;
    this.bedrockService = new BedrockService();
  }

  // Helper method to recursively remove undefined values from objects
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== undefined)
        .map(item => this.removeUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      });
      return cleaned;
    }
    
    return obj;
  }

  async createJob(
    userId: string,
    jobName: string,
    jobType: Job['jobType'],
    inputData: string
  ): Promise<Job> {
    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job: Job = {
      jobId,
      userId,
      jobName,
      jobType,
      status: 'PENDING',
      inputData,
      createdAt: now,
      updatedAt: now,
      estimatedDuration: this.getEstimatedDuration(jobType)
    };

    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        return await this.createJobMock(job);
      }

      // Save job to DynamoDB
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: job
      }));

      // Start Step Functions execution
      const executionContext: JobExecutionContext = {
        jobId,
        jobType,
        input: { requirements: inputData },
        userId,
        timestamp: now
      };

      const executionResult = await this.stepFunctionsClient.send(new StartExecutionCommand({
        stateMachineArn: config.stepFunctions.stateMachineArn,
        name: `job-${jobId}-${Date.now()}`,
        input: JSON.stringify(executionContext)
      }));

      // Update job with execution ARN
      await this.updateJobStatus(jobId, 'PENDING', { executionArn: executionResult.executionArn });

      logger.info('Job created and execution started:', { jobId, executionArn: executionResult.executionArn });
      
      return {
        ...job,
        executionArn: executionResult.executionArn
      };
    } catch (error) {
      logger.error('Error creating job:', error);
      throw new Error('Failed to create job');
    }
  }

  private async createJobMock(job: Job): Promise<Job> {
    logger.info('Using mock job service for local development', {});
    
    // Store job in mock store
    mockJobs.set(job.jobId, job);
    
    // Start processing job in background (mock Step Functions)
    const executionArn = `mock-execution-${job.jobId}`;
    job.executionArn = executionArn;
    
    // Store mock execution
    mockExecutions.set(executionArn, {
      status: 'RUNNING',
      startDate: new Date(),
      jobId: job.jobId
    });
    
    // Process job asynchronously
    this.processJobMock(job);
    
    return job;
  }

  private async processJobMock(job: Job): Promise<void> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      let output: any = {};
      let s3OutputPath: string;
      
      // Generate content based on job type
      switch (job.jobType) {
        case 'EARS_SPEC':
          const earsResult = await this.bedrockService.generateEARSSpec(job.inputData);
          output = { content: earsResult.content };
          s3OutputPath = await this.saveToS3(job.jobId, 'ears-specification.md', earsResult.content);
          break;
          
        case 'USER_STORY':
          const userStoryResult = await this.bedrockService.generateUserStories(job.inputData);
          output = { content: userStoryResult.content };
          s3OutputPath = await this.saveToS3(job.jobId, 'user-stories.md', userStoryResult.content);
          break;
          
        case 'INTEGRATION_PLAN':
          // Generate a comprehensive integration plan with proper structure
          const integrationPlanContent = this.generateMockIntegrationPlan(job.inputData);
          
          // Parse the generated content to create structured output
          const { IntegrationPlanParser } = await import('../utils/integrationPlanParser');
          const parsedOutput = IntegrationPlanParser.parseIntegrationPlan(integrationPlanContent);
          
          // Save consolidated plan to S3
          s3OutputPath = await this.saveToS3(job.jobId, 'integration-plan.md', integrationPlanContent);
          
          // Also save structured data as JSON
          const structuredS3Key = await this.saveToS3(
            job.jobId, 
            'integration-plan-structured.json', 
            JSON.stringify(parsedOutput, null, 2)
          );
          
          output = {
            ...parsedOutput,
            content: integrationPlanContent,
            metadata: {
              structuredDataAvailable: true,
              structuredS3Key,
              consolidatedS3Key: s3OutputPath,
              generatedAt: new Date().toISOString(),
              version: '2.0'
            }
          };
          break;
          
        default:
          throw new Error(`Unsupported job type: ${job.jobType}`);
      }
      
      // Update job status to completed
      const updatedJob = { 
        ...job, 
        status: 'COMPLETED' as const, 
        output, 
        s3OutputPath,
        completedAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      };
      mockJobs.set(job.jobId, updatedJob);
      
      // Update execution status
      if (job.executionArn) {
        mockExecutions.set(job.executionArn, {
          status: 'SUCCEEDED',
          startDate: mockExecutions.get(job.executionArn)?.startDate,
          stopDate: new Date(),
          output: JSON.stringify(output)
        });
      }
      
      logger.info('Mock job processing completed:', { jobId: job.jobId, s3OutputPath });
      
    } catch (error) {
      logger.error('Mock job processing failed:', error);
      
      // Update job status to failed
      const failedJob = { 
        ...job, 
        status: 'FAILED' as const, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString()
      };
      mockJobs.set(job.jobId, failedJob);
      
      // Update execution status
      if (job.executionArn) {
        mockExecutions.set(job.executionArn, {
          status: 'FAILED',
          startDate: mockExecutions.get(job.executionArn)?.startDate,
          stopDate: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private generateMockIntegrationPlan(requirements: string): string {
    return `# API Integration Plan

## Executive Summary

This comprehensive integration plan outlines the implementation strategy for integrating the specified API systems. The plan includes detailed architecture diagrams, security considerations, implementation guidelines, and operational procedures to ensure a successful integration.

**Key Objectives:**
- Establish secure and reliable API communication
- Implement robust error handling and monitoring
- Ensure scalable and maintainable architecture
- Provide comprehensive testing and deployment strategies

## Architecture

### High-Level System Design

\`\`\`mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend]
        B[Mobile App]
    end
    
    subgraph "API Gateway Layer"
        C[API Gateway]
        D[Load Balancer]
    end
    
    subgraph "Application Layer"
        E[Authentication Service]
        F[Integration Service]
        G[Business Logic Service]
    end
    
    subgraph "Data Layer"
        H[Database]
        I[Cache Layer]
        J[File Storage]
    end
    
    subgraph "External Systems"
        K[External API]
        L[Third-party Services]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    
    E --> H
    F --> H
    G --> H
    
    F --> I
    G --> I
    
    F --> J
    G --> J
    
    F --> K
    G --> L
\`\`\`

### Detailed Sequence Flow

\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant AS as Auth Service
    participant IS as Integration Service
    participant EA as External API
    participant DB as Database

    C->>AG: Request with credentials
    AG->>AS: Validate authentication
    AS-->>AG: Authentication result
    AG->>IS: Authenticated request
    IS->>EA: External API call
    EA-->>IS: API response
    IS->>DB: Store transaction log
    IS-->>AG: Processed response
    AG-->>C: Final response
\`\`\`

## API Specifications

### Request/Response Models

\`\`\`typescript
// Core interfaces
export interface ApiRequest {
  id: string;
  timestamp: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface ApiResponse {
  id: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  timestamp: string;
}

// Authentication models
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string[];
}
\`\`\`

### Service Implementation

\`\`\`typescript
// Integration service
export class IntegrationService {
  private httpClient: HttpClient;
  private logger: Logger;

  constructor(httpClient: HttpClient, logger: Logger) {
    this.httpClient = httpClient;
    this.logger = logger;
  }

  async processRequest(request: ApiRequest): Promise<ApiResponse> {
    try {
      this.logger.info('Processing integration request', { requestId: request.id });
      
      // Validate request
      this.validateRequest(request);
      
      // Call external API
      const externalResponse = await this.httpClient.post('/api/external', {
        data: request.data,
        headers: {
          'Authorization': \`Bearer \${this.getAuthToken()}\`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process response
      const processedData = this.processExternalResponse(externalResponse.data);
      
      return {
        id: request.id,
        status: 'success',
        data: processedData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Integration request failed', { 
        requestId: request.id, 
        error: error.message 
      });
      
      return {
        id: request.id,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private validateRequest(request: ApiRequest): void {
    if (!request.id || !request.data) {
      throw new Error('Invalid request: missing required fields');
    }
  }

  private processExternalResponse(data: any): any {
    // Transform external API response to internal format
    return {
      ...data,
      processedAt: new Date().toISOString()
    };
  }

  private getAuthToken(): string {
    // Implement token retrieval logic
    return process.env.EXTERNAL_API_TOKEN || '';
  }
}
\`\`\`

## Security

### Authentication & Authorization

- **JWT-based authentication** with proper token validation
- **OAuth 2.0 integration** for external API access
- **Role-based access control** (RBAC) implementation
- **API key management** for service-to-service communication

### Security Measures

\`\`\`typescript
// Security middleware
export class SecurityMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  static rateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  });
}
\`\`\`

## Error Handling

### Resilience Patterns

- **Circuit Breaker Pattern** for external API calls
- **Retry Logic** with exponential backoff
- **Graceful Degradation** for non-critical failures
- **Comprehensive Logging** for debugging and monitoring

\`\`\`typescript
// Circuit breaker implementation
export class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.nextAttempt > Date.now()) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= 5) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
\`\`\`

## Testing

### Test Strategy

- **Unit Tests** for individual components
- **Integration Tests** for API interactions
- **End-to-End Tests** for complete workflows
- **Performance Tests** for scalability validation

\`\`\`typescript
// Example test cases
describe('IntegrationService', () => {
  let service: IntegrationService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    service = new IntegrationService(mockHttpClient, new Logger());
  });

  it('should process valid requests successfully', async () => {
    const request: ApiRequest = {
      id: 'test-123',
      timestamp: new Date().toISOString(),
      data: { test: 'data' }
    };

    mockHttpClient.post.mockResolvedValue({
      data: { result: 'success' }
    });

    const response = await service.processRequest(request);

    expect(response.status).toBe('success');
    expect(response.id).toBe(request.id);
  });
});
\`\`\`

## Deployment

### Infrastructure Requirements

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

  integration-service:
    build: .
    environment:
      - NODE_ENV=production
      - JWT_SECRET=\${JWT_SECRET}
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      - database

  database:
    image: postgres:13
    environment:
      - POSTGRES_DB=integration_db
      - POSTGRES_USER=\${DB_USER}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\`

### Deployment Steps

1. **Environment Setup**: Configure environment variables
2. **Database Migration**: Run database schema updates
3. **Service Deployment**: Deploy application containers
4. **Health Checks**: Verify service availability
5. **Monitoring Setup**: Configure logging and metrics

## Monitoring

### Observability Stack

- **Application Metrics**: Response times, error rates, throughput
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: API usage patterns, user engagement
- **Alerting**: Real-time notifications for critical issues

\`\`\`typescript
// Monitoring implementation
export class MonitoringService {
  private metricsCollector: MetricsCollector;

  constructor() {
    this.metricsCollector = new MetricsCollector();
  }

  trackApiCall(endpoint: string, duration: number, status: number): void {
    this.metricsCollector.increment('api_calls_total', {
      endpoint,
      status: status.toString()
    });

    this.metricsCollector.histogram('api_duration_seconds', duration, {
      endpoint
    });
  }

  trackError(error: Error, context: Record<string, any>): void {
    this.metricsCollector.increment('errors_total', {
      type: error.constructor.name
    });

    console.error('Application error:', {
      message: error.message,
      stack: error.stack,
      context
    });
  }
}
\`\`\`

## Performance

### Optimization Strategies

- **Caching**: Redis-based caching for frequent requests
- **Connection Pooling**: Efficient database connections
- **Asynchronous Processing**: Non-blocking operations
- **Load Balancing**: Distribute traffic across instances

\`\`\`typescript
// Caching implementation
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
\`\`\`

## Project Structure

\`\`\`
integration-project/
├── src/
│   ├── controllers/          # API route handlers
│   │   ├── integration.controller.ts
│   │   └── auth.controller.ts
│   ├── services/            # Business logic services
│   │   ├── integration.service.ts
│   │   ├── auth.service.ts
│   │   └── cache.service.ts
│   ├── models/              # Data models and interfaces
│   │   ├── api.models.ts
│   │   └── auth.models.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/               # Utility functions
│   │   ├── logger.ts
│   │   └── circuit-breaker.ts
│   └── config/              # Configuration files
│       ├── database.ts
│       └── redis.ts
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/                  # Docker configuration
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                    # Documentation
│   ├── api.md
│   └── deployment.md
├── scripts/                 # Build and deployment scripts
│   ├── build.sh
│   └── deploy.sh
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Implementation Summary

This integration plan provides a comprehensive roadmap for implementing a robust, scalable, and secure API integration solution. The plan includes:

1. **Complete Architecture**: High-level and detailed system designs
2. **Production-Ready Code**: TypeScript implementations with best practices
3. **Security Framework**: Authentication, authorization, and data protection
4. **Operational Excellence**: Monitoring, logging, and error handling
5. **Deployment Strategy**: Infrastructure setup and deployment procedures

The implementation follows industry best practices and enterprise-grade standards to ensure reliability, maintainability, and scalability.`;
  }

  private async saveToS3(jobId: string, fileName: string, content: string): Promise<string> {
    if (process.env.USE_MOCK_SERVICES === 'true') {
      // Mock S3 path for development
      return `s3://${config.s3.bucket}/jobs/${jobId}/${fileName}`;
    }

    const s3Key = `jobs/${jobId}/${fileName}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
      Body: content,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        fileName,
        generatedAt: new Date().toISOString()
      }
    }));

    return s3Key;
  }

  async getJobById(jobId: string): Promise<Job | null> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        return mockJobs.get(jobId) || null;
      }

      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { jobId }
      }));

      return result.Item as Job || null;
    } catch (error) {
      logger.error('Error getting job by ID:', error);
      throw new Error('Failed to get job');
    }
  }

  async getUserJobs(userId: string): Promise<Job[]> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const userJobs = Array.from(mockJobs.values())
          .filter(job => job.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return userJobs;
      }

      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserJobsIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false // Sort by most recent first
      }));

      return result.Items as Job[] || [];
    } catch (error) {
      logger.error('Error getting user jobs:', error);
      throw new Error('Failed to get user jobs');
    }
  }

  async updateJobStatus(
    jobId: string, 
    status: Job['status'], 
    updates: Partial<Job> = {}
  ): Promise<void> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const job = mockJobs.get(jobId);
        if (job) {
          const now = new Date().toISOString();
          // Clean and filter updates for mock storage
          const cleanedUpdates = this.removeUndefinedValues(updates);
          const updatedJob = {
            ...job,
            ...cleanedUpdates,
            status,
            updatedAt: now,
            ...(status === 'COMPLETED' && { completedAt: now })
          };
          mockJobs.set(jobId, updatedJob);
          logger.info('Mock job status updated:', { jobId, status });
        }
        return;
      }

      const now = new Date().toISOString();
      const updateExpression = ['SET #status = :status, #updatedAt = :updatedAt'];
      const expressionAttributeNames: Record<string, string> = { 
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      };
      const expressionAttributeValues: Record<string, any> = {
        ':status': status,
        ':updatedAt': now
      };

      // Clean updates object to remove undefined values recursively
      const cleanedUpdates = this.removeUndefinedValues(updates);

      // Add conditional updates with safer attribute name mapping
      let attrIndex = 0;
      Object.entries(cleanedUpdates).forEach(([key, value]) => {
        if (key !== 'status' && key !== 'updatedAt' && value !== null) {
          const attributeName = `#updateAttr${attrIndex}`;
          const valueName = `:updateVal${attrIndex}`;
          updateExpression.push(`${attributeName} = ${valueName}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[valueName] = value;
          attrIndex++;
        }
      });

      if (status === 'COMPLETED') {
        updateExpression.push('#completedAt = :completedAt');
        expressionAttributeNames['#completedAt'] = 'completedAt';
        expressionAttributeValues[':completedAt'] = now;
      }

      logger.info('DynamoDB update params:', {
        TableName: this.tableName,
        Key: { jobId },
        UpdateExpression: updateExpression.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { jobId },
        UpdateExpression: updateExpression.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      }));

      logger.info('Job status updated:', { jobId, status });
    } catch (error) {
      logger.error('Error updating job status:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        jobId,
        status,
        updates
      });
      throw new Error('Failed to update job status');
    }
  }

  async getJobExecutionStatus(executionArn: string): Promise<any> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        return mockExecutions.get(executionArn) || null;
      }

      const result = await this.stepFunctionsClient.send(new DescribeExecutionCommand({
        executionArn
      }));

      return {
        status: result.status,
        startDate: result.startDate,
        stopDate: result.stopDate,
        output: result.output ? JSON.parse(result.output) : null,
        error: result.error
      };
    } catch (error) {
      logger.error('Error getting execution status:', error);
      throw new Error('Failed to get execution status');
    }
  }

  private getEstimatedDuration(jobType: Job['jobType']): number {
    switch (jobType) {
      case 'EARS_SPEC':
        return 120; // 2 minutes
      case 'USER_STORY':
        return 90; // 1.5 minutes
      case 'INTEGRATION_PLAN':
        return 300; // 5 minutes
      default:
        return 120;
    }
  }
}