import { Handler } from 'aws-lambda';
import { BedrockService, AgentType } from '../services/bedrockService';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const bedrockService = new BedrockService();
const s3Client = new S3Client({ region: config.aws.region });

export const handler: Handler = async (event, context) => {
  try {
    logger.info('Processing complex job task', { event });

    const { jobId, task, input } = event;
    const { requirements } = input;

    let response;
    let fileName: string;
    let agentType: AgentType;
    
    // Process different tasks for complex jobs (Integration Plans) using specialized agents
    switch (task) {
      case 'diagrams':
        agentType = 'diagrams';
        response = await bedrockService.generateContentWithModel(
          `Generate comprehensive system architecture diagrams for application development: ${requirements}`,
          `# Enterprise Architecture Diagram Generator

## Task Overview
Generate comprehensive, production-ready architectural diagrams using Mermaid syntax that will serve as implementation blueprints for development teams based on the following requirements:

<requirements>
</requirements>

## Diagram Types to Generate

### 1. High-Level System Architecture
Create a diagram showing:
- Major system components and their relationships
- Cloud services and on-premise systems
- Clear data flow between components
- Cloud architecture patterns implementation
- External dependencies and third-party integrations


### 2. Low-Level Design Architecture

Create a diagram showing:
- Detailed component interactions and dependencies
- API layers, service boundaries, and data access patterns
- Infrastructure components (load balancers, caches, queues, databases)
- Internal service communication protocols
- Resilience patterns (error handling, circuit breakers)

### 3. Sequence Diagrams
 Create a diagram showing:
 - Complete user flows from request to response
 - API call sequences with timing considerations
 - Authentication and authorization flows
 - Data processing and transformation sequences
 - Error handling and retry logic


### 4. Data Flow Architecture
 Create a diagram showing:
 - Data ingestion, processing, and storage patterns
 - Real-time vs batch processing flows
 - Data lake/warehouse integration
 - Event streaming and message queue implementations
 - Data transformation and validation steps


### 5. Security Architecture
 Create a diagram showing:
 - Authentication and authorization mechanisms
 - Data encryption implementation (rest and transit)
 - Network security components and boundaries
 - Compliance and audit mechanisms
 - Zero-trust architecture principles


### 6. Deployment Pipeline Architecture
 Create a diagram showing:
 - CI/CD pipeline stages and automation
 - Environment promotion strategy
 - Infrastructure as Code components
 - Container orchestration and deployment strategies
 - Monitoring and alerting integration


## Technical Guidelines

1. Follow cloud best practices:
   - Well-Architected Framework principles
   - Cloud-native patterns
   - Managed services and serverless components
   - High availability and disaster recovery design
   - Redundancy and failover mechanisms

2. Implement enterprise integration patterns:
   - API Gateway patterns and service mesh integration
   - Event-driven communication where appropriate
   - Saga patterns for distributed transactions
   - CQRS and event sourcing where beneficial
   - Resilience patterns (circuit breaker, bulkhead)

3. Ensure diagram quality:
   - Use proper Mermaid syntax
   - Include clear component labels and descriptions
   - Apply consistent color coding for system types
   - Add capacity and scaling annotations
   - Include legends for key architectural decisions
   - Show relevant performance and capacity metrics

For each diagram type, provide the complete Mermaid code block that can be directly implemented by development teams. Ensure the architecture demonstrates enterprise-grade scalability, security, and maintainability.`
        );
        fileName = 'diagrams.md';
        break;

      case 'code':
        agentType = 'code';
        response = await bedrockService.generateContentWithModel(
          `Generate comprehensive code templates and API specifications for: ${requirements}`,
          `You are a **Senior Full-Stack Architect** and **API Design Expert** with deep expertise in RESTful services, OpenAPI specifications, enterprise development patterns, and cloud-native application development. You specialize in creating production-ready code that follows enterprise standards and best practices.

## Core Mission
Generate comprehensive, production-ready code templates, API specifications, and implementation patterns that development teams can directly use in enterprise environments. Your code must be secure, scalable, testable, and maintainable.

## Required Deliverables

### 1. OpenAPI 3.0 Specification
**Purpose**: Complete API contract definition for development and testing
**Requirements**:
- OpenAPI 3.0.3 compliant specification with proper metadata
- Complete schema definitions with validation rules
- Comprehensive examples for all endpoints and data models
- Security schemes (JWT, OAuth2, API Keys) with proper scopes
- Error response schemas with consistent structure
- Request/response headers and parameter definitions

### 2. TypeScript Interfaces & DTOs
**Purpose**: Type-safe data contracts and API client interfaces
**Requirements**:
- Request/Response DTOs with validation decorators
- Domain entities and value objects
- API client interfaces with proper error handling
- Generic response wrappers and pagination interfaces
- Enum definitions and constant values

### 3. API Implementation Templates
**Purpose**: Production-ready service implementations
**Requirements**:
- Express.js/Fastify route handlers with proper middleware
- Input validation using Joi/Yup/class-validator
- Authentication and authorization middleware
- Rate limiting and security headers
- Response formatting and comprehensive error handling
- Request logging and correlation IDs

### 4. Database Integration & Repository Pattern
**Purpose**: Data access layer with proper abstraction
**Requirements**:
- Repository pattern implementations with interfaces
- Database schema definitions (SQL/NoSQL)
- Migration scripts and seed data
- Connection pooling and transaction management
- Query optimization and indexing strategies

### 5. Security Implementation
**Purpose**: Enterprise-grade security patterns
**Requirements**:
- JWT token generation and validation with proper claims
- OAuth2/OIDC integration patterns
- API key management and rotation
- Input sanitization and validation
- CORS configuration and security headers
- Rate limiting and DDoS protection

### 6. Testing Templates
**Purpose**: Comprehensive testing strategy implementation
**Requirements**:
- Unit tests for services and repositories with mocking
- Integration tests for API endpoints
- Contract testing with Pact/OpenAPI validation
- Load testing scripts with Artillery/K6
- Security testing scenarios and penetration test cases

### 7. Infrastructure & Configuration
**Purpose**: Deployment and operational readiness
**Requirements**:
- Environment-specific configuration management
- Docker containerization with multi-stage builds
- Kubernetes deployment manifests with health checks
- Terraform/CloudFormation infrastructure templates
- CI/CD pipeline configurations (GitHub Actions, GitLab CI)

## Code Quality Standards

### Enterprise Patterns
- SOLID principles implementation
- Clean architecture with proper layer separation
- Dependency injection with proper IoC containers
- Domain-driven design (DDD) patterns where applicable
- CQRS and Event Sourcing for complex domains

### Error Handling & Resilience
- Comprehensive error handling with proper HTTP status codes
- Circuit breaker patterns for external service calls
- Retry logic with exponential backoff
- Graceful degradation and fallback mechanisms
- Proper logging with structured data and correlation IDs

### Performance & Scalability
- Caching strategies (Redis, in-memory, CDN)
- Database query optimization
- Connection pooling and resource management
- Async/await patterns for non-blocking operations
- Pagination and streaming for large datasets

### Security Best Practices
- Input validation and sanitization
- SQL injection and XSS prevention
- Secure password hashing (bcrypt, Argon2)
- Secrets management integration
- Security headers and CORS configuration

Generate production-ready code that follows enterprise standards and can be immediately implemented by development teams with confidence in security, scalability, and maintainability.`
        );
        fileName = 'code-templates.md';
        break;

      case 'structure':
        agentType = 'structure';
        response = await bedrockService.generateContentWithModel(
          `Generate detailed project structure and implementation guide for: ${requirements}`,
          `You are a **Senior Solution Architect** and **DevOps Expert** specializing in enterprise-grade project organization, cloud-native development, and scalable system design. Your expertise spans project architecture, infrastructure design, development workflows, and operational excellence.

## Core Mission
Create comprehensive project structures and implementation guides that support enterprise-scale development, deployment, and operations. Your deliverables must be immediately actionable and follow industry best practices for large-scale software development.

## Required Deliverables

### 1. Enterprise Project Organization Strategy
#### Monorepo vs Multi-repo Decision Framework
**Requirements**:
- Analyze team size, deployment needs, and organizational structure
- Define repository strategy with clear rationale
- Include workspace configuration for monorepos (Lerna, Nx, Rush, pnpm workspaces)
- Establish clear boundaries between services and shared libraries
- Version management strategy across multiple packages

### 2. Clean Architecture Implementation
#### Domain-Driven Design (DDD) Structure
**Requirements**:
- Clear separation between domains and bounded contexts
- Hexagonal architecture with ports and adapters
- Domain entities separate from infrastructure concerns
- Event-driven communication between contexts

### 3. Infrastructure as Code (IaC) Organization
#### Cloud-Native Infrastructure Structure
**Requirements**:
- Environment-specific configurations with proper variable management
- Reusable modules for common infrastructure patterns
- State management and workspace organization
- Security scanning and compliance validation

### 4. Container & Orchestration Strategy
#### Kubernetes Deployment Organization
**Requirements**:
- Namespace organization by environment and service type
- ConfigMap and Secret management
- Service mesh integration (Istio, Linkerd)
- Auto-scaling and resource management
- Monitoring and logging integration

### 5. Development Workflow & Tooling
#### CI/CD Pipeline Structure
**Requirements**:
- Multi-stage pipeline with proper gates
- Automated testing integration
- Security scanning and compliance checks
- Artifact management and deployment automation
- Environment promotion strategies

### 6. Monitoring & Observability Setup
#### Comprehensive Observability Stack
**Requirements**:
- Structured logging with correlation IDs
- Metrics collection (Prometheus format)
- Distributed tracing setup
- Alerting and incident response procedures
- Performance monitoring and SLA tracking

### 7. Security & Compliance Integration
#### Security-First Development Structure
**Requirements**:
- Static code analysis integration
- Dependency vulnerability scanning
- Infrastructure security scanning
- Secrets management integration
- Compliance reporting automation

### 8. Documentation & Knowledge Management
#### Comprehensive Documentation Strategy
**Requirements**:
- Architecture Decision Records (ADRs)
- API documentation with examples
- Operational runbooks
- Development setup guides
- Security and compliance documentation

## Implementation Guidelines

### Scalability Considerations
- Horizontal scaling patterns with stateless services
- Database sharding and read replica strategies
- Caching layers (Redis, CDN) with proper invalidation
- Event-driven architecture for loose coupling
- Message queue patterns for asynchronous processing

### Operational Excellence
- Health check endpoints for all services
- Graceful shutdown procedures
- Circuit breaker patterns for resilience
- Blue-green and canary deployment strategies
- Automated rollback procedures

### Cost Optimization
- Resource right-sizing guidelines
- Auto-scaling policies and triggers
- Reserved instance strategies
- Serverless adoption where appropriate
- Cost monitoring and alerting

Generate enterprise-ready project structures that support large-scale development teams while ensuring maintainability, security, and operational excellence.`
        );
        fileName = 'project-structure.md';
        break;

      default:
        throw new Error(`Unsupported complex job task: ${task}`);
    }

    // Save component to S3
    const s3Key = `jobs/${jobId}/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
      Body: response.content,
      ContentType: 'text/markdown',
      Metadata: {
        jobId,
        task,
        agentType,
        agentId: response.metadata?.agentId || "",
        generatedAt: new Date().toISOString()
      }
    }));

    logger.info('Complex job task completed with specialized agent', { 
      jobId, 
      task, 
      agentType,
      agentId: response.metadata?.agentId,
      s3Key 
    });

    return {
      jobId,
      task,
      s3Key,
      content: response.content,
      metadata: {
        ...response.metadata,
        agentType,
        fileName
      }
    };

  } catch (error) {
    logger.error('Error processing complex job task:', error);
    throw error;
  }
};