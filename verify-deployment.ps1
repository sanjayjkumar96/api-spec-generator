# SpecGen AI - Deployment Verification Script
# This script helps debug deployment issues

param(
    [string]$Stage = "dev",
    [string]$Region = "ap-south-1"
)

$StackName = "spec-gen-ai-$Stage"

Write-Host "🔍 SpecGen AI Deployment Verification" -ForegroundColor Blue
Write-Host "Stage: $Stage" -ForegroundColor Blue
Write-Host "Region: $Region" -ForegroundColor Blue
Write-Host "Stack: $StackName" -ForegroundColor Blue

# Function to print section headers
function Write-Section {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Yellow
}

Write-Section "Checking Stack Status"

try {
    $StackStatus = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query 'Stacks[0].StackStatus' `
        --output text

    Write-Host "Stack Status: $StackStatus" -ForegroundColor Blue
    
    if ($StackStatus -ne "CREATE_COMPLETE" -and $StackStatus -ne "UPDATE_COMPLETE") {
        Write-Host "⚠️ Stack is in status: $StackStatus" -ForegroundColor Yellow
        Write-Host "This might indicate a deployment issue" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Stack $StackName not found in region $Region" -ForegroundColor Red
    Write-Host "Please run the deployment script first" -ForegroundColor Red
    exit 1
}

Write-Section "Retrieving Stack Outputs"

try {
    $Outputs = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query 'Stacks[0].Outputs' `
        --output json | ConvertFrom-Json

    Write-Host "Stack Outputs:" -ForegroundColor Blue
    foreach ($output in $Outputs) {
        Write-Host "  $($output.OutputKey): $($output.OutputValue)" -ForegroundColor Gray
    }

    # Extract specific outputs
    $ApiUrl = ($Outputs | Where-Object { $_.OutputKey -eq "ApiGatewayUrl" }).OutputValue
    $FrontendBucket = ($Outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
    $FrontendUrl = ($Outputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue
    $CloudFrontDistributionId = ($Outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue

} catch {
    Write-Host "❌ Failed to retrieve stack outputs" -ForegroundColor Red
    exit 1
}

Write-Section "Checking Frontend S3 Bucket"

if ($FrontendBucket) {
    Write-Host "Checking S3 bucket: $FrontendBucket" -ForegroundColor Blue
    
    try {
        $S3Objects = aws s3 ls s3://$FrontendBucket/ --recursive --region $Region
        
        if ($S3Objects) {
            $FileCount = ($S3Objects -split "`n").Count - 1
            Write-Host "✅ Found $FileCount files in S3 bucket" -ForegroundColor Green
            Write-Host "Files:" -ForegroundColor Blue
            Write-Host $S3Objects -ForegroundColor Gray
        } else {
            Write-Host "❌ S3 bucket is empty!" -ForegroundColor Red
            Write-Host "This explains why the frontend is not accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Failed to list S3 bucket contents" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Frontend bucket name not found in stack outputs" -ForegroundColor Red
}

Write-Section "Checking CloudFront Distribution"

if ($CloudFrontDistributionId) {
    Write-Host "Checking CloudFront distribution: $CloudFrontDistributionId" -ForegroundColor Blue
    
    try {
        $DistributionStatus = aws cloudfront get-distribution `
            --id $CloudFrontDistributionId `
            --query 'Distribution.Status' `
            --output text
        
        Write-Host "Distribution Status: $DistributionStatus" -ForegroundColor Blue
        
        if ($DistributionStatus -ne "Deployed") {
            Write-Host "⚠️ CloudFront distribution is not yet deployed" -ForegroundColor Yellow
            Write-Host "This might take a few minutes to complete" -ForegroundColor Yellow
        } else {
            Write-Host "✅ CloudFront distribution is deployed" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Failed to check CloudFront distribution" -ForegroundColor Red
    }
} else {
    Write-Host "❌ CloudFront distribution ID not found in stack outputs" -ForegroundColor Red
}

Write-Section "Testing Endpoints"

if ($ApiUrl) {
    Write-Host "Testing API endpoint: $ApiUrl" -ForegroundColor Blue
    
    try {
        $Response = Invoke-WebRequest -Uri "$ApiUrl/health" -Method GET -UseBasicParsing -TimeoutSec 10
        if ($Response.StatusCode -eq 200) {
            Write-Host "✅ API health check successful" -ForegroundColor Green
            $ResponseBody = $Response.Content | ConvertFrom-Json
            Write-Host "Response: $($ResponseBody | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ API health check failed" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($FrontendUrl) {
    Write-Host "Testing frontend URL: $FrontendUrl" -ForegroundColor Blue
    
    try {
        $Response = Invoke-WebRequest -Uri $FrontendUrl -Method GET -UseBasicParsing -TimeoutSec 10
        if ($Response.StatusCode -eq 200) {
            Write-Host "✅ Frontend accessible" -ForegroundColor Green
            Write-Host "Content-Type: $($Response.Headers.'Content-Type')" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Frontend not accessible" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Section "Recommendations"

if (-not $S3Objects -and $FrontendBucket) {
    Write-Host "🔧 Frontend bucket is empty. Try these steps:" -ForegroundColor Yellow
    Write-Host "1. Run the deployment script again: .\deploy.ps1" -ForegroundColor White
    Write-Host "2. Check if frontend build succeeded" -ForegroundColor White
    Write-Host "3. Verify AWS credentials have S3 permissions" -ForegroundColor White
}

if ($ApiUrl -and $FrontendUrl) {
    Write-Host "📋 Summary:" -ForegroundColor Green
    Write-Host "  Frontend: $FrontendUrl" -ForegroundColor Cyan
    Write-Host "  API: $ApiUrl" -ForegroundColor Cyan
} else {
    Write-Host "❌ Missing critical URLs - deployment may have failed" -ForegroundColor Red
}

Write-Host "`n🔍 Verification complete" -ForegroundColor Blue