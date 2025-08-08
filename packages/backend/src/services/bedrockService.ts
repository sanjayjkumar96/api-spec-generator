import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockAgentRuntimeClient, InvokeAgentCommand, RetrieveCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { config } from '../config/config';
import { BedrockResponse } from '../models';
import { logger } from '../utils/logger';

export type AgentType = 'diagrams' | 'code' | 'structure' | 'orchestrator' | 'default';

export class BedrockService {
  private client: BedrockRuntimeClient;
  private agentClient: BedrockAgentRuntimeClient;
  private modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({ region: config.bedrock.region });
    this.agentClient = new BedrockAgentRuntimeClient({ region: config.bedrock.region });
    this.modelId = config.bedrock.modelId;
  }

  /**
   * Generate content using direct model invocation (for simple jobs)
   */
  async generateContentWithModel(prompt: string, systemPrompt?: string): Promise<BedrockResponse> {
    // Check if we're in mock mode for local development
    if (process.env.USE_MOCK_SERVICES === 'true') {
      return this.generateMockContent(prompt, systemPrompt);
    }

    try {
      let enhancedSystemPrompt = systemPrompt || 'You are a helpful AI assistant.';
      let knowledgeBaseContext = '';
      
      // Retrieve knowledge base context if enabled
      if (config.bedrock.knowledgeBase.enableKnowledgeBase) {
        try {
          const knowledgeBaseResults = await this.retrieveKnowledgeBaseContent(prompt);
          if (knowledgeBaseResults && knowledgeBaseResults.length > 0) {
            knowledgeBaseContext = this.formatKnowledgeBaseResults(knowledgeBaseResults);
            enhancedSystemPrompt = `${systemPrompt || 'You are a helpful AI assistant.'}\n\n## Knowledge Base Context:\n${knowledgeBaseContext}\n\nUse the above knowledge base information to provide accurate and contextual responses. Reference specific information from the knowledge base when relevant.`;
            
            logger.info('Knowledge base context retrieved and added', {
              resultsCount: knowledgeBaseResults.length,
              contextLength: knowledgeBaseContext.length
            });
          }
        } catch (kbError) {
          logger.warn('Failed to retrieve knowledge base content, proceeding without it', { error: kbError });
          // Continue without knowledge base context rather than failing the entire request
        }
      }

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          system: [
            { text: enhancedSystemPrompt }
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

      logger.info('Direct model response received', {
        modelId: this.modelId,
        inputTokens: responseData.usage?.inputTokens,
        outputTokens: responseData.usage?.outputTokens,
        knowledgeBaseUsed: knowledgeBaseContext.length > 0
      });

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
          timestamp: new Date().toISOString(),
          mode: 'direct-model',
          knowledgeBaseUsed: knowledgeBaseContext.length > 0,
          knowledgeBaseResultsCount: knowledgeBaseContext.length > 0 ? 
            (knowledgeBaseContext.match(/\n\n/g) || []).length + 1 : 0
        }
      };
    } catch (error) {
      logger.error('Error invoking Bedrock model directly:', error);
      throw new Error('Failed to generate content with direct model invocation');
    }
  }

  /**
   * Generate content using specialized agent (for complex tasks)
   */
  async generateContentWithAgent(prompt: string, agentType: AgentType, systemPrompt?: string): Promise<BedrockResponse> {
    // Check if we're in mock mode for local development
    if (process.env.USE_MOCK_SERVICES === 'true') {
      return this.generateMockContent(prompt, systemPrompt);
    }

    try {
      // Get agent configuration based on type
      const agentConfig = this.getAgentConfig(agentType);
      
      // Use agent for enhanced content generation
      const command = new InvokeAgentCommand({
        agentId: agentConfig.agentId,
        agentAliasId: agentConfig.agentAliasId,
        sessionId: `session-${agentType}-${Date.now()}`,
        inputText: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`
      });

      const response = await this.agentClient.send(command);

      logger.info('Bedrock agent response received', {
        agentType,
        agentId: agentConfig.agentId,
        sessionId: response.sessionId
      });

      // Handle streaming response
      let content = 'No content generated';
      if (response.completion) {
        content = await this.processStreamResponse(response.completion);
      }

      return {
        content,
        usage: {
          inputTokens: 0, // Not available in agent response
          outputTokens: 0  // Not available in agent response
        },
        metadata: {
          modelId: this.modelId,
          agentId: agentConfig.agentId,
          agentAliasId: agentConfig.agentAliasId,
          agentType,
          sessionId: response.sessionId,
          timestamp: new Date().toISOString(),
          mode: 'agent'
        }
      };
    } catch (error) {
      logger.error('Error invoking Bedrock agent:', { agentType, error });
      throw new Error(`Failed to generate content with ${agentType} agent`);
    }
  }

  /**
   * Legacy method for backward compatibility - delegates to appropriate method
   */
  async generateContent(prompt: string, systemPrompt?: string, agentType?: AgentType): Promise<BedrockResponse> {
    if (config.features.useMultiAgent && agentType && agentType !== 'default') {
      return this.generateContentWithAgent(prompt, agentType, systemPrompt);
    } else {
      // For simple jobs or when multi-agent is disabled, use direct model
      return this.generateContentWithModel(prompt, systemPrompt);
    }
  }

  /**
   * Get agent configuration based on type
   */
  private getAgentConfig(agentType: AgentType): { agentId: string; agentAliasId: string } {
    switch (agentType) {
      case 'diagrams':
        return config.bedrock.agents.diagrams;
      case 'code':
        return config.bedrock.agents.code;
      case 'structure':
        return config.bedrock.agents.structure;
      case 'orchestrator':
        return config.bedrock.agents.orchestrator;
      case 'default':
      default:
        return config.bedrock.defaultAgent;
    }
  }

  private async processStreamResponse(completion: any): Promise<string> {
    let content = '';
    
    try {
      for await (const chunk of completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          content += text;
        }
      }
    } catch (error) {
      logger.error('Error processing stream:', error);
      return 'Error processing response';
    }
    
    return content || 'No content generated';
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

  private getMockDiagrams(): string {
    return `# System Diagrams

## Architecture Overview
\`\`\`mermaid
graph TB
    A[User Interface] --> B[API Gateway]
    B --> C[Authentication Service]
    B --> D[Business Logic Service]
    D --> E[Database]
    D --> F[External APIs]
\`\`\`

## Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>API: POST /auth/login
    API->>Database: Validate user
    Database-->>API: User data
    API-->>Frontend: JWT token
    Frontend-->>User: Dashboard
\`\`\`

## Component Diagram
\`\`\`mermaid
graph LR
    subgraph "Frontend Layer"
        A[React Components]
        B[State Management]
        C[API Client]
    end
    
    subgraph "Backend Layer"
        D[Controllers]
        E[Services]
        F[Repositories]
    end
    
    subgraph "Data Layer"
        G[Database]
        H[Cache]
        I[File Storage]
    end
    
    A --> C
    C --> D
    D --> E
    E --> F
    F --> G
    E --> H
    E --> I
\`\`\`

---
*These are mock diagrams generated for local development.*`;
  }

  private getMockCodeTemplates(): string {
    return `# Code Templates

## TypeScript Interface Templates
\`\`\`typescript
// User interface
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Authentication token
interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}
\`\`\`

## Express.js Route Template
\`\`\`typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/users
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await userService.getAll();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

export default router;
\`\`\`

## React Component Template
\`\`\`typescript
import React, { useState, useEffect } from 'react';
import { User } from '../types/User';
import { userService } from '../services/userService';

interface UserListProps {
  className?: string;
}

export const UserList: React.FC<UserListProps> = ({ className }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.getAll();
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={className}>
      {users.map(user => (
        <div key={user.id}>
          {user.name} ({user.email})
        </div>
      ))}
    </div>
  );
};
\`\`\`

---
*These are mock code templates generated for local development.*`;
  }

  private getMockProjectStructure(): string {
    return `# Project Structure Recommendations

## Monorepo Structure
\`\`\`
project-root/
├── packages/
│   ├── frontend/          # React/Vue/Angular application
│   ├── backend/           # Node.js/Express API server
│   ├── shared/            # Shared types and utilities
│   └── mobile/            # React Native/Flutter app
├── tools/
│   ├── build/             # Build configuration
│   ├── deploy/            # Deployment scripts
│   └── docs/              # Documentation generation
├── configs/
│   ├── eslint/            # Linting configuration
│   ├── prettier/          # Code formatting
│   └── jest/              # Testing configuration
└── infrastructure/
    ├── terraform/         # Infrastructure as Code
    ├── docker/            # Container definitions
    └── kubernetes/        # K8s manifests
\`\`\`

## Microservices Structure
\`\`\`
services/
├── api-gateway/           # Entry point and routing
├── auth-service/          # Authentication and authorization
├── user-service/          # User management
├── notification-service/  # Email/SMS notifications
├── file-service/          # File upload and storage
└── shared/
    ├── middleware/        # Common middleware
    ├── types/             # Shared TypeScript types
    └── utils/             # Utility functions
\`\`\`

## Frontend Architecture
\`\`\`
src/
├── components/
│   ├── ui/                # Reusable UI components
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── pages/                 # Route-level components
├── hooks/                 # Custom React hooks
├── services/              # API and external services
├── store/                 # State management
├── utils/                 # Helper functions
├── types/                 # TypeScript definitions
└── assets/                # Static assets
\`\`\`

## Backend Architecture
\`\`\`
src/
├── controllers/           # Request/response handling
├── services/              # Business logic
├── repositories/          # Data access layer
├── models/                # Data models
├── middleware/            # Express middleware
├── routes/                # API route definitions
├── config/                # Configuration files
├── utils/                 # Utility functions
└── types/                 # TypeScript definitions
\`\`\`

---
*This is a mock project structure generated for local development.*`;
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

    return this.generateContentWithModel(prompt, systemPrompt);
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

    return this.generateContentWithModel(prompt, systemPrompt);
  }

  async generateIntegrationPlan(requirements: string, context?: string): Promise<BedrockResponse> {
    const systemPrompt = `You are a senior cloud solution architect and API integration expert specializing in enterprise-grade system design and implementation.

Create comprehensive API integration templates that serve as complete implementation blueprints for development teams.

## Core Deliverables Required:

### 1. Executive Summary & Integration Overview
- Business context and integration objectives
- Stakeholder impact analysis and success criteria
- High-level timeline and resource requirements
- Risk assessment with mitigation strategies

### 2. High-Level System Architecture
- Cloud-native architecture patterns (microservices, event-driven, serverless)
- Multi-tier application design with proper separation of concerns
- Cloud service integration (AWS/Azure/GCP managed services)
- Scalability and high availability design patterns
- Disaster recovery and business continuity planning

### 3. Low-Level Design Architecture
- Detailed component interactions and data flow
- API gateway patterns and service mesh integration
- Database design with proper indexing and partitioning
- Caching strategies and performance optimization
- Security boundaries and access control mechanisms

### 4. Sequence Diagrams & User Flows
- Complete user journey mapping with decision points
- API call sequences with error handling flows
- Authentication and authorization sequences
- Data processing and transformation workflows
- Event-driven communication patterns

### 5. Deployment Pipeline Architecture
- CI/CD pipeline design with automated testing
- Infrastructure as Code (IaC) patterns
- Container orchestration and service deployment
- Environment promotion strategies (dev → staging → prod)
- Monitoring and observability integration

### 6. Security Architecture
- Zero-trust security model implementation
- Identity and access management (IAM) design
- Data encryption at rest and in transit
- API security patterns (OAuth2, JWT, API keys)
- Compliance and audit trail mechanisms

### 7. OpenAPI 3.0 Specifications
- Complete RESTful API design following REST principles
- Proper HTTP method usage and status code handling
- Resource-based URL design with clear hierarchies
- Request/response schema definitions with validation
- API versioning and backward compatibility strategies

### 8. Production-Ready Code Templates
- TypeScript/JavaScript implementations with proper typing
- Database integration patterns (Repository, Active Record)
- Authentication and authorization middleware
- Error handling and logging implementations
- Testing strategies (unit, integration, contract, load)

### 9. Cloud Best Practices Implementation
- AWS Well-Architected Framework compliance
- Auto-scaling and load balancing configurations
- Managed service integration (RDS, ElastiCache, SQS, SNS)
- Cost optimization strategies and resource tagging
- Performance monitoring and alerting setup

### 10. Open Source Tool Integration
- Containerization with Docker and Kubernetes
- Monitoring stack (Prometheus, Grafana, ELK Stack)
- API gateway solutions (Kong, Ambassador, Istio)
- Development tools (ESLint, Prettier, Jest, Swagger)
- Security scanning tools (OWASP ZAP, Snyk, Trivy)

## Technical Excellence Standards:

### Architecture Patterns:
- Domain-driven design (DDD) principles
- SOLID design principles implementation
- Clean architecture patterns
- Event sourcing and CQRS where applicable
- Microservices communication patterns

### Cloud-Native Design:
- Twelve-factor app methodology compliance
- Stateless service design with external state management
- Circuit breaker and retry patterns for resilience
- Distributed tracing and observability
- Blue-green and canary deployment strategies

### API Design Excellence:
- RESTful resource modeling with proper HTTP semantics
- Consistent error handling and status code usage
- Pagination, filtering, and sorting standardization
- Rate limiting and throttling implementation
- API documentation with interactive examples

### Security Best Practices:
- Defense in depth security strategy
- Principle of least privilege access control
- Input validation and output encoding
- Secure communication protocols (TLS 1.3)
- Regular security assessments and penetration testing

### Performance & Scalability:
- Horizontal and vertical scaling strategies
- Database optimization and query performance
- CDN integration for static content delivery
- Asynchronous processing patterns
- Resource pooling and connection management

## Implementation Guidelines:

### Development Workflow:
- Git branching strategies and code review processes
- Automated testing and quality gates
- Continuous integration and deployment pipelines
- Infrastructure provisioning and configuration management
- Documentation and knowledge sharing practices

### Operational Excellence:
- Monitoring and alerting strategies
- Log aggregation and analysis
- Incident response and recovery procedures
- Capacity planning and resource optimization
- Maintenance and update procedures

### Compliance & Governance:
- Data privacy and protection regulations (GDPR, CCPA)
- Industry-specific compliance requirements
- Audit trail and regulatory reporting
- Change management and approval processes
- Risk management and business impact assessment

Generate enterprise-grade API integration templates that development teams can implement directly in production environments with confidence in scalability, security, and maintainability.`;

    const prompt = `Create a comprehensive API integration plan for the following EARS specifications:

**EARS Specifications:** ${requirements}

${context ? `**Additional Context:** ${context}` : ''}

## Required Output Structure:

### 1. Executive Summary & Business Context
- Integration objectives and success criteria
- Stakeholder impact analysis
- Timeline and resource estimates
- Risk assessment and mitigation strategies

### 2. System Architecture (High-Level)
Using Mermaid diagrams, show:
- Overall system topology and component relationships
- Cloud services integration and data flow
- Security boundaries and access control points
- Scalability and availability patterns

### 3. Detailed Design (Low-Level)
Using Mermaid diagrams, include:
- Component interaction diagrams
- Database schema and relationships
- API layers and service boundaries
- Error handling and recovery flows

### 4. User Flow & Sequence Diagrams
Using Mermaid diagrams, demonstrate:
- End-to-end user journey mapping
- API call sequences with timing
- Authentication and authorization flows
- Event-driven communication patterns

### 5. Deployment Pipeline Architecture
Using Mermaid diagrams, detail:
- CI/CD pipeline stages and automation
- Infrastructure provisioning workflow
- Environment promotion strategy
- Monitoring and alerting integration

### 6. Security Architecture
Using Mermaid diagrams, outline:
- Identity and access management
- Data encryption and key management
- Network security and firewall rules
- Compliance and audit mechanisms

### 7. OpenAPI 3.0 Specification
Provide complete REST API specification including:
- Resource endpoints with proper HTTP methods
- Request/response schemas with validation
- Authentication schemes and security definitions
- Error responses and status codes
- API versioning and deprecation policies

### 8. Implementation Code Templates
Include production-ready code for:
- TypeScript interfaces and DTOs
- Express.js/Fastify route handlers
- Database models and repositories
- Authentication and authorization middleware
- Error handling and logging utilities
- Unit and integration test examples

### 9. Project Structure & Organization
Detail enterprise-grade project structure:
- Monorepo/multi-repo strategy
- Source code organization patterns
- Configuration management approach
- Build and deployment scripts
- Documentation and knowledge base

### 10. Cloud Infrastructure Configuration
Provide infrastructure templates for:
- Terraform/CloudFormation resources
- Docker containerization setup
- Kubernetes deployment manifests
- Environment-specific configurations
- Monitoring and logging setup

## Open Source Diagram Tools Integration:
- Use Mermaid syntax exclusively for all diagrams
- Include PlantUML alternatives where complex diagrams are needed
- Provide draw.io/Lucidchart export formats
- Include ASCII art diagrams for documentation
- Add Graphviz DOT notation for complex relationships

## Cloud Best Practices Focus:
- AWS Well-Architected Framework alignment
- Multi-region deployment strategies
- Auto-scaling and load balancing
- Managed service integration
- Cost optimization and resource tagging
- Performance monitoring and alerting

Generate a production-ready integration plan that serves as a complete implementation blueprint for enterprise development teams.`;

    return this.generateContentWithAgent(prompt, 'orchestrator', systemPrompt);
  }

  /**
   * Retrieve relevant content from knowledge base
   */
  private async retrieveKnowledgeBaseContent(query: string): Promise<any[]> {
    if (!config.bedrock.knowledgeBase.knowledgeBaseId || 
        config.bedrock.knowledgeBase.knowledgeBaseId === 'your-knowledge-base-id') {
      logger.info('Knowledge base ID not configured, skipping retrieval', {});
      return [];
    }

    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: config.bedrock.knowledgeBase.knowledgeBaseId,
        retrievalQuery: {
          text: query
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: config.bedrock.knowledgeBase.numberOfResults
          }
        }
      });

      const response = await this.agentClient.send(command);
      
      logger.info('Knowledge base retrieval completed', {
        knowledgeBaseId: config.bedrock.knowledgeBase.knowledgeBaseId,
        query: query.substring(0, 100),
        resultsCount: response.retrievalResults?.length || 0
      });

      return response.retrievalResults || [];
    } catch (error) {
      logger.error('Error retrieving from knowledge base:', { 
        error: error instanceof Error ? error.message : String(error),
        knowledgeBaseId: config.bedrock.knowledgeBase.knowledgeBaseId 
      });
      throw error;
    }
  }

  /**
   * Format knowledge base results into context string
   */
  private formatKnowledgeBaseResults(results: any[]): string {
    if (!results || results.length === 0) {
      return '';
    }

    const formattedResults = results
      .filter(result => result.content?.text) // Only include results with text content
      .map((result, index) => {
        const metadata = result.metadata || {};
        const score = result.score ? ` (Relevance: ${Math.round(result.score * 100)}%)` : '';
        const source = metadata.source || metadata.uri || `Source ${index + 1}`;
        
        return `### Knowledge Source: ${source}${score}

${result.content.text.trim()}

---`;
      })
      .join('\n\n');

    if (!formattedResults) {
      return '';
    }

    return `The following information has been retrieved from the knowledge base to help provide accurate and contextual responses:

${formattedResults}

Please use this knowledge base information to enhance your response with specific, accurate details where relevant.`;
  }
}