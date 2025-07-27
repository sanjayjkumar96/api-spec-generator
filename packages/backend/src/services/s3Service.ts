import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, config } from '../config/aws';

export class S3Service {
  async saveDocument(documentId: string, content: string): Promise<string> {
    if (config.useMockServices) {
      console.log(`Mock S3: Saving document ${documentId}`);
      return `documents/${documentId}.md`;
    }

    const key = `documents/${documentId}.md`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3BucketName,
      Key: key,
      Body: content,
      ContentType: 'text/markdown',
      Metadata: {
        documentId,
        generatedAt: new Date().toISOString()
      }
    }));

    return key;
  }

  async getDocument(s3Key: string): Promise<string> {
    if (config.useMockServices) {
      console.log(`Mock S3: Getting document ${s3Key}`);
      return `# Mock Document Content\n\nThis is mock content for ${s3Key}`;
    }

    const result = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: s3Key
    }));

    if (!result.Body) {
      throw new Error('Document not found');
    }

    return await result.Body.transformToString();
  }

  async getDocumentUrl(s3Key: string): Promise<string> {
    if (config.useMockServices) {
      return `https://mock-s3.amazonaws.com/${config.s3BucketName}/${s3Key}`;
    }

    return `https://${config.s3BucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
  }
}

export const s3Service = new S3Service();