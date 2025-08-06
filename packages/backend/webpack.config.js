const path = require('path');

module.exports = {
  entry: {
    index: './src/index.ts',
    'lambda/processSimpleJob': './src/lambda/processSimpleJob.ts',
    'lambda/processComplexJob': './src/lambda/processComplexJob.ts',
    'lambda/consolidateComplexJob': './src/lambda/consolidateComplexJob.ts',
    'lambda/updateJobStatus': './src/lambda/updateJobStatus.ts'
  },
  target: 'node',
  mode: 'production',
  externals: {
    // Only externalize AWS SDK packages as they're available in Lambda runtime
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-bedrock-runtime': '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb', 
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    '@aws-sdk/client-sfn': '@aws-sdk/client-sfn',
    '@aws-sdk/lib-dynamodb': '@aws-sdk/lib-dynamodb'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            // Prevent TypeScript from emitting separate files
            compilerOptions: {
              declaration: false,
              declarationMap: false,
              sourceMap: false
            }
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    // Don't resolve modules from node_modules as externals unless explicitly listed
    preferRelative: true
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  optimization: {
    minimize: false,
    // Each Lambda function must be completely self-contained
    splitChunks: false
  },
  plugins: [],
  stats: {
    modules: false,
    chunks: false,
    colors: true,
    timings: true,
    assets: true,
    errors: true,
    warnings: true
  }
};