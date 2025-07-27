import { Document, DocumentGenerationRequest } from '../types';
import { dynamoService } from './dynamoService';
import { bedrockService } from './bedrockService';
import { s3Service } from './s3Service';
import { sesService } from './sesService';
import { stepFunctionService } from './stepFunctionService';
import { config } from '../config/aws';
import { v4 as uuidv4 } from 'uuid';

export class DocumentService {
  async generateDocument(userId: string, request: DocumentGenerationRequest): Promise<{ documentId: string; status: string }> {
    const document: Document = {
      id: uuidv4(),
      userId,
      title: request.title,
      type: request.type,
      status: 'PENDING',
      rawContent: request.rawContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoService.createDocument(document);

    if (config.useMockServices) {
      // Use mock processing
      this.processDocumentAsync(document.id, userId, request);
    } else {
      // Use Step Functions for orchestration
      await stepFunctionService.startDocumentGeneration(document.id, userId, request);
    }

    return { documentId: document.id, status: 'PENDING' };
  }

  private async processDocumentAsync(documentId: string, userId: string, request: DocumentGenerationRequest) {
    try {
      // Generate content with Bedrock (or mock)
      const generatedContent = await bedrockService.generateDocument(request);
      
      // Save to S3 (or mock)
      const s3Key = await s3Service.saveDocument(documentId, generatedContent);
      
      // Update document status
      await dynamoService.updateDocument(documentId, {
        status: 'COMPLETED',
        content: generatedContent,
        s3Key
      });

      // Send notification email
      const user = await dynamoService.getUserById(userId);
      if (user) {
        await sesService.sendDocumentCompletionEmail(user.email, request.title, documentId);
      }

      console.log(`Document ${documentId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await dynamoService.updateDocument(documentId, {
        status: 'FAILED',
        errorMessage
      });

      // Send failure notification
      const user = await dynamoService.getUserById(userId);
      if (user) {
        await sesService.sendDocumentFailureEmail(user.email, request.title, errorMessage);
      }

      console.error(`Document ${documentId} failed:`, error);
    }
  }

  private getEARSTemplate(): string {
    return `# {{title}}

## EARS Specification

Generated on: {{timestamp}}

### Requirements Overview
Based on the provided requirements:

{{rawContent}}

### Functional Requirements

**FR-001: Core Functionality**
- The system SHALL provide the primary functionality as described
- The system SHALL handle user inputs appropriately
- The system SHALL return expected outputs

**FR-002: Data Management**
- The system SHALL store data securely
- The system SHALL validate all input data
- The system SHALL maintain data integrity

### Non-Functional Requirements

**NFR-001: Performance**
- The system SHALL respond within 2 seconds for standard operations
- The system SHALL support concurrent users

**NFR-002: Security**
- The system SHALL authenticate all users
- The system SHALL encrypt sensitive data
- The system SHALL log all security events

### Acceptance Criteria

**AC-001: User Interface**
- GIVEN a user accesses the system
- WHEN they perform standard operations
- THEN the system responds appropriately

**AC-002: Data Processing**
- GIVEN valid input data
- WHEN the system processes the data
- THEN the output meets specified requirements`;
  }

  private getUserStoryTemplate(): string {
    return `# {{title}}

## User Stories

Generated on: {{timestamp}}

Based on requirements: {{rawContent}}

### Epic: Core Functionality

**Story 1: User Access**
As a user, I want to access the system so that I can perform my required tasks.

**Acceptance Criteria:**
- User can log in with valid credentials
- User sees appropriate dashboard upon login
- User can navigate to main features

**Story 2: Data Management**
As a user, I want to manage my data so that I can maintain accurate information.

**Acceptance Criteria:**
- User can create new data entries
- User can view existing data
- User can update data as needed
- User can delete data when appropriate

**Story 3: System Integration**
As a user, I want the system to integrate with other tools so that I can work efficiently.

**Acceptance Criteria:**
- System connects to required external services
- Data synchronizes correctly
- Error handling works properly`;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return await dynamoService.getDocumentsByUserId(userId);
  }

  async getDocumentById(documentId: string, userId: string): Promise<Document | null> {
    const document = await dynamoService.getDocumentById(documentId);
    if (document && document.userId === userId) {
      return document;
    }
    return null;
  }
}

export const documentService = new DocumentService();