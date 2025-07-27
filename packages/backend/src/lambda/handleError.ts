import { dynamoService } from '../services/dynamoService';
import { sesService } from '../services/sesService';

interface ErrorHandlingEvent {
  documentId: string;
  userId: string;
  title: string;
  error: {
    Error: string;
    Cause: string;
  };
}

export const handler = async (event: ErrorHandlingEvent) => {
  try {
    console.log('Handling document generation error:', event.documentId);

    const errorMessage = event.error.Error || 'Unknown error occurred';
    
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

    console.log('Error handling completed for document:', event.documentId);
    return { status: 'ERROR_HANDLED', documentId: event.documentId };

  } catch (error) {
    console.error('Error handling failed:', error);
    throw error;
  }
};