#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}

echo "Deploying SpecGen AI to $ENVIRONMENT environment in $AWS_REGION"

# Deploy main infrastructure
echo "Deploying main infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/main.yaml \
  --stack-name specgen-$ENVIRONMENT \
  --parameter-overrides Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $AWS_REGION \
  --no-fail-on-empty-changeset

# Get outputs from main stack
LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
  --stack-name specgen-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
  --output text)

# Build backend
echo "Building backend..."
cd packages/backend
npm run build
cd ../..

# Deploy Lambda functions
echo "Deploying Lambda functions..."
aws cloudformation deploy \
  --template-file infrastructure/lambda.yaml \
  --stack-name specgen-lambda-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    LambdaExecutionRoleArn=$LAMBDA_ROLE_ARN \
  --capabilities CAPABILITY_IAM \
  --region $AWS_REGION \
  --no-fail-on-empty-changeset

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name specgen-lambda-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# Build and deploy frontend
echo "Building frontend..."
cd packages/frontend
VITE_API_URL=$API_URL npm run build

echo "Deploying frontend to S3..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name specgen-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
  --output text)

# Create frontend bucket if it doesn't exist
aws s3 mb s3://$ENVIRONMENT-specgen-frontend-$(date +%s) --region $AWS_REGION || true
aws s3 sync dist/ s3://$ENVIRONMENT-specgen-frontend-$(date +%s) --delete

cd ../..

echo "Deployment completed!"
echo "API URL: $API_URL"
echo "Frontend will be available after CloudFront setup"