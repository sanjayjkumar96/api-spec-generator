import { Handler } from 'aws-lambda';
import { BedrockService } from '../services/bedrockService';
import { JobService } from '../services/jobService';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const bedrockService = new BedrockService();
const jobService = new JobService();
const s3Client = new S3Client({ region: config.aws.region });

export const handler: Handler = async (event, context) => {
  try {
    logger.info('Processing simple job', { event });

    const { jobId, jobType, input } = event;
    const { requirements } = input;

    let response;
    let fileName: string;
    
    // Generate content based on job type
    switch (jobType) {
      case 'EARS_SPEC':
        response = await bedrockService.generateEARSSpec(requirements);
        fileName = 'ears-specification.md';
        break;
      case 'USER_STORY':
        response = await bedrockService.generateUserStories(requirements);
        fileName = 'user-stories.md';
        break;
      default:
        throw new Error(`Unsupported simple job type: ${jobType}`);
    }

    // Save output to S3
    const s3Key = `jobs/${jobId}/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
      Body: response.content,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        jobType,
        generatedAt: new Date().toISOString()
      }
    }));

    // Update job status with S3 path and output
    await jobService.updateJobStatus(jobId, 'COMPLETED', {
      s3OutputPath: s3Key,
      output: { 
        content: response.content,
        // Add empty IntegrationPlanOutput properties to satisfy the interface
        executiveSummary: undefined,
        architecture: undefined,
        apiSpecs: undefined,
        security: undefined,
        errorHandling: undefined,
        testing: undefined,
        deployment: undefined,
        monitoring: undefined,
        performance: undefined,
        risks: undefined,
        implementation: undefined,
        sections: undefined,
        diagrams: undefined,
        codeTemplates: undefined,
        projectStructure: undefined,
        consolidatedContent: undefined,
        integrationPlan: undefined,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          structuredDataAvailable: false
        }
      }
    });

    logger.info('Simple job completed successfully', { jobId, jobType, s3Key });

    return {
      jobId,
      status: 'COMPLETED',
      s3OutputPath: s3Key,
      output: { content: response.content }
    };

  } catch (error) {
    logger.error('Error processing simple job:', error);
    
    // Update job status to failed
    await jobService.updateJobStatus(event.jobId, 'FAILED', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
};