export interface User {
  id: string;
  email: string;
  password: string;
  role: 'Analyst' | 'Developer';
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  type: 'EARS' | 'USER_STORY';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  content?: string;
  rawContent: string;
  s3Key?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  category: string;
  promptText: string;
  authorId: string;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentGenerationRequest {
  title: string;
  type: 'EARS' | 'USER_STORY';
  rawContent: string;
}

export interface AuthRequest extends Request {
  user?: User;
}