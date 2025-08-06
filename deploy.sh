#!/bin/bash

# SpecGen AI - Full Stack Deployment Script
# This script deploys both backend and frontend components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-dev}
REGION=${2:-ap-south-1}
STACK_NAME="specgen-ai-backend"

echo -e "${BLUE}🚀 Starting SpecGen AI Full Stack Deployment${NC}"
echo -e "${BLUE}Stage: ${STAGE}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Stack: ${STACK_NAME}${NC}"

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists aws; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi

if ! command_exists sam; then
    echo -e "${RED}❌ SAM CLI not found. Please install SAM CLI.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found. Please install Node.js and npm.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"

# Build and Deploy Backend
print_section "Building Backend"

cd packages/backend

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm install

# Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
npm run build

# Deploy backend with SAM
print_section "Deploying Backend Infrastructure"
echo -e "${BLUE}🚀 Deploying backend with SAM...${NC}"

sam deploy \
    --config-env $STAGE \
    --parameter-overrides Stage=$STAGE \
    --region $REGION \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get stack outputs
echo -e "${BLUE}📋 Getting stack outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "spec-gen-ai-${STAGE}" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "spec-gen-ai-${STAGE}" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text)

CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "spec-gen-ai-${STAGE}" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name "spec-gen-ai-${STAGE}" \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Backend deployed successfully${NC}"
echo -e "${BLUE}API URL: ${API_URL}${NC}"
echo -e "${BLUE}Frontend Bucket: ${FRONTEND_BUCKET}${NC}"

# Build and Deploy Frontend
print_section "Building and Deploying Frontend"

cd ../frontend

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
npm install

# Create environment configuration for frontend
echo -e "${BLUE}⚙️ Creating frontend configuration...${NC}"
cat > .env.production << EOF
VITE_API_URL=${API_URL}
VITE_STAGE=${STAGE}
VITE_REGION=${REGION}
EOF

echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build

# Deploy frontend to S3
echo -e "${BLUE}☁️ Uploading frontend to S3...${NC}"
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ \
    --region $REGION \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json"

# Upload HTML files with different cache control
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ \
    --region $REGION \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js" \
    --include "manifest.json"

# Invalidate CloudFront cache
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${BLUE}🔄 Invalidating CloudFront cache...${NC}"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo -e "${BLUE}⏳ Waiting for CloudFront invalidation to complete...${NC}"
    aws cloudfront wait invalidation-completed \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --id $INVALIDATION_ID
    
    echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
else
    echo -e "${YELLOW}⚠️ CloudFront distribution ID not found, skipping cache invalidation${NC}"
fi

# Final summary
print_section "Deployment Complete"
echo -e "${GREEN}🎉 SpecGen AI deployed successfully!${NC}"
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo -e "${GREEN}Stage: ${STAGE}${NC}"

# Return to original directory
cd ../..

echo -e "${BLUE}📝 Deployment logs and configuration saved${NC}"
echo -e "${BLUE}You can now access your application at: ${FRONTEND_URL}${NC}"