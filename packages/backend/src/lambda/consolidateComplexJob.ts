import { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { JobService } from '../services/jobService';
import { BedrockService } from '../services/bedrockService';
import { IntegrationPlanParser } from '../utils/integrationPlanParser';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const jobService = new JobService();
const bedrockService = new BedrockService();
const s3Client = new S3Client({ region: config.aws.region });

export const handler: Handler = async (event: any, context: any) => {
  try {
    logger.info('Consolidating complex job results', { event });
    
    // Extract results from Step Functions parallel execution
    const results = Array.isArray(event) ? event : event.results || [];
    
    if (!results || results.length === 0) {
      throw new Error('No results found in event');
    }

    const jobId = results[0]?.jobId;
    if (!jobId) {
      throw new Error('JobId not found in results');
    }
    
    // Extract results from parallel tasks
    const diagramsResult = results.find((r: any) => r.task === 'diagrams');
    const codeResult = results.find((r: any) => r.task === 'code');
    const structureResult = results.find((r: any) => r.task === 'structure');

    if (!diagramsResult || !codeResult || !structureResult) {
      throw new Error('Missing required task results for consolidation');
    }

    // Generate the main integration plan content
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const integrationPlanContent = await bedrockService.generateIntegrationPlan(job.inputData);

    // Create consolidated content
    const consolidatedContent = `# API Integration Plan

${integrationPlanContent.content}

---

## Architecture Diagrams

${diagramsResult.content}

---

## Code Templates & Implementation

${codeResult.content}

---

## Project Structure & Organization

${structureResult.content}

---

## Implementation Summary

This integration plan provides a comprehensive guide for implementing the requested API integration. 
The plan includes detailed architecture diagrams, production-ready code templates, and a complete 
project structure to ensure successful implementation.

For questions or clarifications, refer to the individual sections above or consult the technical documentation.
`;

    // Parse the consolidated content into structured sections
    const parsedOutput = IntegrationPlanParser.parseIntegrationPlan(consolidatedContent);

    // Save consolidated plan to S3
    const consolidatedS3Key = `jobs/${jobId}/integration-plan.md`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: consolidatedS3Key,
      Body: consolidatedContent,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        type: 'consolidated-integration-plan',
        generatedAt: new Date().toISOString()
      }
    }));

    // Save structured data as JSON for easy frontend consumption
    const structuredS3Key = `jobs/${jobId}/integration-plan-structured.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: structuredS3Key,
      Body: JSON.stringify(parsedOutput, null, 2),
      ContentType: 'application/json',
      Metadata: {
        jobId,
        type: 'structured-integration-plan',
        generatedAt: new Date().toISOString()
      }
    }));

    // Prepare enhanced output with both structured and legacy support
    const output = {
      // New structured output
      ...parsedOutput,
      
      // Legacy support for existing frontend
      content: integrationPlanContent.content,
      codeSnippets: {
        client: extractCodeSection(codeResult.content, 'Client'),
        dto: extractCodeSection(codeResult.content, 'DTO')
      },
      projectStructure: structureResult.content,
      
      // Metadata
      metadata: {
        structuredDataAvailable: true,
        structuredS3Key,
        consolidatedS3Key,
        generatedAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    // Update job status with structured results
    await jobService.updateJobStatus(jobId, 'COMPLETED', {
      s3OutputPath: consolidatedS3Key,
      output: output
    });

    logger.info('Complex job consolidation completed', { 
      jobId, 
      consolidatedS3Key, 
      structuredS3Key,
      sectionsCount: parsedOutput.sections?.length || 0,
      diagramsCount: parsedOutput.diagrams?.length || 0,
      codeTemplatesCount: parsedOutput.codeTemplates?.length || 0
    });

    return {
      jobId,
      status: 'COMPLETED',
      s3OutputPath: consolidatedS3Key,
      structuredS3Key,
      output: output
    };

  } catch (error) {
    logger.error('Error consolidating complex job:', error);
    
    // Extract jobId from event for error handling
    const results = Array.isArray(event) ? event : event.results || [];
    const jobId = results[0]?.jobId || event.jobId;
    
    if (jobId) {
      // Update job status to failed
      await jobService.updateJobStatus(jobId, 'FAILED', {
        errorMessage: error instanceof Error ? error.message : 'Consolidation failed'
      });
    }
    
    throw error;
  }
};

// Helper function to extract code sections (legacy support)
function extractCodeSection(content: string, sectionType: string): string {
  const regex = new RegExp(`${sectionType} Code[^#]*?(\`\`\`[\\s\\S]*?\`\`\`)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : `No ${sectionType} code found`;
}