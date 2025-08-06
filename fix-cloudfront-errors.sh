#!/bin/bash

# Fix for CloudFront Cache and Decode Content Errors
# This script redeploys the backend and frontend with the CORS/encoding fixes

echo "🔧 Fixing CloudFront Cache and Decode Content Errors..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================================${NC}"
}

# Function to check command success
check_command() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $1 completed${NC}"
    fi
}

print_section "Step 1: Building Backend with Updated CORS Configuration"
cd packages/backend

# Build the backend
echo -e "${BLUE}Building backend...${NC}"
npm run build
check_command "Backend build"

print_section "Step 2: Deploying Backend with Fixed CORS Headers"
# Deploy the backend with the updated template
sam deploy --no-confirm-changeset
check_command "Backend deployment"

# Get the stack outputs
STACK_NAME=$(grep "stack_name" samconfig.toml | cut -d'"' -f2 2>/dev/null || echo "specgen-ai")
REGION=$(grep "region" samconfig.toml | cut -d'"' -f2 2>/dev/null || echo "ap-south-1")

echo -e "${BLUE}Getting deployment information...${NC}"
API_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}-dev" --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text)
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}-dev" --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}-dev" --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)
FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}-dev" --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text)

echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo -e "${GREEN}Frontend Bucket: ${FRONTEND_BUCKET}${NC}"
echo -e "${GREEN}CloudFront Distribution: ${CLOUDFRONT_DISTRIBUTION_ID}${NC}"
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"

print_section "Step 3: Building Frontend with Updated API Service"
cd ../frontend

# Update environment variables for the frontend
cat > .env << EOF
VITE_API_ENDPOINT=${API_URL}
VITE_API_URL=${API_URL}
EOF

echo -e "${BLUE}Building frontend with updated API configuration...${NC}"
npm run build
check_command "Frontend build"

print_section "Step 4: Deploying Frontend with Cache Fixes"
# Upload frontend to S3 with proper cache control headers
echo -e "${BLUE}☁️ Uploading frontend to S3...${NC}"

# Upload static assets with long cache (avoiding problematic files)
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ \
    --region $REGION \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json" \
    --exclude "*.map"

# Upload HTML and dynamic files with no-cache headers to prevent cache issues
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ \
    --region $REGION \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-encoding "identity" \
    --include "*.html" \
    --include "service-worker.js" \
    --include "manifest.json"

check_command "Frontend upload"

print_section "Step 5: Invalidating CloudFront Cache"
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "None" ]; then
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

print_section "Deployment Complete - Issues Fixed!"
echo ""
echo -e "${GREEN}🎉 The following issues have been resolved:${NC}"
echo -e "${GREEN}   ✅ Cache.put() network errors - Fixed with no-store cache policy${NC}"
echo -e "${GREEN}   ✅ Decode content errors - Fixed with proper encoding headers${NC}"
echo -e "${GREEN}   ✅ CORS policy conflicts - Resolved CloudFront/API Gateway mismatch${NC}"
echo -e "${GREEN}   ✅ Content encoding issues - Added proper Accept-Encoding headers${NC}"
echo ""
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"
echo ""
echo -e "${BLUE}💡 What was fixed:${NC}"
echo -e "${BLUE}   • Updated CloudFront CORS response headers policy${NC}"
echo -e "${BLUE}   • Added Content-Encoding and Accept-Encoding headers${NC}"
echo -e "${BLUE}   • Changed frontend cache policy to 'no-store'${NC}"
echo -e "${BLUE}   • Fixed circular dependency in CloudFront configuration${NC}"
echo -e "${BLUE}   • Added proper error handling for decode issues${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: It may take 5-10 minutes for CloudFront changes to propagate globally${NC}"

# Return to original directory
cd ../..