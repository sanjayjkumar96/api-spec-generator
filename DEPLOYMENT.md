# SpecGen AI - Full Stack Deployment Guide

This guide covers the complete deployment process for both the backend and frontend components of SpecGen AI.

## 🏗️ Architecture Overview

The application consists of:
- **Backend**: AWS Lambda functions with API Gateway, DynamoDB, and Step Functions
- **Frontend**: React application hosted on S3 with CloudFront CDN
- **Infrastructure**: Managed via AWS SAM (Serverless Application Model)

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **SAM CLI** installed
   ```bash
   # Install via pip
   pip install aws-sam-cli
   
   # Or via Homebrew (macOS)
   brew install aws-sam-cli
   ```

3. **Node.js and npm** (version 18 or higher)
   ```bash
   node --version
   npm --version
   ```

4. **AWS Account** with appropriate permissions for:
   - Lambda functions
   - API Gateway
   - DynamoDB
   - S3
   - CloudFront
   - Step Functions
   - IAM roles

## 🚀 Deployment Options

### Option 1: Full Stack Deployment (Recommended)

Deploy both backend and frontend with a single command:

**Linux/macOS:**
```bash
./deploy.sh [stage] [region]
```

**Windows:**
```powershell
.\deploy.ps1 -Stage [stage] -Region [region]
```

**Examples:**
```bash
# Deploy to dev environment in ap-south-1
./deploy.sh dev ap-south-1

# Deploy to staging environment
./deploy.sh staging ap-south-1

# Deploy to production environment
./deploy.sh prod ap-south-1
```

### Option 2: Backend Only Deployment

If you only want to deploy the backend:

```bash
cd packages/backend
npm install
npm run build
sam deploy --config-env dev
```

### Option 3: Frontend Only Deployment

If the backend is already deployed and you only want to update the frontend:

```bash
cd packages/frontend
npm install

# Deploy to specific environment
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod
```

## 🏗️ Infrastructure Components

### Backend Infrastructure

The SAM template creates:

1. **API Gateway**: RESTful API endpoints
2. **Lambda Functions**:
   - `SpecGenApiFunction`: Main API handler
   - `ProcessSimpleJobFunction`: Handles EARS specs and user stories
   - `ProcessComplexJobFunction`: Handles integration plans
   - `ConsolidateComplexJobFunction`: Consolidates complex job results
   - `UpdateJobStatusFunction`: Updates job status in DynamoDB

3. **DynamoDB Tables**:
   - `JobsTable`: Stores job information
   - `UsersTable`: Stores user data
   - `PromptsTable`: Stores prompt templates

4. **S3 Buckets**:
   - `OutputsBucket`: Stores generated content
   - `FrontendBucket`: Hosts frontend application

5. **CloudFront Distribution**: CDN for frontend

6. **Step Functions**: Orchestrates job processing workflow

### Frontend Infrastructure

The frontend deployment includes:

1. **S3 Static Website Hosting**: Hosts React application
2. **CloudFront Distribution**: Global CDN with custom error pages
3. **Environment Configuration**: Stage-specific API endpoints

## 🔧 Configuration

### Environment Variables

The deployment script automatically configures environment variables:

**Backend (.env):**
- `STAGE`: Deployment stage (dev/staging/prod)
- `AWS_REGION`: AWS region
- `JOBS_TABLE`: DynamoDB jobs table name
- `USERS_TABLE`: DynamoDB users table name
- `PROMPTS_TABLE`: DynamoDB prompts table name
- `S3_BUCKET`: S3 outputs bucket name
- `JWT_SECRET`: JWT signing secret

**Frontend (.env.production):**
- `VITE_API_URL`: Backend API endpoint
- `VITE_STAGE`: Deployment stage
- `VITE_REGION`: AWS region
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

### SAM Configuration

The `samconfig.toml` file contains stage-specific configurations:

```toml
[dev.deploy.parameters]
stack_name = "specgen-ai-backend-dev"
parameter_overrides = [
    "Stage=dev",
    "JWTSecret=dev-secret-key"
]

[prod.deploy.parameters]
stack_name = "specgen-ai-backend-prod"
parameter_overrides = [
    "Stage=prod"
]
```

## 📊 Deployment Outputs

After successful deployment, you'll receive:

- **Frontend URL**: CloudFront distribution URL
- **API URL**: API Gateway endpoint
- **S3 Bucket Names**: For outputs and frontend hosting
- **CloudFront Distribution ID**: For cache invalidation

Example output:
```
🎉 SpecGen AI deployed successfully!
Frontend URL: https://d1234567890.cloudfront.net
API URL: https://api123.execute-api.ap-south-1.amazonaws.com/Prod
Stage: dev
```

## 🔄 Development Workflow

### Local Development

1. **Start Backend Locally:**
   ```bash
   cd packages/backend
   npm install
   npm run dev
   ```

2. **Start Frontend Locally:**
   ```bash
   cd packages/frontend
   npm install
   npm run dev
   ```

3. **Access Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Deployment Pipeline

1. **Development**: Deploy frequently to dev environment
   ```bash
   ./deploy.sh dev
   ```

2. **Staging**: Deploy for testing before production
   ```bash
   ./deploy.sh staging
   ```

3. **Production**: Deploy stable releases
   ```bash
   ./deploy.sh prod
   ```

## 🐛 Troubleshooting

### Common Issues

1. **SAM Build Fails**:
   ```bash
   # Clean and rebuild
   sam build --use-container
   ```

2. **Frontend Build Errors**:
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **CloudFront Cache Issues**:
   ```bash
   # Manual cache invalidation
   aws cloudfront create-invalidation \
     --distribution-id D1234567890 \
     --paths "/*"
   ```

4. **Permission Errors**:
   - Ensure AWS credentials have necessary permissions
   - Check IAM policies for Lambda, DynamoDB, S3, and CloudFront

### Logs and Monitoring

- **Lambda Logs**: CloudWatch Logs
- **API Gateway Logs**: Enable in API Gateway console
- **Frontend Errors**: Browser developer tools
- **Deployment Logs**: Terminal output during deployment

## 🔒 Security Considerations

1. **JWT Secrets**: Use strong, unique secrets for each environment
2. **CORS Configuration**: Restrict origins in production
3. **S3 Bucket Policies**: Follow principle of least privilege
4. **Environment Variables**: Never commit secrets to version control

## 📈 Performance Optimization

1. **CloudFront Caching**: Optimized cache policies for static assets
2. **Lambda Cold Starts**: Provisioned concurrency for production
3. **Bundle Optimization**: Code splitting and tree shaking
4. **Gzip Compression**: Enabled for all static assets

## 🔄 Updates and Maintenance

### Updating the Application

1. **Code Changes**: Make changes and test locally
2. **Deploy to Dev**: Test in development environment
3. **Deploy to Staging**: Validate in staging environment  
4. **Deploy to Production**: Release to production

### Database Migrations

DynamoDB schema changes are handled automatically by CloudFormation.

### Rollback Strategy

If issues occur:
1. **Frontend**: Deploy previous version or use CloudFront behaviors
2. **Backend**: Use SAM CLI to rollback stack
3. **Database**: Point-in-time recovery available

## 📞 Support

For deployment issues:
1. Check CloudFormation stack events
2. Review CloudWatch logs
3. Validate AWS permissions
4. Ensure all prerequisites are met

---

**Note**: Always test deployments in development/staging environments before production deployment.