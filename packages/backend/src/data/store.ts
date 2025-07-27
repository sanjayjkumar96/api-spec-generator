import { User, Document, Prompt } from '../types';

// In-memory data store (replace with DynamoDB in production)
export class DataStore {
  private users: Map<string, User> = new Map();
  private documents: Map<string, Document> = new Map();
  private prompts: Map<string, Prompt> = new Map();

  constructor() {
    this.seedData();
  }

  // User operations
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // Document operations
  createDocument(document: Document): Document {
    this.documents.set(document.id, document);
    return document;
  }

  updateDocument(id: string, updates: Partial<Document>): Document | undefined {
    const doc = this.documents.get(id);
    if (doc) {
      const updated = { ...doc, ...updates, updatedAt: new Date() };
      this.documents.set(id, updated);
      return updated;
    }
    return undefined;
  }

  getDocumentById(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getDocumentsByUserId(userId: string): Document[] {
    return Array.from(this.documents.values())
      .filter(d => d.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Prompt operations
  createPrompt(prompt: Prompt): Prompt {
    this.prompts.set(prompt.id, prompt);
    return prompt;
  }

  getPrompts(category?: string): Prompt[] {
    let prompts = Array.from(this.prompts.values());
    if (category) {
      prompts = prompts.filter(p => p.category === category);
    }
    return prompts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private seedData() {
    // Seed test user
    const testUser: User = {
      id: '1',
      email: 'test@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      role: 'Analyst',
      createdAt: new Date().toISOString()
    };
    this.users.set(testUser.id, testUser);

    // Seed prompts
    const prompts: Prompt[] = [
      {
        id: '1',
        title: 'Generate Python Pytest for FastAPI endpoint',
        category: 'Testing',
        promptText: 'Create comprehensive pytest test cases for the following FastAPI endpoint. Include positive, negative, and edge cases with proper mocking.',
        authorId: '1',
        tags: ['python', 'pytest', 'fastapi', 'testing'],
        usageCount: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'React Component with TypeScript',
        category: 'React',
        promptText: 'Generate a React functional component with TypeScript that follows best practices including proper typing, error handling, and accessibility.',
        authorId: '1',
        tags: ['react', 'typescript', 'component'],
        usageCount: 8,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    prompts.forEach(p => this.prompts.set(p.id, p));
  }
}

export const dataStore = new DataStore();