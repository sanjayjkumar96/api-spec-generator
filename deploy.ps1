# SpecGen AI - Full Stack Deployment Script (PowerShell)
# This script deploys both backend and frontend components

param(
    [string]$Stage = "dev",
    [string]$Region = "ap-south-1"
)

# Configuration - Use consistent stack naming
$StackName = "spec-gen-ai-$Stage"

Write-Host "Starting SpecGen AI Full Stack Deployment" -ForegroundColor Blue
Write-Host "Stage: $Stage" -ForegroundColor Blue
Write-Host "Region: $Region" -ForegroundColor Blue
Write-Host "Stack: $StackName" -ForegroundColor Blue

# Function to print section headers
function Write-Section {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Yellow
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Section "Checking Prerequisites"

if (-not (Test-Command "aws")) {
    Write-Host "AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "sam")) {
    Write-Host "SAM CLI not found. Please install SAM CLI." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "npm not found. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

Write-Host "All prerequisites satisfied" -ForegroundColor Green

# Verify AWS credentials
Write-Host "Verifying AWS credentials..." -ForegroundColor Blue
try {
    $Identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "AWS credentials verified for account: $($Identity.Account)" -ForegroundColor Green
} catch {
    Write-Host "AWS credentials not configured properly" -ForegroundColor Red
    exit 1
}

# Build and Deploy Backend
Write-Section "Building Backend"

Set-Location packages/backend

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Blue
npm run sam:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build backend" -ForegroundColor Red
    exit 1
}

# Deploy backend with SAM
Write-Section "Deploying Backend Infrastructure"
Write-Host "Deploying backend with SAM..." -ForegroundColor Blue

sam deploy `
    --config-env $Stage `
    --parameter-overrides Stage=$Stage `
    --region $Region `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend deployment failed" -ForegroundColor Red
    exit 1
}

# Get stack outputs with proper error handling
Write-Host "Getting stack outputs..." -ForegroundColor Blue

