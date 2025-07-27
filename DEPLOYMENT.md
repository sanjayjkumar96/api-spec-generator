# SpecGen AI - Deployment Guide

## Architecture Overview

The application uses a serverless architecture on AWS with the following components:

- **Frontend**: React PWA hosted on S3 + CloudFront
- **Backend**: Lambda functions behind API Gateway
- **Database**: DynamoDB tables for users, documents, and prompts
- **Storage**: S3 bucket for generated documents
- **AI**: Amazon Bedrock (Claude 3 Sonnet)
- **Email**: Amazon SES for notifications
- **Orchestration**: Step Functions for document generation workflow

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Node.js 18+ installed
3. GitHub repository with secrets configured

## GitHub Secrets Required

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Deployment Environments

### Development (dev)
- Triggered on push to `develop` branch
- Uses dev-prefixed resources
- Mock services can be enabled for testing

### Production (prod)
- Triggered on push to `main` branch
- Uses prod-prefixed resources
- All AWS services enabled

## Manual Deployment

```bash
# Deploy to development
./deployment/deploy.sh dev us-east-1

# Deploy to production
./deployment/deploy.sh prod us-east-1
```

## GitHub Actions Pipeline

The pipeline consists of three jobs:

1. **Test**: Runs unit tests
2. **Deploy Infrastructure**: Creates AWS resources via CloudFormation
3. **Build and Deploy**: Builds and deploys application code

## Infrastructure Components

### Main Stack (`infrastructure/main.yaml`)
- DynamoDB tables with GSIs
- S3 bucket for documents
- IAM roles and policies
- Step Functions state machine

### Lambda Stack (`infrastructure/lambda.yaml`)
- API Gateway with CORS
- Lambda functions for each endpoint
- Integration with main stack resources

## Environment Variables

### Backend Lambda Functions
```
NODE_ENV=production
USE_MOCK_SERVICES=false
AWS_REGION=us-east-1
```

### Frontend Build
```
VITE_API_URL=https://api.specgen.ai
```

## Post-Deployment Setup

1. **Domain Configuration**: Set up custom domain for API Gateway
2. **SES Verification**: Verify sender email address in SES
3. **Bedrock Access**: Request access to Claude 3 Sonnet model
4. **CloudFront**: Set up CDN for frontend (optional)

## Monitoring and Logging

- CloudWatch Logs for Lambda functions
- CloudWatch Metrics for API Gateway
- X-Ray tracing for distributed tracing
- DynamoDB metrics for database performance

## Cost Optimization

- DynamoDB on-demand pricing
- Lambda pay-per-request
- S3 Intelligent Tiering
- CloudWatch log retention policies

## Security

- IAM roles with least privilege
- API Gateway with CORS
- S3 bucket with public access blocked
- DynamoDB encryption at rest
- Lambda environment variables encryption

## Rollback Strategy

```bash
# Rollback infrastructure
aws cloudformation cancel-update-stack --stack-name specgen-prod

# Rollback to previous Lambda version
aws lambda update-alias --function-name specgen-prod-auth --name LIVE --function-version $PREVIOUS_VERSION
```

## Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase timeout in CloudFormation template
2. **DynamoDB throttling**: Switch to provisioned capacity
3. **Bedrock access denied**: Request model access in AWS console
4. **CORS errors**: Check API Gateway CORS configuration

### Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/dev-specgen-auth --follow

# View API Gateway logs
aws logs tail API-Gateway-Execution-Logs_${API_ID}/dev --follow
```

## Next Steps

1. Set up custom domain with Route 53
2. Implement CloudFront for global CDN
3. Add WAF for security
4. Set up monitoring dashboards
5. Implement backup strategies