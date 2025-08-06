import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config/config';
import { BedrockResponse } from '../models';
import { logger } from '../utils/logger';

export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({ region: config.bedrock.region });
    this.modelId = config.bedrock.modelId;
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<BedrockResponse> {
    // Check if we're in mock mode for local development
    if (process.env.USE_MOCK_SERVICES === 'true') {
      return this.generateMockContent(prompt, systemPrompt);
    }

    try {

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          system: [
            { text: systemPrompt || 'You are a helpful AI assistant.' }
          ],
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }]
            }
          ],
          inferenceConfig: {
            maxTokens: 8192,
            temperature: 0.7,
            topP: 0.9,
            stopSequences: []
          }
        })
      });

      const response = await this.client.send(command);
      const responseData = JSON.parse(new TextDecoder().decode(response.body));

      logger.info('Bedrock response received', {
        inputTokens: responseData.usage?.inputTokens,
        outputTokens: responseData.usage?.outputTokens,
        response: responseData
      });

      // Extract content from the correct response structure
      const content = responseData.output?.message?.content?.[0]?.text || 
                     responseData.content?.[0]?.text || 
                     responseData.output?.text ||
                     responseData.text ||
                     'No content generated';

      return {
        content,
        usage: {
          inputTokens: responseData.usage?.inputTokens || 0,
          outputTokens: responseData.usage?.outputTokens || 0
        },
        metadata: {
          modelId: this.modelId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error invoking Bedrock model:', error);
      throw new Error('Failed to generate content with AI model');
    }
  }

  private async generateMockContent(prompt: string, systemPrompt?: string): Promise<BedrockResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    logger.info('Using mock Bedrock service for local development', {});

    // Generate different mock responses based on the prompt content
    let mockContent = '';

    if (prompt.toLowerCase().includes('ears') || prompt.toLowerCase().includes('specification')) {
      mockContent = this.getMockEARSSpec();
    } else if (prompt.toLowerCase().includes('user stor') || prompt.toLowerCase().includes('agile')) {
      mockContent = this.getMockUserStories();
    } else if (prompt.toLowerCase().includes('integration') || prompt.toLowerCase().includes('architecture')) {
      mockContent = this.getMockIntegrationPlan();
    } else if (prompt.toLowerCase().includes('diagram')) {
      mockContent = this.getMockDiagrams();
    } else if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('template')) {
      mockContent = this.getMockCodeTemplates();
    } else if (prompt.toLowerCase().includes('structure') || prompt.toLowerCase().includes('project')) {
      mockContent = this.getMockProjectStructure();
    } else {
      mockContent = `# Generated Content

Based on your request: "${prompt.substring(0, 100)}..."

This is a mock response generated for local development purposes. The actual AI service would provide more detailed and contextually relevant content.

## Sample Output

The system has processed your requirements and generated appropriate specifications based on the input provided.

## Key Points

1. Requirement analysis completed
2. Specifications generated according to best practices
3. Documentation structured for clarity and implementation

This mock response demonstrates the expected format and structure of the AI-generated content.`;
    }

    return {
      content: mockContent,
      usage: {
        inputTokens: Math.floor(prompt.length / 4), // Rough estimate
        outputTokens: Math.floor(mockContent.length / 4)
      },
      metadata: {
        modelId: this.modelId,
        timestamp: new Date().toISOString(),
        mockMode: true
      }
    };
  }

  private getMockEARSSpec(): string {
    return `# EARS Specification Document

## 1. Introduction and Scope

This document provides EARS (Easy Approach to Requirements Syntax) specifications for the requested system functionality.

## 2. Functional Requirements

### REQ-001: User Authentication
**WHEN** a user attempts to log in **AND** provides valid credentials, **THEN** the system **SHALL** authenticate the user and provide access to the application.

### REQ-002: Data Processing
**WHEN** the system receives input data **AND** the data format is valid, **THEN** the system **SHALL** process the data within 30 seconds.

### REQ-003: Error Handling
**IF** an error occurs during processing, **THEN** the system **SHALL** log the error and display an appropriate error message to the user.

### REQ-004: Data Storage
**WHEN** processing is completed successfully, **THEN** the system **SHALL** store the results in the designated storage location.

## 3. Non-Functional Requirements

### NFR-001: Performance
The system **SHALL** respond to user requests within 3 seconds under normal load conditions.

### NFR-002: Availability
The system **SHALL** maintain 99.9% uptime during business hours.

### NFR-003: Security
The system **SHALL** encrypt all sensitive data both in transit and at rest.

## 4. Acceptance Criteria

- All functional requirements must be implemented and tested
- Performance requirements must be verified under load testing
- Security requirements must pass security audit
- User acceptance testing must achieve 95% satisfaction rate

## 5. Traceability Matrix

| Requirement ID | Test Case ID | Status |
|---------------|--------------|--------|
| REQ-001       | TC-001       | Pending |
| REQ-002       | TC-002       | Pending |
| REQ-003       | TC-003       | Pending |
| REQ-004       | TC-004       | Pending |

---
*This is a mock EARS specification generated for local development.*`;
  }

  private getMockUserStories(): string {
    return `# User Stories

## Epic: User Management System

### Story 1: User Registration
**As a** new user  
**I want** to create an account  
**So that** I can access the system features

**Acceptance Criteria:**
- User can enter email, password, and basic profile information
- System validates email format and password strength
- User receives confirmation email after successful registration
- Duplicate email addresses are rejected with appropriate error message

**Story Points:** 5

### Story 2: User Login
**As a** registered user  
**I want** to log into my account  
**So that** I can access my personalized content

**Acceptance Criteria:**
- User can enter email and password
- System authenticates credentials securely
- Successful login redirects to user dashboard
- Failed login attempts are logged and user is notified
- Account lockout after 5 failed attempts

**Story Points:** 3

### Story 3: Password Recovery
**As a** user who forgot their password  
**I want** to reset my password  
**So that** I can regain access to my account

**Acceptance Criteria:**
- User can request password reset via email
- System generates secure reset token with expiration
- User receives email with reset link
- Reset link allows user to set new password
- Old password is invalidated after successful reset

**Story Points:** 8

## Epic: Content Management

### Story 4: Create Content
**As a** authenticated user  
**I want** to create new content  
**So that** I can share information with others

**Acceptance Criteria:**
- User can access content creation interface
- System provides rich text editing capabilities
- User can save draft and publish content
- Published content is immediately available to appropriate audience
- Content creation is logged for audit purposes

**Story Points:** 13

### Story 5: Edit Content
**As a** content owner  
**I want** to edit my existing content  
**So that** I can keep information current and accurate

**Acceptance Criteria:**
- User can only edit their own content
- System preserves version history
- Changes are saved automatically as drafts
- User can preview changes before publishing
- Edit timestamps are recorded

**Story Points:** 8

---
*These are mock user stories generated for local development.*`;
  }

  private getMockIntegrationPlan(): string {
    return `# Comprehensive Integration Plan

## Table of Contents
1. System Architecture & Diagrams
2. Code Templates & API Specifications
3. Project Structure & Organization
4. Implementation Summary

---

## 1. System Architecture & Diagrams

### High-Level Architecture
\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (React)       │◄──►│   (Express)     │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Load Balancer │    │   Database      │
                       │                 │    │   (PostgreSQL)  │
                       └─────────────────┘    └─────────────────┘
\`\`\`

### Component Interaction Diagram
\`\`\`
User Request → Frontend → API Gateway → Authentication Service
                    ↓
            Business Logic Service → Database Service
                    ↓
            Response Formatting → API Gateway → Frontend → User
\`\`\`

### Data Flow Architecture
1. **Input Layer**: Receives user requests and validates input
2. **Processing Layer**: Handles business logic and data transformation
3. **Storage Layer**: Manages data persistence and retrieval
4. **Output Layer**: Formats and returns responses to clients

---

## 2. Code Templates & API Specifications

### API Endpoint Specifications

#### Authentication Endpoints
\`\`\`typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
\`\`\`

#### Data Management Endpoints
\`\`\`typescript
// GET /api/data
interface DataListResponse {
  data: DataItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// POST /api/data
interface CreateDataRequest {
  title: string;
  content: string;
  metadata?: Record<string, any>;
}
\`\`\`

### Database Schema Templates
\`\`\`sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data table
CREATE TABLE data_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## 3. Project Structure & Organization

\`\`\`
project-root/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   └── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── types/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── shared/
│   └── types/
├── docs/
│   ├── api/
│   └── deployment/
└── docker-compose.yml
\`\`\`

---

## 4. Implementation Summary

This integration plan provides a comprehensive approach to implementing the requested system. 

### Key Components:
- **Architecture**: Scalable microservices design with clear separation of concerns
- **Implementation**: Modern tech stack with TypeScript, React, and Node.js
- **Organization**: Well-structured codebase with proper separation of frontend/backend

### Next Steps:
1. Review the architecture diagrams and validate against requirements
2. Set up the project structure as outlined
3. Implement the API specifications using the provided templates
4. Configure database schema and initial data
5. Set up CI/CD pipeline for automated deployment

### Security Considerations:
- JWT-based authentication
- Input validation and sanitization
- HTTPS encryption for all communications
- Regular security audits and updates

### Performance Optimization:
- Database indexing strategy
- Caching implementation
- Load balancing configuration
- CDN setup for static assets

---
*This integration plan is a mockup generated for local development.*`;
  }

  private getMockDiagrams(): string {
    return `# System Architecture Diagrams

## High-Level System Design

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│                        User Interface Layer                  │
├──────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App   │  Admin Dashboard        │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                       │
├──────────────────────────────────────────────────────────────┤
│  Load Balancer  │  Rate Limiting  │  Authentication         │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                     │
├──────────────────────────────────────────────────────────────┤
│  Auth Service  │  Data Service  │  Notification Service     │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                      Data Storage Layer                     │
├──────────────────────────────────────────────────────────────┤
│  Primary DB    │  Cache Layer   │  File Storage              │
└──────────────────────────────────────────────────────────────┘
\`\`\`

## Component Interaction Diagrams

### Authentication Flow
\`\`\`
User → Frontend → API Gateway → Auth Service → Database
                     │              │
                     ▼              ▼
              JWT Token ←────── User Validation
                     │
                     ▼
               Frontend Storage
\`\`\`

### Data Processing Flow
\`\`\`
Client Request → Validation → Business Logic → Database Query
      │                                              │
      ▼                                              ▼
  Error Handler ←─────── Processing Engine ←──── Data Transform
      │                       │                      │
      ▼                       ▼                      ▼
  Error Response          Success Response      Cache Update
\`\`\`

## Deployment Architecture

\`\`\`
┌─────────────────┐
│   Load Balancer │
└─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Server1 │ │ Server2 │
└─────────┘ └─────────┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│    Database     │
│   Cluster       │
└─────────────────┘
\`\`\`

## Security Architecture Overview

\`\`\`
Internet → WAF → Load Balancer → API Gateway
                     │               │
                     ▼               ▼
               Rate Limiter    Authentication
                     │               │
                     ▼               ▼
            DDoS Protection    Authorization
                     │               │
                     └───────┬───────┘
                             ▼
                     Application Layer
                             │
                             ▼
                    Encrypted Database
\`\`\`

---
*These are mock architecture diagrams generated for local development.*`;
  }

  private getMockCodeTemplates(): string {
    return `# Code Templates and Implementation Examples

## API Client Template

\`\`\`typescript
// api-client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, apiKey?: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': \`Bearer \${apiKey}\` })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(\`Making request to: \${config.url}\`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url);
    return response.data;
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }
}
\`\`\`

## Data Transfer Objects (DTOs)

\`\`\`typescript
// dto/user.dto.ts
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// dto/job.dto.ts
export interface CreateJobDto {
  title: string;
  description: string;
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN';
  input: {
    requirements: string;
    context?: string;
    format?: string;
    additionalParams?: Record<string, any>;
  };
}

export interface JobResponseDto {
  jobId: string;
  userId: string;
  title: string;
  description: string;
  jobType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  input: any;
  output?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}
\`\`\`

## Service Layer Template

\`\`\`typescript
// services/base.service.ts
export abstract class BaseService<T> {
  protected abstract repository: any;

  async findById(id: string): Promise<T | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      console.error(\`Error finding \${this.constructor.name} by ID:\`, error);
      throw new Error(\`Failed to find record with ID: \${id}\`);
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      console.error(\`Error creating \${this.constructor.name}:\`, error);
      throw new Error('Failed to create record');
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      return await this.repository.update(id, data);
    } catch (error) {
      console.error(\`Error updating \${this.constructor.name}:\`, error);
      throw new Error(\`Failed to update record with ID: \${id}\`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error(\`Error deleting \${this.constructor.name}:\`, error);
      throw new Error(\`Failed to delete record with ID: \${id}\`);
    }
  }
}
\`\`\`

## Error Handling Template

\`\`\`typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error as AppError;

  if (process.env.NODE_ENV === 'production') {
    // Don't leak error details in production
    if (statusCode === 500) {
      message = 'Something went wrong!';
    }
  }

  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    }
  });
};
\`\`\`

## Configuration Template

\`\`\`typescript
// config/app.config.ts
interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    maxConnections: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origins: string[];
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/myapp',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10)
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
  }
};
\`\`\`

---
*These are mock code templates generated for local development.*`;
  }

  private getMockProjectStructure(): string {
    return `# Recommended Project Structure

## Full-Stack Application Structure

\`\`\`
project-name/
├── .gitignore
├── README.md
├── docker-compose.yml
├── package.json (workspace root)
├── tsconfig.json (base config)
│
├── packages/
│   ├── frontend/
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── favicon.ico
│   │   │   └── manifest.json
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   │   ├── Button/
│   │   │   │   │   ├── Modal/
│   │   │   │   │   └── Loading/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header/
│   │   │   │   │   ├── Footer/
│   │   │   │   │   └── Sidebar/
│   │   │   │   └── features/
│   │   │   │       ├── auth/
│   │   │   │       ├── dashboard/
│   │   │   │       └── profile/
│   │   │   ├── pages/
│   │   │   │   ├── Home/
│   │   │   │   ├── Login/
│   │   │   │   ├── Dashboard/
│   │   │   │   └── Profile/
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── storage.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useApi.ts
│   │   │   │   └── useLocalStorage.ts
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── ui.ts
│   │   │   ├── utils/
│   │   │   │   ├── constants.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   └── validation.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── user.ts
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   ├── variables.css
│   │   │   │   └── components.css
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── .env.example
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   └── job.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── job.service.ts
│   │   │   │   └── email.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── base.repository.ts
│   │   │   │   ├── user.repository.ts
│   │   │   │   └── job.repository.ts
│   │   │   ├── models/
│   │   │   │   ├── index.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   └── job.model.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── error.middleware.ts
│   │   │   │   └── logging.middleware.ts
│   │   │   ├── routes/
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   └── job.routes.ts
│   │   │   ├── config/
│   │   │   │   ├── database.ts
│   │   │   │   ├── jwt.ts
│   │   │   │   └── app.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── crypto.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── constants.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── express.d.ts
│   │   │   │   └── environment.d.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   ├── seeds/
│   │   │   │   └── connection.ts
│   │   │   ├── lambda/ (if using serverless)
│   │   │   │   ├── handlers/
│   │   │   │   └── layers/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   └── controllers/
│   │   │   ├── integration/
│   │   │   │   └── routes/
│   │   │   ├── fixtures/
│   │   │   └── setup.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   ├── .env.example
│   │   └── Dockerfile
│   │
│   └── shared/ (optional)
│       ├── types/
│       │   ├── api.ts
│       │   ├── user.ts
│       │   └── common.ts
│       ├── utils/
│       │   ├── validation.ts
│       │   └── constants.ts
│       └── package.json
│
├── docs/
│   ├── api/
│   │   ├── openapi.yaml
│   │   └── endpoints.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   └── database-schema.md
│   ├── deployment/
│   │   ├── production.md
│   │   └── development.md
│   └── user-guide/
│       └── getting-started.md
│
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   ├── setup-dev.sh
│   └── migrate.sh
│
├── infra/ (Infrastructure as Code)
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── docker/
│       ├── Dockerfile.frontend
│       └── Dockerfile.backend
│
└── .github/ (CI/CD)
    └── workflows/
        ├── ci.yml
        ├── cd.yml
        └── security.yml
\`\`\`

## Key Directory Explanations

### Frontend Structure (\`packages/frontend/\`)
- **components/**: Reusable UI components organized by type
- **pages/**: Route-level components representing different pages
- **services/**: API communication and external service integrations
- **hooks/**: Custom React hooks for reusable logic
- **store/**: State management (Redux, Zustand, etc.)
- **utils/**: Helper functions and utilities
- **types/**: TypeScript type definitions

### Backend Structure (\`packages/backend/\`)
- **controllers/**: Request/response handling and routing logic
- **services/**: Business logic and core functionality
- **repositories/**: Data access layer and database operations
- **models/**: Data models and schema definitions
- **middleware/**: Express middleware for auth, validation, etc.
- **routes/**: API route definitions and organization

### Development Workflow Structure
- **Root package.json**: Workspace configuration and shared scripts
- **Individual package.json**: Package-specific dependencies and scripts
- **Docker configuration**: Containerization for consistent environments
- **CI/CD workflows**: Automated testing and deployment
- **Documentation**: Comprehensive project documentation

## Benefits of This Structure

1. **Separation of Concerns**: Clear boundaries between frontend, backend, and shared code
2. **Scalability**: Easy to add new features and maintain existing ones
3. **Developer Experience**: Intuitive organization that new developers can understand quickly
4. **Testability**: Clear structure supports comprehensive testing strategies
5. **Deployment**: Well-organized for containerization and cloud deployment

---
*This is a mock project structure recommendation generated for local development.*`;
  }

  async generateEARSSpec(requirements: string, context?: string): Promise<BedrockResponse> {
    const systemPrompt = `You are an expert requirements engineer specializing in EARS (Easy Approach to Requirements Syntax) specifications. 
Create comprehensive, well-structured requirements following EARS syntax patterns:

EARS Syntax Guidelines:
- State-driven: "WHEN <optional preconditions> <optional trigger> the <system name> SHALL <system response>"
- Event-driven: "WHEN <trigger> the <system name> SHALL <system response>"  
- Unwanted behaviors: "IF <condition>, THEN the <system name> SHALL <system response>"
- Complex requirements: Use proper logical operators (AND, OR, NOT)
- Ubiquitous requirements: "The <system name> SHALL <system response>"

Document Structure:
1. Executive Summary with scope and objectives
2. Functional Requirements (using proper EARS syntax)
3. Non-functional Requirements (performance, security, usability)
4. System Constraints and Assumptions
5. Acceptance Criteria with testable conditions
6. Traceability Matrix linking requirements to test cases

Quality Standards:
- Each requirement must be atomic, testable, and unambiguous
- Include priority levels (Must Have, Should Have, Could Have)
- Add requirement IDs for traceability (REQ-001, REQ-002, etc.)
- Specify measurable criteria where applicable`;

    const prompt = `Create a comprehensive EARS specification document for the following requirements:

**Requirements:** ${requirements}

${context ? `**Additional Context:** ${context}` : ''}

**Instructions:**
- Generate a complete, professional specification document
- Follow EARS syntax strictly for all functional requirements
- Include at least 8-12 well-defined requirements
- Add non-functional requirements for performance, security, and usability
- Create a traceability matrix with test case references
- Use proper requirement numbering and categorization
- Include acceptance criteria that are measurable and testable

Please provide a detailed, production-ready EARS specification.`;

    return this.generateContent(prompt, systemPrompt);
  }

  async generateUserStories(requirements: string, context?: string): Promise<BedrockResponse> {
    const systemPrompt = `You are an expert Agile coach and product manager with deep experience in writing effective user stories. 
Create detailed user stories following industry best practices:

User Story Format:
- Use the standard format: "As a [user type], I want [functionality] so that [benefit]"
- Include clear acceptance criteria using Given-When-Then format
- Add story points estimation (1, 2, 3, 5, 8, 13, 21)
- Consider different user personas and their unique needs

Quality Guidelines:
- Stories must be INVEST compliant (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Include edge cases and error scenarios
- Group related stories into epics when appropriate
- Add definition of done criteria
- Consider accessibility and inclusive design
- Include technical considerations and constraints

Story Enhancement:
- Add assumptions and dependencies
- Include wireframe or mockup references where relevant
- Specify API endpoints or data requirements
- Consider integration points with other systems
- Add performance and security considerations`;

    const prompt = `Transform the following requirements into comprehensive user stories:

**Requirements:** ${requirements}

${context ? `**Additional Context:** ${context}` : ''}

**Instructions:**
- Create 6-10 detailed user stories covering all aspects
- Include multiple user personas (end users, admins, system integrators)
- Write comprehensive acceptance criteria for each story
- Add story point estimates with justification
- Group stories into logical epics
- Include edge cases and error handling scenarios
- Add technical notes for development team
- Consider cross-cutting concerns (security, performance, accessibility)

Generate well-structured, implementable user stories ready for sprint planning.`;

    return this.generateContent(prompt, systemPrompt);
  }

  async generateIntegrationPlan(requirements: string, context?: string): Promise<BedrockResponse> {
    const systemPrompt = `You are a senior solution architect specializing in API integrations and system design.
Create comprehensive integration plans that serve as complete implementation guides.

Integration Plan Components:
1. Executive Summary and Integration Overview
2. System Architecture and Component Design
3. API Specifications and Data Contracts
4. Security Architecture and Authentication
5. Error Handling and Resilience Patterns
6. Testing Strategy and Quality Assurance
7. Deployment and Operations Guide
8. Monitoring and Observability
9. Performance and Scalability Considerations
10. Risk Assessment and Mitigation

Technical Excellence:
- Follow industry best practices and design patterns
- Include detailed sequence diagrams and architecture views
- Specify exact API endpoints, methods, and data formats
- Address scalability, security, and reliability requirements
- Include comprehensive error handling strategies
- Consider backward compatibility and versioning
- Plan for monitoring, logging, and alerting

Implementation Guidance:
- Provide step-by-step implementation approach
- Include configuration examples and code snippets
- Specify third-party dependencies and tools
- Address deployment strategies and rollback procedures
- Include testing approaches and validation criteria`;

    const prompt = `Create a comprehensive API integration plan for the following EARS specifications:

**EARS Specifications:** ${requirements}

${context ? `**Additional Context:** ${context}` : ''}

**Deliverables Required:**
1. Detailed system architecture with component interactions
2. Complete API specifications with request/response formats
3. Authentication and authorization mechanisms
4. Data transformation and validation logic
5. Error handling and retry strategies
6. Performance requirements and optimization approaches
7. Security considerations and threat mitigation
8. Testing strategy including unit, integration, and end-to-end tests
9. Deployment pipeline and environment setup
10. Monitoring, logging, and alerting configuration

**Focus Areas:**
- Ensure high availability and fault tolerance
- Implement proper security measures (authentication, authorization, encryption)
- Design for scalability and performance
- Include comprehensive error handling
- Plan for operational excellence (monitoring, logging, metrics)
- Consider compliance and regulatory requirements
- Address data privacy and protection

Generate a production-ready integration plan that development teams can implement directly.`;

    return this.generateContent(prompt, systemPrompt);
  }
}