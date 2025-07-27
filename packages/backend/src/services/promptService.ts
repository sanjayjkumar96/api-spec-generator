import { Prompt } from '../types';
import { dynamoService } from './dynamoService';
import { v4 as uuidv4 } from 'uuid';

export class PromptService {
  async getPrompts(category?: string): Promise<Prompt[]> {
    return await dynamoService.getPrompts(category);
  }

  async createPrompt(authorId: string, title: string, category: string, promptText: string, tags: string[] = []): Promise<Prompt> {
    const prompt: Prompt = {
      id: uuidv4(),
      title,
      category,
      promptText,
      authorId,
      tags,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await dynamoService.createPrompt(prompt);
  }

  async getCategories(): Promise<string[]> {
    const prompts = await dynamoService.getPrompts();
    const categories = new Set(prompts.map(p => p.category));
    return Array.from(categories).sort();
  }
}

export const promptService = new PromptService();