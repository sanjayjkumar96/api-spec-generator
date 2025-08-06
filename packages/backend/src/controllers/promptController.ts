import { Router, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Prompt } from '../models';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

const router = Router();

// Mock data store for local development
const mockPrompts: Map<string, Prompt> = new Map();

// Initialize with sample prompts for local development
if (process.env.USE_MOCK_SERVICES === 'true') {
  const samplePrompts: Prompt[] = [
    {
      id: 'prompt-1',
      category: 'EARS_SPEC',
      title: 'Basic EARS Specification',
      description: 'Generate a comprehensive EARS specification with functional and non-functional requirements',
      template: `Generate an EARS specification for the following requirements:

Requirements: {requirements}
Context: {context}

Please include:
1. Functional requirements using proper EARS syntax
2. Non-functional requirements
3. Acceptance criteria
4. Traceability matrix`,
      variables: ['requirements', 'context'],
      tags: ['requirements', 'ears', 'specification'],
      createdBy: 'test-admin-1',
      isActive: true,
      usageCount: 15,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prompt-2',
      category: 'USER_STORY',
      title: 'Agile User Stories with Acceptance Criteria',
      description: 'Generate comprehensive user stories following Agile best practices',
      template: `Create detailed user stories for the following requirements:

Requirements: {requirements}
Context: {context}
User Personas: {personas}

Please include:
1. User stories in proper format
2. Acceptance criteria for each story
3. Story point estimates
4. Edge case considerations`,
      variables: ['requirements', 'context', 'personas'],
      tags: ['agile', 'user-stories', 'scrum'],
      createdBy: 'test-admin-1',
      isActive: true,
      usageCount: 23,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prompt-3',
      category: 'INTEGRATION_PLAN',
      title: 'Complete System Integration Plan',
      description: 'Generate a comprehensive integration plan with architecture diagrams and implementation details',
      template: `Create a detailed integration plan for:

Requirements: {requirements}
Systems to integrate: {systems}
Technology stack: {tech_stack}
Context: {context}

Please provide:
1. High-level architecture diagrams
2. API specifications and contracts
3. Data flow diagrams
4. Security considerations
5. Implementation timeline
6. Testing strategy`,
      variables: ['requirements', 'systems', 'tech_stack', 'context'],
      tags: ['integration', 'architecture', 'system-design'],
      createdBy: 'test-admin-1',
      isActive: true,
      usageCount: 8,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prompt-4',
      category: 'EARS_SPEC',
      title: 'Security-Focused EARS Requirements',
      description: 'Generate EARS specifications with emphasis on security requirements',
      template: `Generate security-focused EARS requirements for:

System: {system_name}
Security Level: {security_level}
Compliance Requirements: {compliance}
Context: {context}

Focus on:
1. Authentication and authorization requirements
2. Data protection requirements
3. Audit and logging requirements
4. Compliance-specific requirements`,
      variables: ['system_name', 'security_level', 'compliance', 'context'],
      tags: ['security', 'compliance', 'requirements'],
      createdBy: 'test-admin-1',
      isActive: true,
      usageCount: 12,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prompt-5',
      category: 'USER_STORY',
      title: 'Mobile App User Stories',
      description: 'Generate user stories specifically for mobile applications',
      template: `Create mobile-specific user stories for:

App Type: {app_type}
Target Platform: {platform}
Key Features: {features}
User Types: {user_types}

Include:
1. Mobile-specific user interactions
2. Offline functionality stories
3. Performance requirements
4. Device-specific considerations`,
      variables: ['app_type', 'platform', 'features', 'user_types'],
      tags: ['mobile', 'user-stories', 'ios', 'android'],
      createdBy: 'test-admin-1',
      isActive: true,
      usageCount: 19,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  samplePrompts.forEach(prompt => {
    mockPrompts.set(prompt.id, prompt);
  });
}

class PromptService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({ region: config.aws.region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = config.tables.prompts;
  }

  async getPromptsByCategory(category: string): Promise<Prompt[]> {
    if (process.env.USE_MOCK_SERVICES === 'true') {
      return Array.from(mockPrompts.values())
        .filter(prompt => prompt.category === category && prompt.isActive)
        .sort((a, b) => b.usageCount - a.usageCount);
    }

    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'CategoryIndex',
      KeyConditionExpression: 'category = :category',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: { 
        ':category': category, 
        ':isActive': true 
      }
    }));
    return result.Items as Prompt[] || [];
  }

  async getAllPrompts(): Promise<Prompt[]> {
    if (process.env.USE_MOCK_SERVICES === 'true') {
      return Array.from(mockPrompts.values())
        .filter(prompt => prompt.isActive)
        .sort((a, b) => b.usageCount - a.usageCount);
    }

    const result = await this.dynamoClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: { ':isActive': true }
    }));
    return result.Items as Prompt[] || [];
  }

  async createPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Prompt> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newPrompt: Prompt = {
      ...prompt,
      id,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    if (process.env.USE_MOCK_SERVICES === 'true') {
      mockPrompts.set(id, newPrompt);
      logger.info('Mock prompt created:', { promptId: id });
      return newPrompt;
    }

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: newPrompt
    }));

    return newPrompt;
  }

  async incrementUsage(promptId: string): Promise<void> {
    if (process.env.USE_MOCK_SERVICES === 'true') {
      const prompt = mockPrompts.get(promptId);
      if (prompt) {
        const updatedPrompt = {
          ...prompt,
          usageCount: prompt.usageCount + 1,
          updatedAt: new Date().toISOString()
        };
        mockPrompts.set(promptId, updatedPrompt);
      }
      return;
    }

    await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id: promptId },
      UpdateExpression: 'SET usageCount = usageCount + :inc, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':updatedAt': new Date().toISOString()
      }
    }));
  }
}

