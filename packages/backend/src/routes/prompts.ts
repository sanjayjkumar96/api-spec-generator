import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { promptService } from '../services/promptService';
import { AuthRequest } from '../types';
import { z } from 'zod';

export const promptsRouter = Router();

const createPromptSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  promptText: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional().default([])
});

promptsRouter.use(authenticateToken);

promptsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;
    const prompts = await promptService.getPrompts(category as string);
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

promptsRouter.get('/categories', async (req: AuthRequest, res) => {
  try {
    const categories = await promptService.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

promptsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, category, promptText, tags } = createPromptSchema.parse(req.body);
    const prompt = await promptService.createPrompt(req.user!.id, title, category, promptText, tags);
    res.status(201).json(prompt);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});