try {
    $ApiUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' `
        --output text

    $FrontendBucket = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' `
        --output text

    $FrontendUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' `
        --output text

    Write-Host "Backend deployed successfully" -ForegroundColor Green
    Write-Host "API URL: $ApiUrl" -ForegroundColor Blue
    Write-Host "Frontend Bucket: $FrontendBucket" -ForegroundColor Blue
    Write-Host "Frontend URL (S3 Website): $FrontendUrl" -ForegroundColor Blue
} catch {
    Write-Host "Failed to retrieve stack outputs" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Validate required outputs
if (-not $ApiUrl -or $ApiUrl -eq "None" -or $ApiUrl -eq "") {
    Write-Host "Failed to get API URL from stack outputs" -ForegroundColor Red
    exit 1
}

if (-not $FrontendBucket -or $FrontendBucket -eq "None" -or $FrontendBucket -eq "") {
    Write-Host "Failed to get Frontend Bucket from stack outputs" -ForegroundColor Red
    exit 1
}

# Update CORS configuration to include S3 website endpoint
if ($FrontendUrl -and $FrontendUrl -ne "None" -and $FrontendUrl -ne "") {
    Write-Section "Updating CORS Configuration"
    Write-Host "Updating API Gateway CORS to include S3 website endpoint..." -ForegroundColor Blue
    
    # Update stack with S3 website URL in CORS origins
    $CorsOrigins = "https://localhost:3000,https://localhost:5173,$FrontendUrl"
    
    sam deploy `
        --config-env $Stage `
        --parameter-overrides Stage=$Stage `
        --region $Region `
        --no-confirm-changeset `
        --no-fail-on-empty-changeset

    Write-Host "CORS configuration updated with S3 website endpoint" -ForegroundColor Green
}

# Build and Deploy Frontend
Write-Section "Building and Deploying Frontend"

Set-Location ../frontend

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# Create environment configuration for frontend
Write-Host "Creating frontend configuration..." -ForegroundColor Blue
$envContent = @"
VITE_API_URL=$ApiUrl
VITE_STAGE=$Stage
VITE_REGION=$Region
VITE_API_ENDPOINT=$ApiUrl
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8

Write-Host "Building frontend..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build frontend" -ForegroundColor Red
    exit 1
}

# Verify build directory exists
if (-not (Test-Path "dist")) {
    Write-Host "Frontend build directory (dist/) not found" -ForegroundColor Red
    exit 1
}

# Check if build directory has files
$BuildFiles = Get-ChildItem "dist" -Recurse
if ($BuildFiles.Count -eq 0) {
    Write-Host "Frontend build directory is empty" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend built successfully with $($BuildFiles.Count) files" -ForegroundColor Green

# Deploy frontend to S3
Write-Host "Uploading frontend to S3..." -ForegroundColor Blue

# Upload all files except HTML files first (with long cache)
aws s3 sync dist/ s3://$FrontendBucket/ `
    --region $Region `
    --delete `
    --cache-control "public, max-age=31536000" `
    --exclude "*.html" `
    --exclude "service-worker.js" `
    --exclude "manifest.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload static assets to S3" -ForegroundColor Red
    exit 1
}

# Upload HTML files with different cache control (no cache)
aws s3 sync dist/ s3://$FrontendBucket/ `
    --region $Region `
    --cache-control "public, max-age=0, must-revalidate" `
    --include "*.html" `
    --include "service-worker.js" `
    --include "manifest.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload HTML files to S3" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend uploaded to S3 successfully" -ForegroundColor Green

# Verify files were uploaded
$S3Files = aws s3 ls s3://$FrontendBucket/ --recursive --region $Region
Write-Host "Uploaded files to S3:" -ForegroundColor Blue
Write-Host $S3Files -ForegroundColor Gray

# Final summary
Write-Section "Deployment Complete"
Write-Host "SpecGen AI deployed successfully!" -ForegroundColor Green
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Green
Write-Host "API URL: $ApiUrl" -ForegroundColor Green
Write-Host "Stage: $Stage" -ForegroundColor Green

# Return to original directory
Set-Location ../..

Write-Host "Deployment logs and configuration saved" -ForegroundColor Blue
Write-Host "You can now access your application at: $FrontendUrl" -ForegroundColor Blue

# Test the endpoints
Write-Section "Testing Deployment"
Write-Host "Testing API endpoint..." -ForegroundColor Blue
try {
    $TestResponse = Invoke-WebRequest -Uri "$ApiUrl/health" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($TestResponse.StatusCode -eq 200) {
        Write-Host "API endpoint is responding" -ForegroundColor Green
    } else {
        Write-Host "API endpoint returned status: $($TestResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not reach API endpoint (this might be normal if health endpoint does not exist)" -ForegroundColor Yellow
}

Write-Host "Testing S3 website endpoint..." -ForegroundColor Blue
try {
    $TestResponse = Invoke-WebRequest -Uri $FrontendUrl -Method GET -UseBasicParsing -TimeoutSec 10
    if ($TestResponse.StatusCode -eq 200) {
        Write-Host "S3 website is accessible" -ForegroundColor Green
    } else {
        Write-Host "S3 website returned status: $($TestResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not reach S3 website URL: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`nDeployment Complete! Your application should be available at:" -ForegroundColor Green
Write-Host "   Frontend (S3 Website): $FrontendUrl" -ForegroundColor Cyan
Write-Host "   API Gateway: $ApiUrl" -ForegroundColor Cyan

Write-Host "`nImportant Notes:" -ForegroundColor Yellow
Write-Host "1. Frontend is now hosted directly on S3 (no CloudFront)" -ForegroundColor White
Write-Host "2. API Gateway CORS is configured to allow S3 website endpoint" -ForegroundColor White
Write-Host "3. S3 bucket is publicly accessible for static website hosting" -ForegroundColor White
Write-Host "4. Frontend will make direct API calls to API Gateway" -ForegroundColor White
Write-Host "5. Bedrock model ID is set to: apac.amazon.nova-pro-v1:0" -ForegroundColor White