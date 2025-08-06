import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config/config';
import { User, UserRegistration } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Mock data store for local development
const mockUsers: Map<string, User> = new Map();

// Initialize with sample users for local development
if (process.env.USE_MOCK_SERVICES === 'true') {
  const sampleUsers: User[] = [
    {
      userId: 'user-1',
      email: 'demo@example.com',
      password: 'scrypt:16:8eAaOZ7xBqq8t7X6:64:d5e8a7c2f3b9e1a4c6d7e8f9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', // password
      role: 'user',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      userId: 'admin-1',
      email: 'admin@example.com',
      password: 'scrypt:16:8eAaOZ7xBqq8t7X6:64:d5e8a7c2f3b9e1a4c6d7e8f9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', // password
      role: 'admin',
      isActive: true,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      userId: 'testuser-1',
      email: 'test.user@company.com',
      password: 'scrypt:16:8eAaOZ7xBqq8t7X6:64:d5e8a7c2f3b9e1a4c6d7e8f9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', // password
      role: 'user',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ];

  sampleUsers.forEach(user => {
    mockUsers.set(user.userId, user);
  });
}

export class UserService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;
  private keyLength = 64;
  private saltLength = 16;

  constructor() {
    const client = new DynamoDBClient({ region: config.aws.region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = config.tables.users;
    logger.info('UserService initialized with table:', this.tableName);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(this.saltLength);
    const derivedKey = await scryptAsync(password, salt, this.keyLength) as Buffer;
    
    // Format: scrypt:saltLength:salt:keyLength:derivedKey
    return `scrypt:${this.saltLength}:${salt.toString('base64')}:${this.keyLength}:${derivedKey.toString('base64')}`;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const parts = hashedPassword.split(':');
      if (parts.length !== 5 || parts[0] !== 'scrypt') {
        return false;
      }

      const saltLength = parseInt(parts[1]);
      const salt = Buffer.from(parts[2], 'base64');
      const keyLength = parseInt(parts[3]);
      const storedKey = Buffer.from(parts[4], 'base64');

      const derivedKey = await scryptAsync(password, salt, keyLength) as Buffer;
      
      return timingSafeEqual(storedKey, derivedKey);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  async createUser(userData: UserRegistration): Promise<User> {
    const userId = uuidv4();
    const now = new Date().toISOString();
    const hashedPassword = await this.hashPassword(userData.password);

    const user: User = {
      userId,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        // Check if email already exists in mock data
        const existingUser = Array.from(mockUsers.values()).find(u => u.email === userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
        
        mockUsers.set(userId, user);
        logger.info('Mock user created:', { userId, email: userData.email });
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }

      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: user,
        ConditionExpression: 'attribute_not_exists(userId)'
      }));

      logger.info('User created:', { userId, email: userData.email });
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmailWithPassword(email);
      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error authenticating user:', error);
      return null;
    }
  }

  private async getUserByEmailWithPassword(email: string): Promise<User | null> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = Array.from(mockUsers.values()).find(u => u.email === email);
        return user || null;
      }
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      }));

      return result.Items?.[0] as User || null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw new Error('Failed to get user');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = mockUsers.get(userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        }
        return null;
      }

      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { userId }
      }));

      if (result.Item) {
        const { password, ...userWithoutPassword } = result.Item as User;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = Array.from(mockUsers.values()).find(u => u.email === email);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        }
        return null;
      }

      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      }));

      if (result.Items?.[0]) {
        const { password, ...userWithoutPassword } = result.Items[0] as User;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw new Error('Failed to get user');
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date().toISOString();
    
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = mockUsers.get(userId);
        if (user) {
          user.lastLogin = now;
          user.updatedAt = now;
          mockUsers.set(userId, user);
        }
        return;
      }

      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: 'SET lastLogin = :lastLogin, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':lastLogin': now,
          ':updatedAt': now
        }
      }));

      logger.info('User last login updated:', { userId });
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error as this is not critical
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const now = new Date().toISOString();
    
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = mockUsers.get(userId);
        if (!user) {
          return null;
        }

        const updatedUser = { ...user, ...updates, updatedAt: now };
        // Don't allow password updates through this method
        delete (updatedUser as any).password;
        
        mockUsers.set(userId, updatedUser);
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      }

      // Remove sensitive fields from updates
      const { password, userId: _, ...safeUpdates } = updates as any;
      
      const updateExpressions: string[] = [];
      const expressionAttributeValues: any = {
        ':updatedAt': now
      };
      const expressionAttributeNames: any = {};

      Object.keys(safeUpdates).forEach((key, index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = safeUpdates[key];
      });

      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';

      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      return await this.getUserById(userId);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async getAllUsers(limit: number = 50, lastEvaluatedKey?: string): Promise<{ users: User[], lastEvaluatedKey?: string }> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const users = Array.from(mockUsers.values()).map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        });
        
        return { users: users.slice(0, limit) };
      }

      const params: any = {
        TableName: this.tableName,
        Limit: limit
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString());
      }

      const result = await this.dynamoClient.send(new ScanCommand(params));
      
      const users = (result.Items || []).map(item => {
        const { password, ...userWithoutPassword } = item as User;
        return userWithoutPassword as User;
      });

      const response: { users: User[], lastEvaluatedKey?: string } = { users };
      
      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      return response;
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw new Error('Failed to get users');
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      if (process.env.USE_MOCK_SERVICES === 'true') {
        const user = mockUsers.get(userId);
        if (user) {
          user.isActive = false;
          user.updatedAt = new Date().toISOString();
          mockUsers.set(userId, user);
          return true;
        }
        return false;
      }

      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isActive': false,
          ':updatedAt': new Date().toISOString()
        }
      }));

      logger.info('User deactivated:', { userId });
      return true;
    } catch (error) {
      logger.error('Error deactivating user:', error);
      return false;
    }
  }
}