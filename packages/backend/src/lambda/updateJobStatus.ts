import { Handler } from 'aws-lambda';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';

const jobService = new JobService();

export const handler: Handler = async (event, context) => {
  try {
    logger.info('Updating job status', { event });

    const { jobId, status, output, errorMessage } = event;

    // Prepare update data
    const updates: any = {};
    
    if (output) {
      updates.output = output;
    }
    
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    // Calculate actual duration if job is completing
    if (status === 'COMPLETED' || status === 'FAILED') {
      const job = await jobService.getJobById(jobId);
      if (job) {
        const startTime = new Date(job.createdAt).getTime();
        const endTime = new Date().getTime();
        updates.actualDuration = Math.round((endTime - startTime) / 1000); // Duration in seconds
      }
    }

    // Update job status in DynamoDB
    await jobService.updateJobStatus(jobId, status, updates);

    logger.info('Job status updated successfully', { 
      jobId, 
      status, 
      hasOutput: !!output,
      hasError: !!errorMessage 
    });

    return {
      success: true,
      jobId,
      status,
      updatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error updating job status:', error);
    
    // Even if status update fails, we should return success to avoid Step Functions retry loops
    // The error is logged for monitoring and alerting
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status update failed',
      jobId: event.jobId
    };
  }
};