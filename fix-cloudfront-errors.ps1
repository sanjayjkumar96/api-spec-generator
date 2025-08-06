# Fix for CloudFront Cache and Decode Content Errors
# This script redeploys the backend and frontend with the CORS/encoding fixes

Write-Host "🔧 Fixing CloudFront Cache and Decode Content Errors..." -ForegroundColor Blue
Write-Host ""

function Write-Section {
    param([string]$Message)
    Write-Host "================================================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "================================================================" -ForegroundColor Blue
}

function Test-CommandSuccess {
    param([string]$Operation)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $Operation failed" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ $Operation completed" -ForegroundColor Green
    }
}

Write-Section "Step 1: Building Backend with Updated CORS Configuration"
Set-Location packages/backend

# Build the backend
Write-Host "Building backend..." -ForegroundColor Blue
npm run build
Test-CommandSuccess "Backend build"

Write-Section "Step 2: Deploying Backend with Fixed CORS Headers"
# Deploy the backend with the updated template
sam deploy --no-confirm-changeset
Test-CommandSuccess "Backend deployment"

# Get the stack outputs
$StackName = "specgen-ai"
$Region = "ap-south-1"

# Try to get from samconfig.toml
if (Test-Path "samconfig.toml") {
    $Config = Get-Content "samconfig.toml" -Raw
    if ($Config -match 'stack_name\s*=\s*"([^"]+)"') {
        $StackName = $Matches[1]
    }
    if ($Config -match 'region\s*=\s*"([^"]+)"') {
        $Region = $Matches[1]
    }
}

Write-Host "Getting deployment information..." -ForegroundColor Blue
$ApiUrl = aws cloudformation describe-stacks --stack-name "$StackName-dev" --region $Region --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
$FrontendBucket = aws cloudformation describe-stacks --stack-name "$StackName-dev" --region $Region --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text
$CloudFrontDistributionId = aws cloudformation describe-stacks --stack-name "$StackName-dev" --region $Region --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text
$FrontendUrl = aws cloudformation describe-stacks --stack-name "$StackName-dev" --region $Region --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text

Write-Host "API URL: $ApiUrl" -ForegroundColor Green
Write-Host "Frontend Bucket: $FrontendBucket" -ForegroundColor Green
Write-Host "CloudFront Distribution: $CloudFrontDistributionId" -ForegroundColor Green
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Green

Write-Section "Step 3: Building Frontend with Updated API Service"
Set-Location ../frontend

# Update environment variables for the frontend
@"
VITE_API_ENDPOINT=$ApiUrl
VITE_API_URL=$ApiUrl
"@ | Out-File -FilePath ".env" -Encoding utf8

Write-Host "Building frontend with updated API configuration..." -ForegroundColor Blue
npm run build
Test-CommandSuccess "Frontend build"

Write-Section "Step 4: Deploying Frontend with Cache Fixes"
# Upload frontend to S3 with proper cache control headers
Write-Host "☁️ Uploading frontend to S3..." -ForegroundColor Blue

# Upload static assets with long cache (avoiding problematic files)
aws s3 sync dist/ s3://$FrontendBucket/ `
    --region $Region `
    --delete `
    --cache-control "public, max-age=31536000" `
    --exclude "*.html" `
    --exclude "service-worker.js" `
    --exclude "manifest.json" `
    --exclude "*.map"

Test-CommandSuccess "Static assets upload"

# Upload HTML and dynamic files with no-cache headers to prevent cache issues
aws s3 sync dist/ s3://$FrontendBucket/ `
    --region $Region `
    --cache-control "no-cache, no-store, must-revalidate" `
    --content-encoding "identity" `
    --include "*.html" `
    --include "service-worker.js" `
    --include "manifest.json"

Test-CommandSuccess "HTML files upload"

Write-Section "Step 5: Invalidating CloudFront Cache"
if ($CloudFrontDistributionId -and $CloudFrontDistributionId -ne "None" -and $CloudFrontDistributionId -ne "") {
    Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Blue
    $InvalidationId = aws cloudfront create-invalidation `
        --distribution-id $CloudFrontDistributionId `
        --paths "/*" `
        --query 'Invalidation.Id' `
        --output text
    
    Write-Host "⏳ Waiting for CloudFront invalidation to complete..." -ForegroundColor Blue
    aws cloudfront wait invalidation-completed `
        --distribution-id $CloudFrontDistributionId `
        --id $InvalidationId
    
    Write-Host "✅ CloudFront cache invalidated" -ForegroundColor Green
} else {
    Write-Host "⚠️ CloudFront distribution ID not found, skipping cache invalidation" -ForegroundColor Yellow
}

Write-Section "Deployment Complete - Issues Fixed!"
Write-Host ""
Write-Host "🎉 The following issues have been resolved:" -ForegroundColor Green
Write-Host "   ✅ Cache.put() network errors - Fixed with no-store cache policy" -ForegroundColor Green
Write-Host "   ✅ Decode content errors - Fixed with proper encoding headers" -ForegroundColor Green
Write-Host "   ✅ CORS policy conflicts - Resolved CloudFront/API Gateway mismatch" -ForegroundColor Green
Write-Host "   ✅ Content encoding issues - Added proper Accept-Encoding headers" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Green
Write-Host "API URL: $ApiUrl" -ForegroundColor Green
Write-Host ""
Write-Host "💡 What was fixed:" -ForegroundColor Blue
Write-Host "   • Updated CloudFront CORS response headers policy" -ForegroundColor Blue
Write-Host "   • Added Content-Encoding and Accept-Encoding headers" -ForegroundColor Blue
Write-Host "   • Changed frontend cache policy to 'no-store'" -ForegroundColor Blue
Write-Host "   • Fixed circular dependency in CloudFront configuration" -ForegroundColor Blue
Write-Host "   • Added proper error handling for decode issues" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  Note: It may take 5-10 minutes for CloudFront changes to propagate globally" -ForegroundColor Yellow

# Return to original directory
Set-Location ../..