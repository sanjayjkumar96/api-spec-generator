export interface User {
  id: string;
  email: string;
  role: 'Analyst' | 'Developer';
}

export interface Document {
  id: string;
  title: string;
  type: 'EARS' | 'USER_STORY';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  content?: string;
  rawContent: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  category: string;
  promptText: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentGenerationRequest {
  title: string;
  type: 'EARS' | 'USER_STORY';
  rawContent: string;
}