import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient, config } from '../config/aws';
import { DocumentGenerationRequest } from '../types';

export class BedrockService {
  async generateDocument(request: DocumentGenerationRequest): Promise<string> {
    if (config.useMockServices) {
      return this.mockGeneration(request);
    }

    const prompt = this.buildPrompt(request);
    
    const command = new InvokeModelCommand({
      modelId: config.bedrockModelId,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }]
          }
        ]
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  }

  private buildPrompt(request: DocumentGenerationRequest): string {
    const basePrompt = request.type === 'EARS' 
      ? this.getEARSPrompt() 
      : this.getUserStoryPrompt();
    
    return `${basePrompt}\n\nTitle: ${request.title}\n\nRequirements:\n${request.rawContent}`;
  }

  private getEARSPrompt(): string {
    return `You are an expert software architect. Convert the following requirements into formal EARS (Easy Approach to Requirements Syntax) specifications. 

Structure the output as:
1. Requirements Overview
2. Functional Requirements (FR-XXX format)
3. Non-Functional Requirements (NFR-XXX format)  
4. Acceptance Criteria (AC-XXX format with GIVEN/WHEN/THEN)

Use proper EARS syntax and group requirements logically by feature area.`;
  }

  private getUserStoryPrompt(): string {
    return `You are an expert Agile coach. Convert the following requirements into user stories with acceptance criteria.

Structure the output as:
1. Epic overview
2. User stories in format: "As a [user], I want [goal] so that [benefit]"
3. Acceptance criteria for each story
4. Definition of Done

Focus on user value and testable criteria.`;
  }

  private async mockGeneration(request: DocumentGenerationRequest): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const template = request.type === 'EARS' ? this.getMockEARSTemplate() : this.getMockUserStoryTemplate();
    
    return template
      .replace('{{title}}', request.title)
      .replace('{{rawContent}}', request.rawContent)
      .replace('{{timestamp}}', new Date().toISOString());
  }

  private getMockEARSTemplate(): string {
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

  private getMockUserStoryTemplate(): string {
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
}

export const bedrockService = new BedrockService();