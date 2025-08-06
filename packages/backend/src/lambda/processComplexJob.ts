import { Handler } from 'aws-lambda';
import { BedrockService } from '../services/bedrockService';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const bedrockService = new BedrockService();
const s3Client = new S3Client({ region: config.aws.region });

export const handler: Handler = async (event, context) => {
  try {
    logger.info('Processing complex job task', { event });

    const { jobId, task, input } = event;
    const { requirements } = input;

    let response;
    let fileName: string;
    
    // Process different tasks for complex jobs (Integration Plans)
    switch (task) {
      case 'diagrams':
        response = await bedrockService.generateContent(
          `Generate comprehensive system architecture diagrams for: ${requirements}`,
          `You are a senior system architect. Create detailed Mermaid diagrams including:
1. High-level system architecture showing major components
2. Low-level design with detailed interactions
3. Data flow diagrams
4. Deployment architecture
5. Security architecture overview
Format as Mermaid diagram syntax within markdown code blocks.`
        );
        fileName = 'diagrams.md';
        break;

      case 'code':
        response = await bedrockService.generateContent(
          `Generate comprehensive code templates and API specifications for: ${requirements}`,
          `You are a senior software engineer. Generate production-ready code templates including:
1. TypeScript interfaces and DTOs
2. API client implementations
3. Error handling patterns
4. Configuration templates
5. Testing templates
6. Database schemas
Format with proper syntax highlighting and documentation.`
        );
        fileName = 'code-templates.md';
        break;

      case 'structure':
        response = await bedrockService.generateContent(
          `Generate detailed project structure and implementation guide for: ${requirements}`,
          `You are a project architect. Create a comprehensive project structure including:
1. Directory structure with explanations
2. Package.json dependencies
3. Configuration files
4. Build and deployment scripts
5. Documentation structure
6. Testing organization
Format as a clear hierarchical structure with explanations.`
        );
        fileName = 'project-structure.md';
        break;

      default:
        throw new Error(`Unsupported complex job task: ${task}`);
    }

    // Save component to S3
    const s3Key = `jobs/${jobId}/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
      Body: response.content,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        task,
        generatedAt: new Date().toISOString()
      }
    }));

    logger.info('Complex job task completed', { jobId, task, s3Key });

    return {
      jobId,
      task,
      s3Key,
      content: response.content,
      metadata: response.metadata
    };

  } catch (error) {
    logger.error('Error processing complex job task:', error);
    throw error;
  }
};