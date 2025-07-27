import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authService } from '../services/authService';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['Analyst', 'Developer'])
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

    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = loginSchema.parse(body);
      const result = await authService.login(email, password);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    if (path === '/auth/register' && method === 'POST') {
      const { email, password, role } = registerSchema.parse(body);
      const result = await authService.register(email, password, role);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result)
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