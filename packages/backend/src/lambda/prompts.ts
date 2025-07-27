import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { promptService } from '../services/promptService';
import { authService } from '../services/authService';
import { dynamoService } from '../services/dynamoService';
import { z } from 'zod';

const createPromptSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  promptText: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional().default([])
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  try {
    const path = event.path;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // Get user from token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header required' })
      };
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    const user = await dynamoService.getUserById(decoded.id);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    if (path === '/prompts' && method === 'GET') {
      const category = event.queryStringParameters?.category;
      const prompts = await promptService.getPrompts(category || undefined);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(prompts)
      };
    }

    if (path === '/prompts/categories' && method === 'GET') {
      const categories = await promptService.getCategories();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categories)
      };
    }

    if (path === '/prompts' && method === 'POST') {
      const { title, category, promptText, tags } = createPromptSchema.parse(body);
      const prompt = await promptService.createPrompt(user.id, title, category, promptText, tags);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(prompt)
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
    };
  }
};