const promptService = new PromptService();

const createPromptSchema = Joi.object({
  category: Joi.string().valid('EARS_SPEC', 'USER_STORY', 'INTEGRATION_PLAN', 'CUSTOM').required(),
  title: Joi.string().required().min(3).max(200),
  description: Joi.string().required().min(10).max(500),
  template: Joi.string().required().min(10),
  variables: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([])
});

// Get all prompts
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category } = req.query;
    
    let prompts: Prompt[];
    if (category && typeof category === 'string') {
      prompts = await promptService.getPromptsByCategory(category);
    } else {
      prompts = await promptService.getAllPrompts();
    }

    res.json({
      success: true,
      data: { prompts }
    });
  } catch (error) {
    logger.error('Error fetching prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts'
    });
  }
});

// Create a new prompt (admin only)
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }

    const { error, value } = createPromptSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    const prompt = await promptService.createPrompt({
      ...value,
      createdBy: req.user!.userId,
      isActive: true
    });

    logger.info('Prompt created successfully', { promptId: prompt.id, createdBy: req.user!.userId });

    res.status(201).json({
      success: true,
      data: { prompt }
    });
  } catch (error) {
    logger.error('Error creating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prompt'
    });
  }
});

// Use a prompt (increment usage counter)
router.post('/:promptId/use', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { promptId } = req.params;
    
    await promptService.incrementUsage(promptId);
    
    logger.info('Prompt usage incremented', { promptId, userId: req.user!.userId });

    res.json({
      success: true,
      message: 'Prompt usage recorded'
    });
  } catch (error) {
    logger.error('Error recording prompt usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record prompt usage'
    });
  }
});

// Get prompt categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = [
      {
        id: 'EARS_SPEC',
        name: 'EARS Specification',
        description: 'Templates for generating EARS (Easy Approach to Requirements Syntax) specifications'
      },
      {
        id: 'USER_STORY',
        name: 'User Stories',
        description: 'Templates for generating Agile user stories with acceptance criteria'
      },
      {
        id: 'INTEGRATION_PLAN',
        name: 'Integration Plans',
        description: 'Templates for generating comprehensive system integration plans'
      },
      {
        id: 'CUSTOM',
        name: 'Custom',
        description: 'Custom prompt templates for specific use cases'
      }
    ];

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

export default router;