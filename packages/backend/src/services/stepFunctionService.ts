import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { sfnClient, config } from '../config/aws';
import { DocumentGenerationRequest } from '../types';

export class StepFunctionService {
  async startDocumentGeneration(documentId: string, userId: string, request: DocumentGenerationRequest): Promise<string> {
    if (config.useMockServices) {
      console.log(`Mock Step Functions: Starting execution for document ${documentId}`);
      return `mock-execution-${documentId}`;
    }

    const input = {
      documentId,
      userId,
      title: request.title,
      type: request.type,
      rawContent: request.rawContent,
      timestamp: new Date().toISOString()
    };

    const command = new StartExecutionCommand({
      stateMachineArn: config.stepFunctionArn,
      name: `doc-gen-${documentId}-${Date.now()}`,
      input: JSON.stringify(input)
    });

    const result = await sfnClient.send(command);
    return result.executionArn!;
  }

  async getExecutionStatus(executionArn: string): Promise<{ status: string; error?: string }> {
    if (config.useMockServices) {
      console.log(`Mock Step Functions: Getting status for ${executionArn}`);
      return { status: 'RUNNING' };
    }

    // In real implementation, use DescribeExecutionCommand
    // For now, return mock status
    return { status: 'RUNNING' };
  }
}

export const stepFunctionService = new StepFunctionService();