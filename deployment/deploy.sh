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

# Build and package Lambda function
echo "Building and packaging Lambda function..."
cd packages/backend
npm run package:lambda
cd ../..

# Upload to S3
LAMBDA_BUCKET="$ENVIRONMENT-specgen-lambda-$(date +%s)"
aws s3 mb s3://$LAMBDA_BUCKET --region $AWS_REGION
aws s3 cp dist/lambda/lambda-deployment.zip s3://$LAMBDA_BUCKET/lambda-deployment.zip

# Deploy Lambda functions
echo "Deploying Lambda functions..."
DEPLOYMENT_ID=$(date +%s)
aws cloudformation deploy \
  --template-file infrastructure/api-single.yaml \
  --stack-name specgen-api-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    LambdaExecutionRoleArn=$LAMBDA_ROLE_ARN \
    LambdaCodeBucket=$LAMBDA_BUCKET \
    LambdaCodeBucket=$LAMBDA_BUCKET \
    DeploymentId=$DEPLOYMENT_ID \
  --capabilities CAPABILITY_IAM \
  --region $AWS_REGION \
  --force-upload

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name specgen-api-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# Build and deploy frontend
echo "Building frontend..."
cd packages/frontend
VITE_API_URL=$API_URL npm run build
cd ../..

echo "Deploying frontend to S3..."
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name specgen-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync dist/frontend/ s3://$FRONTEND_BUCKET --delete

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name specgen-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text)

echo "Deployment completed!"
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Test API: curl -X OPTIONS $API_URL/auth/login -v"