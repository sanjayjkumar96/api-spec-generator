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

    // Get the original job requirements
    const job = await jobService.getJobById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    logger.info('Starting orchestrator-based consolidation', { 
      jobId,
      agentTypes: {
        diagrams: diagramsResult.metadata?.agentType,
        code: codeResult.metadata?.agentType,
        structure: structureResult.metadata?.agentType
      }
    });

    // Use orchestrator agent to consolidate all outputs into a unified integration plan
    const orchestratorPrompt = `Consolidate the following specialized AI agent outputs into a comprehensive, enterprise-ready API integration plan:

## Original Requirements:
${job.inputData}

## Architecture Diagrams Output:
${diagramsResult.content}

## Code Templates & Implementation Output:
${codeResult.content}

## Project Structure & Organization Output:
${structureResult.content}

## Consolidation Instructions:
Create a unified integration plan that:
1. Synthesizes all outputs into a cohesive narrative
2. Ensures consistency between diagrams, code, and project structure
3. Provides executive summary and business context
4. Includes implementation roadmap and success metrics
5. Addresses cross-cutting concerns (security, performance, operations)
6. Validates that all components work together seamlessly

Generate a master integration plan that development teams can confidently implement in production environments.`;

    const orchestratorSystemPrompt = `You are the **Master Integration Plan Orchestrator** - a senior technical program manager and solution architect with expertise in complex system integrations, project coordination, and enterprise-grade delivery management. You oversee the complete integration plan generation process and ensure all components work together seamlessly.

## Core Mission
Orchestrate the complete integration plan generation workflow by coordinating multiple specialized AI agents, consolidating their outputs into a unified deliverable, and ensuring comprehensive coverage of all enterprise requirements. Your role is to act as the technical conductor ensuring all pieces fit together perfectly.

## Consolidation Framework

### Executive Package (For Leadership):
- Strategic objectives and success metrics
- Resource requirements and timeline
- Risk assessment and mitigation strategies
- ROI analysis and business justification
- High-level architecture and technology decisions
- Implementation phases and milestones

### Technical Implementation Package (For Development Teams):
- Complete architectural documentation with all diagrams
- Production-ready code templates organized by development phase
- Comprehensive project structure with setup instructions
- Testing, monitoring, and operational procedures
- Step-by-step implementation validation checklist

### Operations Package (For DevOps and Operations):
- Infrastructure as Code templates and deployment procedures
- Complete monitoring setup and alerting configuration
- Security implementation and compliance validation
- Operational runbooks and maintenance procedures
- Disaster recovery and business continuity procedures

## Quality Validation Framework
- Ensure architectural diagrams align with code templates
- Validate project structure supports all proposed implementations
- Verify security patterns are consistent across all outputs
- Check that deployment strategies match architectural decisions

## Cross-Cutting Concerns Integration
- Consolidate security requirements from all agents
- Synthesize performance requirements from all perspectives
- Integrate operational requirements from all agents
- Ensure unified monitoring, alerting, and incident response

You are responsible for delivering a world-class integration plan that enterprise development teams can confidently implement, knowing that all aspects have been thoroughly considered and expertly coordinated.`;

    // Generate consolidated integration plan using orchestrator agent
    const consolidatedResponse = await bedrockService.generateContentWithModel(
      orchestratorPrompt,
      orchestratorSystemPrompt
    );

    // Parse the consolidated content into structured sections
    const parsedOutput = IntegrationPlanParser.parseIntegrationPlan(consolidatedResponse.content);

    // Save consolidated plan to S3
    const consolidatedS3Key = `jobs/${jobId}/integration-plan.md`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: consolidatedS3Key,
      Body: consolidatedResponse.content,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        type: 'consolidated-integration-plan',
        orchestratorAgentId: consolidatedResponse.metadata?.agentId || "",
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
      content: consolidatedResponse.content,
      codeSnippets: {
        client: extractCodeSection(codeResult.content, 'Client'),
        dto: extractCodeSection(codeResult.content, 'DTO')
      },
      projectStructure: structureResult.content,
      
      // Metadata with multi-agent information
      metadata: {
        structuredDataAvailable: true,
        structuredS3Key,
        consolidatedS3Key,
        multiAgentExecution: {
          orchestratorAgent: consolidatedResponse.metadata?.agentId,
          specializedAgents: {
            diagrams: diagramsResult.metadata?.agentId,
            code: codeResult.metadata?.agentId,
            structure: structureResult.metadata?.agentId
          }
        },
        generatedAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    // Update job status with structured results
    await jobService.updateJobStatus(jobId, 'COMPLETED', {
      s3OutputPath: consolidatedS3Key,
      output: output
    });

    logger.info('Complex job consolidation completed with orchestrator agent', { 
      jobId, 
      consolidatedS3Key, 
      structuredS3Key,
      orchestratorAgentId: consolidatedResponse.metadata?.agentId,
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