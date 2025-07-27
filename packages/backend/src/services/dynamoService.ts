import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, config } from '../config/aws';
import { User, Document, Prompt } from '../types';
import { dataStore } from '../data/store';
import { v4 as uuidv4 } from 'uuid';

export class DynamoService {
  // User operations
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    if (config.useMockServices) {
      const newUser = { ...user, id: uuidv4() };
      return dataStore.createUser(newUser);
    }

    const newUser = { ...user, id: uuidv4() };
    await docClient.send(new PutCommand({
      TableName: config.dynamoTables.users,
      Item: newUser
    }));
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (config.useMockServices) {
      return dataStore.getUserByEmail(email);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamoTables.users,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }));

    return result.Items?.[0] as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (config.useMockServices) {
      return dataStore.getUserById(id);
    }

    const result = await docClient.send(new GetCommand({
      TableName: config.dynamoTables.users,
      Key: { id }
    }));

    return result.Item as User;
  }

  // Document operations
  async createDocument(document: Document): Promise<Document> {
    if (config.useMockServices) {
      return dataStore.createDocument(document);
    }

    await docClient.send(new PutCommand({
      TableName: config.dynamoTables.documents,
      Item: document
    }));
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    if (config.useMockServices) {
      return dataStore.updateDocument(id, updates);
    }

    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date();
    updateExpression.push('#updatedAt = :updatedAt');

    const result = await docClient.send(new UpdateCommand({
      TableName: config.dynamoTables.documents,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    return result.Attributes as Document;
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    if (config.useMockServices) {
      return dataStore.getDocumentById(id);
    }

    const result = await docClient.send(new GetCommand({
      TableName: config.dynamoTables.documents,
      Key: { id }
    }));

    return result.Item as Document;
  }

  async getDocumentsByUserId(userId: string): Promise<Document[]> {
    if (config.useMockServices) {
      return dataStore.getDocumentsByUserId(userId);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamoTables.documents,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false // Sort by creation date descending
    }));

    return result.Items as Document[];
  }

  // Prompt operations
  async createPrompt(prompt: Prompt): Promise<Prompt> {
    if (config.useMockServices) {
      return dataStore.createPrompt(prompt);
    }

    await docClient.send(new PutCommand({
      TableName: config.dynamoTables.prompts,
      Item: prompt
    }));
    return prompt;
  }

  async getPrompts(category?: string): Promise<Prompt[]> {
    if (config.useMockServices) {
      return dataStore.getPrompts(category);
    }

    if (category) {
      const result = await docClient.send(new QueryCommand({
        TableName: config.dynamoTables.prompts,
        IndexName: 'CategoryIndex',
        KeyConditionExpression: 'category = :category',
        ExpressionAttributeValues: { ':category': category },
        ScanIndexForward: false
      }));
      return result.Items as Prompt[];
    }

    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamoTables.prompts,
      ScanIndexForward: false
    }));

    return result.Items as Prompt[];
  }
}

export const dynamoService = new DynamoService();