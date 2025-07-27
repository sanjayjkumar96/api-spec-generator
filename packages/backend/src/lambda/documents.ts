import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { documentService } from '../services/documentService';
import { authService } from '../services/authService';
import { dynamoService } from '../services/dynamoService';
import { z } from 'zod';

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['EARS', 'USER_STORY']),
  rawContent: z.string().min(1).max(10000)
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

    if (path === '/documents' && method === 'POST') {
      const { title, type, rawContent } = createDocumentSchema.parse(body);
      const result = await documentService.generateDocument(user.id, { title, type, rawContent });
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify(result)
      };
    }

    if (path === '/documents' && method === 'GET') {
      const documents = await documentService.getUserDocuments(user.id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(documents)
      };
    }

    if (path.startsWith('/documents/') && method === 'GET') {
      const id = path.split('/')[2];
      const document = await documentService.getDocumentById(id, user.id);
      if (!document) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Document not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(document)
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