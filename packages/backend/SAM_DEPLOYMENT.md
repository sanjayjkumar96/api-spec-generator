# AWS SAM Deployment Guide

This guide explains how to deploy and manage the SpecGen AI backend using AWS SAM (Serverless Application Model) instead of the Serverless Framework.

## Prerequisites

1. **AWS CLI** - Install and configure with your AWS credentials
   ```bash
   aws configure
   ```

2. **AWS SAM CLI** - Install the SAM CLI
   ```bash
   # Windows (using Chocolatey)
   choco install aws-sam-cli
   
   # macOS (using Homebrew)
   brew install aws-sam-cli
   
   # Or download from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

3. **Node.js 18+** and npm

## Key Differences from Serverless Framework

### Advantages of SAM/CloudFormation:
- **Native AWS Integration**: Direct CloudFormation support with AWS-specific optimizations
- **Better IAM Management**: More granular and secure permission management
- **Enhanced Monitoring**: Built-in CloudWatch integration and X-Ray tracing
- **Cost Optimization**: Better resource lifecycle management
- **Production Ready**: Enterprise-grade features like point-in-time recovery, encryption
- **AWS Console Integration**: Full visibility in AWS CloudFormation console

### Template Structure:
- `template.yaml` - Main SAM template (replaces `serverless.yml`)
- `samconfig.toml` - SAM CLI configuration for different environments
- Enhanced resource definitions with security and monitoring features

## Deployment Commands

### Build and Deploy
```bash
# Build the application
npm run sam:build

# Deploy to development
npm run deploy:dev

# Deploy to staging  
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Quick deploy (uses default config)
npm run deploy
```

### Local Development
```bash
# Start local API Gateway
npm run local

# Run with hot reloading
npm run sam:sync

# Invoke specific Lambda function locally
sam local invoke SpecGenApiFunction -e events/test-event.json
```

### Monitoring and Management
```bash
# View CloudFormation stack
aws cloudformation describe-stacks --stack-name specgen-ai-backend-dev

# View stack outputs
aws cloudformation describe-stacks --stack-name specgen-ai-backend-dev --query 'Stacks[0].Outputs'

# Delete stack
npm run remove
```

## Environment Configuration

### Parameters
The SAM template accepts these parameters:
- `Stage` - Deployment environment (dev/staging/prod)
- `JWTSecret` - JWT signing secret (should be secure in production)
- `BedrockModelId` - AWS Bedrock model identifier

### Environment-Specific Deployments
Each environment has its own configuration in `samconfig.toml`:

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
    # JWTSecret should be provided securely for production
]
```

## Enhanced Features in SAM Template

### Security Enhancements:
- **S3 Bucket Encryption**: Server-side encryption enabled
- **Public Access Block**: Prevents accidental public access
- **IAM Least Privilege**: Function-specific permissions
- **Parameter Store Integration**: Secure parameter management

### Monitoring & Logging:
- **X-Ray Tracing**: Enabled for all Lambda functions
- **CloudWatch Log Groups**: Organized with retention policies
- **Step Functions Logging**: Enhanced workflow monitoring
- **Resource Tagging**: Consistent tagging for cost allocation

### Reliability Features:
- **DynamoDB Point-in-Time Recovery**: Data protection
- **Lambda Retry Logic**: Built-in error handling in Step Functions
- **S3 Lifecycle Policies**: Automatic cleanup of old files
- **Connection Reuse**: Optimized Lambda performance

## Resource Outputs

The stack provides these outputs for integration:
- `ApiGatewayUrl` - API endpoint URL
- `JobsTableName` - DynamoDB table names
- `OutputsBucketName` - S3 bucket name
- `StateMachineArn` - Step Functions ARN

## Migration from Serverless Framework

If migrating from the previous Serverless setup:

1. **Remove Serverless artifacts**:
   ```bash
   # Remove serverless dependencies (optional)
   npm uninstall serverless serverless-offline serverless-webpack
   ```

2. **Deploy with SAM**:
   ```bash
   npm run build
   npm run deploy:dev
   ```

3. **Update environment variables** if needed in your application configuration

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   ```bash
   # Clean build
   rm -rf .aws-sam
   npm run sam:build
   ```

2. **Permission Errors**:
   - Ensure AWS CLI is configured with appropriate permissions
   - Check IAM policies for CloudFormation, Lambda, DynamoDB, S3, Step Functions

3. **Stack Updates**:
   ```bash
   # View changeset before deployment
   sam deploy --no-execute-changeset
   ```

4. **Local Development Issues**:
   ```bash
   # Start with specific port
   sam local start-api --port 3001 --host 0.0.0.0
   ```

## Cost Optimization

The SAM template includes several cost optimization features:
- **Pay-per-request DynamoDB**: No idle costs
- **S3 Lifecycle Rules**: Automatic cleanup after 90 days
- **Optimized Lambda Memory**: Right-sized for each function
- **CloudWatch Log Retention**: 14-day retention to control costs

## Production Considerations

For production deployments:

1. **Secure JWT Secret**:
   ```bash
   # Store in Parameter Store
   aws ssm put-parameter --name "/specgen-ai/jwt-secret" --value "your-secure-secret" --type "SecureString"
   
   # Reference in template
   JWTSecret: !Sub "{{resolve:ssm-secure:/specgen-ai/jwt-secret}}"
   ```

2. **Custom Domain**: Add API Gateway custom domain configuration
3. **WAF Integration**: Add AWS WAF for API protection  
4. **VPC Configuration**: Deploy Lambda functions in VPC if needed
5. **Monitoring**: Set up CloudWatch alarms and dashboards

## Support

For issues or questions:
1. Check AWS SAM documentation: https://docs.aws.amazon.com/serverless-application-model/
2. Review CloudFormation stack events in AWS Console
3. Check CloudWatch logs for function-specific issues