import { Handler } from 'aws-lambda';
import { BedrockService } from '../services/bedrockService';
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
    
    // Process different tasks for complex jobs (Integration Plans)
    switch (task) {
      case 'diagrams':
        response = await bedrockService.generateContent(
          `Generate comprehensive system architecture diagrams for API integration: ${requirements}`,
          `You are a senior cloud solution architect specializing in API integrations and enterprise system design.

Create detailed architectural diagrams using Mermaid syntax for the following diagram types:

## Required Diagram Types:

### 1. High-Level System Architecture
- Show major system components and their relationships
- Include cloud services (AWS/Azure/GCP) and on-premise systems
- Display data flow between components
- Use proper cloud architecture patterns (microservices, event-driven, etc.)

### 2. Low-Level Design Architecture
- Detailed component interactions and dependencies
- API layers, service boundaries, and data access patterns
- Include load balancers, caches, message queues, and databases
- Show internal service communication protocols

### 3. Sequence Diagrams
- Complete user flow from request to response
- API call sequences with timing and error handling
- Authentication and authorization flows
- Data processing and transformation sequences

### 4. User Flow Diagrams
- End-to-end user journey mapping
- Decision points and alternative paths
- Error scenarios and recovery flows
- Multi-user role interactions

### 5. Deployment Pipeline Architecture
- CI/CD pipeline stages and automation
- Environment promotion strategy (dev → staging → prod)
- Infrastructure as Code (IaC) components
- Container orchestration and deployment strategies

### 6. Security Architecture
- Authentication and authorization mechanisms
- Data encryption at rest and in transit
- Network security and firewalls
- Compliance and audit trails
- Zero-trust architecture principles

### 7. Data Flow Architecture
- Data ingestion, processing, and storage patterns
- Real-time vs batch processing flows
- Data lake/warehouse integration
- Event streaming and message queues

### 8. Network Architecture
- VPC/Virtual Network design
- Subnets, security groups, and routing
- CDN and edge computing components
- Multi-region deployment topology

## Technical Requirements:

### Cloud Best Practices:
- Use AWS Well-Architected Framework principles (Security, Reliability, Performance, Cost Optimization, Operational Excellence)
- Implement cloud-native patterns (auto-scaling, fault tolerance, observability)
- Include managed services and serverless components where appropriate
- Design for multi-region availability and disaster recovery

### Open Source Integration:
- Leverage open source tools for monitoring (Prometheus, Grafana, ELK Stack)
- Use open source API gateways (Kong, Ambassador, Istio)
- Include container orchestration (Kubernetes, Docker Swarm)
- Integrate open source security tools (OWASP tools, vulnerability scanners)

### Diagram Standards:
- Use Mermaid syntax exclusively for all diagrams
- Include proper component labels and descriptions
- Add color coding for different system types
- Include capacity and scaling annotations
- Show redundancy and failover mechanisms

### Format Requirements:
- Each diagram must be in separate markdown code blocks with \`\`\`mermaid
- Include descriptive titles and legends
- Add annotations for key architectural decisions
- Include performance and capacity metrics where relevant

Generate production-ready architectural diagrams that serve as implementation blueprints for development teams.`
        );
        fileName = 'diagrams.md';
        break;

      case 'code':
        response = await bedrockService.generateContent(
          `Generate comprehensive code templates and API specifications for: ${requirements}`,
          `You are a senior full-stack architect and API design expert specializing in RESTful services and OpenAPI specifications.

Create production-ready code templates and API specifications following these requirements:

## API Design Standards:

### 1. OpenAPI 3.0 Specification
- Complete OpenAPI 3.0.3 compliant specification
- Include proper schema definitions, parameters, and responses
- Add comprehensive examples for all endpoints
- Include authentication schemes (JWT, OAuth2, API Keys)
- Define error response schemas and status codes

### 2. RESTful API Principles
- Proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Resource-based URL design with proper hierarchies
- Consistent naming conventions (kebab-case for URLs, camelCase for JSON)
- Stateless design with proper caching headers
- HATEOAS principles where applicable

### 3. API Versioning Strategy
- URL path versioning (/v1/, /v2/) or header-based versioning
- Backward compatibility guidelines
- Deprecation policies and sunset notices
- Version migration strategies

## Code Templates Required:

### 1. TypeScript Interfaces & DTOs
- Request/Response DTOs with validation decorators
- Domain entities and value objects
- API client interfaces and implementations
- Generic response wrappers and pagination interfaces
- Error type definitions and custom exceptions

### 2. API Implementation Templates
- Express.js/Fastify route handlers with middleware
- Input validation using Joi/Yup/class-validator
- Authentication and authorization middleware
- Rate limiting and security headers
- Response formatting and error handling

### 3. Database Integration
- Repository pattern implementations
- Database schema definitions (SQL/NoSQL)
- Migration scripts and seed data
- Connection pooling and transaction management
- Data access layer with ORM/ODM integration

### 4. Security Implementation
- JWT token generation and validation
- OAuth2/OIDC integration patterns
- API key management and rotation
- Input sanitization and validation
- CORS configuration and security headers

### 5. Testing Templates
- Unit tests for services and repositories
- Integration tests for API endpoints
- Contract testing with Pact/OpenAPI
- Load testing scripts with Artillery/K6
- Security testing scenarios

### 6. Configuration & Infrastructure
- Environment-specific configuration files
- Docker containerization with multi-stage builds
- Kubernetes deployment manifests
- Terraform/CloudFormation infrastructure templates
- CI/CD pipeline configurations (GitHub Actions, GitLab CI)

### 7. Monitoring & Observability
- Structured logging with correlation IDs
- Metrics collection (Prometheus format)
- Health check endpoints
- Distributed tracing setup
- Error tracking and alerting

## Cloud Best Practices:

### AWS Integration:
- Lambda function templates with proper error handling
- API Gateway integration with custom authorizers
- DynamoDB access patterns and GSI design
- S3 integration for file operations
- CloudWatch logging and metrics

### Microservices Patterns:
- Service discovery and load balancing
- Circuit breaker and retry patterns
- Event-driven communication (SQS, SNS, EventBridge)
- Saga pattern for distributed transactions
- API composition and aggregation patterns

## Open Source Tools Integration:

### Development Tools:
- ESLint and Prettier configurations
- Husky pre-commit hooks
- Jest testing framework setup
- OpenAPI code generation workflows
- Swagger UI integration

### Production Tools:
- Nginx reverse proxy configurations
- Redis caching implementations
- RabbitMQ/Apache Kafka message handling
- Grafana dashboard templates
- ELK Stack logging pipeline

## Code Quality Standards:
- SOLID principles implementation
- Clean architecture patterns
- Dependency injection patterns
- Error handling best practices
- Performance optimization techniques
- Security scanning integration

## Documentation Requirements:
- Inline code documentation (JSDoc/TSDoc)
- API documentation with examples
- Architecture decision records (ADRs)
- Deployment and operations guides
- Troubleshooting and FAQ sections

Generate comprehensive, production-ready code that follows enterprise-grade standards and can be directly implemented by development teams.`
        );
        fileName = 'code-templates.md';
        break;

      case 'structure':
        response = await bedrockService.generateContent(
          `Generate detailed project structure and implementation guide for: ${requirements}`,
          `You are a senior project architect and DevOps expert specializing in enterprise-grade project organization and cloud-native development.

Create a comprehensive project structure and implementation guide following these requirements:

## Project Organization Standards:

### 1. Monorepo vs Multi-repo Strategy
- Define repository structure based on team size and deployment needs
- Include workspace configuration for monorepos (Lerna, Nx, Rush)
- Establish clear boundaries between services and shared libraries
- Version management strategy across multiple packages

### 2. Directory Structure Best Practices
- Clean architecture with clear separation of concerns
- Domain-driven design (DDD) folder organization
- Shared libraries and common utilities placement
- Environment-specific configurations
- Infrastructure as Code (IaC) organization

### 3. Package Management & Dependencies
- Package.json with proper version pinning and security policies
- Dependency management strategies (exact versions vs ranges)
- Private package registry setup
- License compliance and vulnerability scanning
- Build optimization and bundle analysis

## Cloud-Native Project Structure:

### 1. Microservices Architecture
- Service-specific folders with clear boundaries
- Shared libraries and contracts
- API gateway and service mesh configurations
- Inter-service communication patterns
- Event-driven architecture components

### 2. Infrastructure as Code (IaC)
- Terraform/CloudFormation templates organization
- Environment-specific variable files
- Module structure for reusable components
- State management and workspace organization
- Deployment pipeline definitions

### 3. Container & Orchestration
- Dockerfile optimization strategies
- Docker Compose for local development
- Kubernetes manifests organization
- Helm charts for complex deployments
- Service mesh configuration files

## Development Workflow Structure:

### 1. Source Code Organization
- Feature-based vs layer-based folder structure
- Clean architecture implementation (entities, use cases, adapters)
- Domain models and business logic separation
- Data access layer abstraction
- External service integrations

### 2. Testing Strategy Organization
- Unit tests co-located with source code
- Integration tests with proper environment setup
- End-to-end tests with page object patterns
- Performance and load testing suites
- Security and compliance testing

### 3. Documentation Structure
- API documentation (OpenAPI/Swagger)
- Architecture Decision Records (ADRs)
- Runbooks and operational guides
- Development setup and contribution guides
- Security and compliance documentation

## Build & Deployment Structure:

### 1. CI/CD Pipeline Organization
- Multi-stage pipeline definitions
- Build artifact management
- Environment promotion strategies
- Automated testing integration
- Security scanning and compliance checks

### 2. Configuration Management
- Environment-specific configurations
- Secret management integration
- Feature flag configurations
- Monitoring and logging setup
- Performance tuning parameters

### 3. Deployment Strategies
- Blue-green deployment configurations
- Canary release setup
- Rollback and disaster recovery procedures
- Multi-region deployment coordination
- Database migration strategies

## Security & Compliance Structure:

### 1. Security Integration
- Static code analysis configurations
- Dependency vulnerability scanning
- Infrastructure security scanning
- Secrets management integration
- Compliance reporting automation

### 2. Monitoring & Observability
- Logging configuration and aggregation
- Metrics collection and dashboards
- Distributed tracing setup
- Alerting and incident response procedures
- Performance monitoring integration

## Development Tools Configuration:

### 1. IDE & Editor Setup
- VSCode workspace configurations
- ESLint, Prettier, and formatting rules
- Git hooks and pre-commit checks
- Debugging configurations
- Extension recommendations

### 2. Local Development Environment
- Docker Compose for local services
- Mock servers and test data setup
- Environment variable management
- Database seeding and migration
- Hot reloading and development servers

## Open Source Integration:

### 1. Community Standards
- Contributing guidelines and code of conduct
- License management and compatibility
- Changelog and release notes automation
- Issue and pull request templates
- Community health metrics

### 2. Tool Integration
- GitHub Actions/GitLab CI configurations
- SonarQube quality gates
- Renovate/Dependabot for dependency updates
- Semantic release automation
- NPM/Docker registry integration

## Scalability Considerations:

### 1. Performance Structure
- Caching layer organization
- CDN and static asset management
- Database optimization strategies
- API rate limiting and throttling
- Resource allocation and auto-scaling

### 2. Maintenance & Operations
- Log rotation and archival strategies
- Backup and disaster recovery procedures
- Monitoring and alerting configurations
- Capacity planning and resource management
- Technical debt tracking and management

Generate a production-ready project structure that supports enterprise-scale development, deployment, and operations with clear implementation guidelines for each component.`
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
        generatedAt: new Date().toISOString()
      }
    }));

    logger.info('Complex job task completed', { jobId, task, s3Key });

    return {
      jobId,
      task,
      s3Key,
      content: response.content,
      metadata: response.metadata
    };

  } catch (error) {
    logger.error('Error processing complex job task:', error);
    throw error;
  }
};