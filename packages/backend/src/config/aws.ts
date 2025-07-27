import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';
import { SFNClient } from '@aws-sdk/client-sfn';

const region = process.env.AWS_REGION || 'us-east-1';

export const bedrockClient = new BedrockRuntimeClient({ region });
export const dynamoClient = new DynamoDBClient({ region });
export const docClient = DynamoDBDocumentClient.from(dynamoClient);
export const s3Client = new S3Client({ region });
export const sesClient = new SESClient({ region });
export const sfnClient = new SFNClient({ region });



export const config = {
  useMockServices: process.env.USE_MOCK_SERVICES === 'true',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  s3BucketName: process.env.S3_BUCKET_NAME || 'specgen-documents',
  dynamoTables: {
    users: process.env.DYNAMO_USERS_TABLE || 'specgen-users',
    documents: process.env.DYNAMO_DOCUMENTS_TABLE || 'specgen-documents',
    prompts: process.env.DYNAMO_PROMPTS_TABLE || 'specgen-prompts'
  },
  stepFunctionArn: process.env.STEP_FUNCTION_ARN || 'arn:aws:states:us-east-1:123456789012:stateMachine:DocumentGeneration',
  sesFromEmail: process.env.SES_FROM_EMAIL || 'noreply@specgen.ai'
};