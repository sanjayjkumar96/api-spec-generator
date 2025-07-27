const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const LAMBDA_DIR = path.join(__dirname, 'dist', 'lambda');
const PACKAGE_NAME = 'lambda-deployment.zip';

async function packageLambda() {
  console.log('🚀 Starting Lambda packaging process...');
  
  // Check if lambda directory exists
  if (!fs.existsSync(LAMBDA_DIR)) {
    console.error('❌ Lambda dist directory not found. Run build:lambda first.');
    process.exit(1);
  }

  // Check for required files
  const requiredFiles = ['api.js', 'generateDocument.js', 'handleError.js'];
  const reportFile = path.join(LAMBDA_DIR, 'bundle-report.html');
  const statsFile = path.join(LAMBDA_DIR, 'bundle-stats.json');

  console.log('✅ Found required files:');
  
  for (const file of requiredFiles) {
    const filePath = path.join(LAMBDA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ${file} not found in lambda directory`);
      process.exit(1);
    }
    console.log(`   - ${file} (${getFileSize(filePath)})`);
  }
  
  if (fs.existsSync(reportFile)) {
    console.log(`   - bundle-report.html (${getFileSize(reportFile)})`);
  }
  
  if (fs.existsSync(statsFile)) {
    console.log(`   - bundle-stats.json (${getFileSize(statsFile)})`);
  }

  // Create deployment package
  const zipPath = path.join(LAMBDA_DIR, PACKAGE_NAME);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const finalSize = getFileSize(zipPath);
      console.log(`✅ Lambda package created: ${PACKAGE_NAME} (${finalSize})`);
      
      // Generate deployment summary
      generateDeploymentSummary(zipPath);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ Packaging failed:', err);
      reject(err);
    });

    archive.pipe(output);

    // Add Lambda functions
    for (const file of requiredFiles) {
      const filePath = path.join(LAMBDA_DIR, file);
      archive.file(filePath, { name: file });
    }

    // Add bundle report if exists
    if (fs.existsSync(reportFile)) {
      archive.file(reportFile, { name: 'bundle-report.html' });
    }

    // Add stats file if exists
    if (fs.existsSync(statsFile)) {
      archive.file(statsFile, { name: 'bundle-stats.json' });
    }

    archive.finalize();
  });
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const bytes = stats.size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function generateDeploymentSummary(zipPath) {
  const summary = {
    timestamp: new Date().toISOString(),
    packageSize: getFileSize(zipPath),
    files: [],
    deployment: {
      ready: true,
      s3Upload: `aws s3 cp ${zipPath} s3://your-bucket/lambda-deployment.zip`,
      lambdaUpdate: 'aws lambda update-function-code --function-name your-function --s3-bucket your-bucket --s3-key lambda-deployment.zip'
    }
  };

  // List all files in the lambda directory
  const files = fs.readdirSync(LAMBDA_DIR);
  files.forEach(file => {
    const filePath = path.join(LAMBDA_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      summary.files.push({
        name: file,
        size: getFileSize(filePath)
      });
    }
  });

  const summaryPath = path.join(LAMBDA_DIR, 'deployment-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n📊 Deployment Summary:');
  console.log(`   Package: ${summary.packageSize}`);
  console.log(`   Files: ${summary.files.length}`);
  console.log(`   Report: ${summaryPath}`);
  
  if (fs.existsSync(path.join(LAMBDA_DIR, 'bundle-report.html'))) {
    console.log(`   Bundle Analysis: file://${path.join(LAMBDA_DIR, 'bundle-report.html')}`);
  }
}

// Run packaging
packageLambda().catch(console.error);