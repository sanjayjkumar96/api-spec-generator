import { bedrockService } from '../services/bedrockService';
import { dynamoService } from '../services/dynamoService';
import { s3Service } from '../services/s3Service';
import { sesService } from '../services/sesService';

interface DocumentGenerationEvent {
  documentId: string;
  userId: string;
  title: string;
  type: 'EARS' | 'USER_STORY';
  rawContent: string;
}

export const handler = async (event: DocumentGenerationEvent) => {
  try {
    console.log('Starting document generation:', event.documentId);

    // Generate content with Bedrock
    const generatedContent = await bedrockService.generateDocument({
      title: event.title,
      type: event.type,
      rawContent: event.rawContent
    });

    // Save to S3
    const s3Key = await s3Service.saveDocument(event.documentId, generatedContent);

    // Update document status
    await dynamoService.updateDocument(event.documentId, {
      status: 'COMPLETED',
      content: generatedContent,
      s3Key
    });

    // Send notification email
    const user = await dynamoService.getUserById(event.userId);
    if (user) {
      await sesService.sendDocumentCompletionEmail(user.email, event.title, event.documentId);
    }

    console.log('Document generation completed:', event.documentId);
    return { status: 'SUCCESS', documentId: event.documentId };

  } catch (error) {
    console.error('Document generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update document status to failed
    await dynamoService.updateDocument(event.documentId, {
      status: 'FAILED',
      errorMessage
    });

    // Send failure notification
    const user = await dynamoService.getUserById(event.userId);
    if (user) {
      await sesService.sendDocumentFailureEmail(user.email, event.title, errorMessage);
    }

    throw error;
  }
};