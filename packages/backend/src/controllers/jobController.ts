import { Router, Response } from 'express';
import { JobService } from '../services/jobService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const jobService = new JobService();

// Validation schema aligned with plan specification
const createJobSchema = Joi.object({
  jobName: Joi.string().required().min(3).max(255),
  jobType: Joi.string().valid('EARS_SPEC', 'USER_STORY', 'INTEGRATION_PLAN').required(),
  inputData: Joi.string().required().min(10)
});

// Create a new job - matches plan API specification
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error, value } = createJobSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    const { jobName, jobType, inputData } = value;
    const userId = req.user!.userId;

    const job = await jobService.createJob(userId, jobName, jobType, inputData);

    logger.info('Job created successfully', { jobId: job.jobId, userId, jobType });

    // Return jobId as per plan specification
    res.status(202).json({
      jobId: job.jobId
    });
  } catch (error) {
    logger.error('Job creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job'
    });
  }
});

// Get all jobs for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const jobs = await jobService.getUserJobs(userId);

    res.json({
      success: true,
      data: { jobs }
    });
  } catch (error) {
    logger.error('Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// Get a specific job by ID - matches plan API specification
router.get('/:jobId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.userId;

    const job = await jobService.getJobById(jobId);
    
    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found'
      });
      return;
    }

    // Ensure user can only access their own jobs
    if (job.userId !== userId && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Return job data as per plan specification
    res.json({
      jobId: job.jobId,
      jobName: job.jobName,
      status: job.status,
      jobType: job.jobType,
      s3OutputPath: job.s3OutputPath,
      output: job.output,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt
    });
  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

// Get job execution status
router.get('/:jobId/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.userId;

    const job = await jobService.getJobById(jobId);
    
    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found'
      });
      return;
    }

    // Ensure user can only access their own jobs
    if (job.userId !== userId && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    let executionStatus = null;
    if (job.executionArn) {
      try {
        executionStatus = await jobService.getJobExecutionStatus(job.executionArn);
      } catch (executionError) {
        logger.warn('Could not fetch execution status:', executionError);
      }
    }

    res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        estimatedDuration: job.estimatedDuration,
        executionStatus
      }
    });
  } catch (error) {
    logger.error('Error fetching job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job status'
    });
  }
});

export default router;