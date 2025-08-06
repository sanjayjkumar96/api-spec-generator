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
          // For integration plans, generate multiple components
          const integrationResult = await this.bedrockService.generateIntegrationPlan(job.inputData);
          const diagramsContent = "# High-Level Design\n\n```mermaid\ngraph TB\n    A[Client] --> B[API Gateway]\n    B --> C[Lambda]\n    C --> D[Database]\n```\n\n# Low-Level Design\n\n```mermaid\nsequenceDiagram\n    Client->>API: Request\n    API->>Lambda: Process\n    Lambda->>DB: Store\n    DB-->>Lambda: Response\n    Lambda-->>API: Result\n    API-->>Client: Response\n```";
          const codeContent = "```typescript\n// Client interface\nexport interface ApiClient {\n  processRequest(data: any): Promise<any>;\n}\n\n// DTO interface\nexport interface RequestDto {\n  id: string;\n  data: any;\n  timestamp: string;\n}\n```";
          const structureContent = "```\nproject-root/\n├── src/\n│   ├── controllers/\n│   ├── services/\n│   ├── models/\n│   └── utils/\n├── tests/\n└── package.json\n```";
          
          // Save individual components to S3
          const diagramsPath = await this.saveToS3(job.jobId, 'diagrams.md', diagramsContent);
          const codePath = await this.saveToS3(job.jobId, 'code-templates.md', codeContent);
          const structurePath = await this.saveToS3(job.jobId, 'project-structure.md', structureContent);
          
          // Save consolidated plan
          const consolidatedContent = `${integrationResult.content}\n\n## Architecture Diagrams\n\n${diagramsContent}\n\n## Code Templates\n\n${codeContent}\n\n## Project Structure\n\n${structureContent}`;
          s3OutputPath = await this.saveToS3(job.jobId, 'integration-plan.md', consolidatedContent);
          
          output = {
            content: integrationResult.content,
            diagrams: {
              hld: diagramsContent.split('# High-Level Design')[1]?.split('# Low-Level Design')[0] || '',
              lld: diagramsContent.split('# Low-Level Design')[1] || ''
            },
            codeSnippets: {
              client: codeContent.split('// Client interface')[1]?.split('// DTO interface')[0] || '',
              dto: codeContent.split('// DTO interface')[1] || ''
            },
            projectStructure: structureContent
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