# SpecGen AI - Monorepo Architecture

A collaborative platform for generating technical documentation and managing AI prompts, built with React PWA frontend and Node.js TypeScript Express backend.

## 🏗️ Architecture

```
├── packages/
│   ├── frontend/          # React PWA with Vite
│   └── backend/           # Node.js TypeScript Express API
├── infrastructure/        # CloudFormation templates
├── .github/workflows/     # CI/CD pipelines
└── deployment/           # Deployment scripts
```

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

This starts both frontend (http://localhost:5173) and backend (http://localhost:3001) concurrently.

**Test Credentials**: `test@example.com` / `password`

### Production Deployment
```bash
# Deploy to AWS
./deployment/deploy.sh prod us-east-1
```

## ✨ Features

### Document Generation
- Generate EARS specifications and user stories
- Async processing with real-time status tracking
- AWS Bedrock integration with Claude 3 Sonnet
- Email notifications on completion

### Prompt Library
- Curated collection of AI prompts
- Category-based filtering and search
- One-click copy to clipboard
- Community contributions

### Authentication
- JWT-based authentication
- Role-based access (Analyst/Developer)
- Persistent login state

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **PWA** capabilities with service worker
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Express** with TypeScript
- **AWS SDK v3** for cloud services
- **JWT** authentication
- **Zod** for validation
- **bcrypt** for password hashing

### AWS Services
- **Lambda** + **API Gateway** for serverless API
- **DynamoDB** for data storage
- **S3** for document storage
- **Bedrock** for AI document generation
- **SES** for email notifications
- **Step Functions** for workflow orchestration

## 🔧 Configuration

### Environment Variables

**Development (Mock Services)**:
```env
USE_MOCK_SERVICES=true
JWT_SECRET=dev-secret-key
```

**Production (AWS Services)**:
```env
USE_MOCK_SERVICES=false
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
S3_BUCKET_NAME=specgen-documents
# ... other AWS configurations
```

## 📋 API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/documents` - List user documents
- `POST /api/documents` - Generate new document
- `GET /api/documents/:id` - Get specific document
- `GET /api/prompts` - Browse prompt library
- `POST /api/prompts` - Add new prompt

## 🚀 Deployment

### GitHub Actions Pipeline
- **Test**: Runs on all PRs
- **Deploy Infrastructure**: CloudFormation stack deployment
- **Build & Deploy**: Application code deployment

### Manual Deployment
```bash
# Development
./deployment/deploy.sh dev

# Production
./deployment/deploy.sh prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Development

### Project Structure
```
packages/backend/src/
├── config/          # AWS configuration
├── services/        # Business logic layer
├── routes/          # Express routes
├── middleware/      # Auth middleware
├── lambda/          # Lambda handlers
├── types/           # TypeScript interfaces
└── utils/           # Utility functions

packages/frontend/src/
├── components/      # Reusable components
├── pages/           # Route components
├── store/           # Zustand stores
├── types/           # TypeScript interfaces
└── utils/           # Utility functions
```

### Available Scripts
```bash
npm run dev          # Start development servers
npm run build        # Build both packages
npm run test         # Run tests
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
```

## 🔒 Security

- IAM roles with least privilege
- JWT token authentication
- Input validation with Zod
- CORS configuration
- Environment variable encryption

## 📊 Monitoring

- CloudWatch Logs for Lambda functions
- API Gateway metrics
- DynamoDB performance metrics
- Real-time error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Review CloudWatch logs
3. Open a GitHub issue

---

**Next Steps for Production:**
1. Set up custom domain with Route 53
2. Configure CloudFront CDN
3. Enable AWS WAF for security
4. Set up monitoring dashboards
5. Implement backup strategies