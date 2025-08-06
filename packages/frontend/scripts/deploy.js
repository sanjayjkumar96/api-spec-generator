#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stage = process.argv[2] || 'dev';
const region = process.env.AWS_REGION || 'ap-south-1';
const stackName = 'specgen-ai-backend';

console.log(`🚀 Deploying frontend to ${stage} environment`);

// Function to execute AWS CLI commands
function executeAWS(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error executing: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Get stack outputs
console.log('📋 Getting stack outputs...');
const frontendBucket = executeAWS(`aws cloudformation describe-stacks --stack-name "${stackName}-${stage}" --region ${region} --query 'Stacks[0].Outputs[?OutputKey==\`FrontendBucketName\`].OutputValue' --output text`);

const cloudFrontDistributionId = executeAWS(`aws cloudformation describe-stacks --stack-name "${stackName}-${stage}" --region ${region} --query 'Stacks[0].Outputs[?OutputKey==\`CloudFrontDistributionId\`].OutputValue' --output text`);

if (!frontendBucket || frontendBucket === 'None') {
  console.error('❌ Frontend bucket not found. Make sure the backend is deployed first.');
  process.exit(1);
}

console.log(`Frontend Bucket: ${frontendBucket}`);
console.log(`CloudFront Distribution: ${cloudFrontDistributionId}`);

// Upload files to S3
console.log('☁️ Uploading to S3...');

// Upload static assets with long cache
executeAWS(`aws s3 sync dist/ s3://${frontendBucket}/ --region ${region} --delete --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "service-worker.js" --exclude "manifest.json"`);

// Upload HTML and dynamic files with short cache
executeAWS(`aws s3 sync dist/ s3://${frontendBucket}/ --region ${region} --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "service-worker.js" --include "manifest.json"`);

// Invalidate CloudFront cache
if (cloudFrontDistributionId && cloudFrontDistributionId !== 'None') {
  console.log('🔄 Invalidating CloudFront cache...');
  const invalidationId = executeAWS(`aws cloudfront create-invalidation --distribution-id ${cloudFrontDistributionId} --paths "/*" --query 'Invalidation.Id' --output text`);
  
  console.log('⏳ Waiting for invalidation to complete...');
  executeAWS(`aws cloudfront wait invalidation-completed --distribution-id ${cloudFrontDistributionId} --id ${invalidationId}`);
  
  console.log('✅ CloudFront cache invalidated');
} else {
  console.log('⚠️ No CloudFront distribution found, skipping cache invalidation');
}

console.log('🎉 Frontend deployment completed successfully!');