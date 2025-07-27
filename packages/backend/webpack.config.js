const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    'api': './src/lambda/handler.ts',
    'generateDocument': './src/lambda/generateDocument.ts',
    'handleError': './src/lambda/handleError.ts'
  },
  output: {
    path: path.resolve(__dirname, '../../dist/lambda'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: ['node_modules']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  externals: {
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-bedrock-runtime': 'commonjs @aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-dynamodb': 'commonjs @aws-sdk/client-dynamodb',
    '@aws-sdk/client-s3': 'commonjs @aws-sdk/client-s3',
    '@aws-sdk/client-ses': 'commonjs @aws-sdk/client-ses',
    '@aws-sdk/client-sfn': 'commonjs @aws-sdk/client-sfn',
    '@aws-sdk/lib-dynamodb': 'commonjs @aws-sdk/lib-dynamodb'
  },
  optimization: {
    minimize: true
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    })
  ],
  stats: {
    colors: true,
    modules: true,
    reasons: true,
    errorDetails: true
  }
};