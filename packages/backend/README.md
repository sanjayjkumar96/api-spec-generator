# SpecGen AI Backend

A serverless Node.js/Express backend API for the SpecGen AI application, built with AWS Lambda, DynamoDB, S3, and Step Functions.

## Architecture

The backend is designed as a serverless microservices architecture:

- **API Gateway + Lambda**: RESTful API endpoints
- **DynamoDB**: NoSQL database for jobs, users, and prompts
- **S3**: File storage for generated documents
- **Step Functions**: Orchestrates complex job processing workflows
- **AWS Bedrock**: AI content generation using Claude 3 Sonnet

## Features

- 🔐 JWT-based authentication
- 📝 Job management system with async processing
- 🤖 AI-powered content generation (EARS specs, user stories, integration plans)
- 📚 Prompt template library
- 🔄 Asynchronous job processing with Step Functions
- 📁 S3 file storage and management
- 📊 Real-time job status tracking
- 🛡️ Security middleware and error handling

## Quick Start

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Serverless Framework CLI
- AWS account with appropriate permissions

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set JWT_SECRET to a secure random string
```

### Local Development

```bash
# Start local development server
npm run dev

# Or use Serverless Offline
serverless offline
```

The API will be available at `http://localhost:3001`

### Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Remove deployment
npm run remove
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh JWT token

### Jobs
- `POST /jobs` - Create new job
- `GET /jobs` - Get user's jobs
- `GET /jobs/:id` - Get specific job
- `GET /jobs/:id/status` - Get job status
- `POST /jobs/:id/cancel` - Cancel job

### Prompts
- `GET /prompts` - Get all prompts
- `GET /prompts/categories` - Get prompt categories
- `POST /prompts` - Create prompt (admin only)
- `POST /prompts/:id/use` - Record prompt usage

## Job Types

1. **EARS_SPEC**: Generate EARS (Easy Approach to Requirements Syntax) specifications
2. **USER_STORY**: Generate Agile user stories with acceptance criteria
3. **INTEGRATION_PLAN**: Generate comprehensive integration plans with architecture diagrams, code templates, and project structure

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `JWT_SECRET`: Secret key for JWT token signing
- `AWS_REGION`: AWS region for deployment
- `BEDROCK_MODEL_ID`: AWS Bedrock model identifier

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route handlers
├── middleware/       # Express middleware
├── models/          # TypeScript interfaces
├── services/        # Business logic services
├── utils/           # Utility functions
└── lambda/          # Lambda function handlers
```

## Step Functions Workflow

Complex jobs (Integration Plans) use Step Functions for parallel processing:

1. **Route by Job Type**: Determines processing path
2. **Parallel Processing**: Generates diagrams, code, and structure simultaneously
3. **Consolidation**: Combines results into unified plan
4. **Status Update**: Updates job status in DynamoDB

## Error Handling

- Comprehensive error logging with Winston
- Structured error responses
- Lambda function error handling with retries
- Step Functions error handling and dead letter queues

## Security

- JWT authentication for all protected routes
- Role-based access control (user/admin)
- Input validation with Joi
- Security headers with Helmet
- CORS configuration
- AWS IAM role-based permissions

## Monitoring

- CloudWatch logs for all Lambda functions
- Structured logging with correlation IDs
- DynamoDB and S3 access logging
- Step Functions execution monitoring

## Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details