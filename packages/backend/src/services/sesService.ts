import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient, config } from '../config/aws';

export class SESService {
  async sendDocumentCompletionEmail(userEmail: string, documentTitle: string, documentId: string): Promise<void> {
    if (config.useMockServices) {
      console.log(`Mock SES: Sending email to ${userEmail} for document ${documentTitle}`);
      return;
    }

    const subject = `Document Ready: ${documentTitle}`;
    const htmlBody = `
      <html>
        <body>
          <h2>Your document is ready!</h2>
          <p>Hello,</p>
          <p>Your document "<strong>${documentTitle}</strong>" has been successfully generated.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/document/${documentId}">Click here to view your document</a></p>
          <p>Best regards,<br>SpecGen AI Team</p>
        </body>
      </html>
    `;

    const textBody = `
Your document "${documentTitle}" is ready!

View it here: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/document/${documentId}

Best regards,
SpecGen AI Team
    `;

    await sesClient.send(new SendEmailCommand({
      Source: config.sesFromEmail,
      Destination: {
        ToAddresses: [userEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    }));
  }

  async sendDocumentFailureEmail(userEmail: string, documentTitle: string, error: string): Promise<void> {
    if (config.useMockServices) {
      console.log(`Mock SES: Sending failure email to ${userEmail} for document ${documentTitle}`);
      return;
    }

    const subject = `Document Generation Failed: ${documentTitle}`;
    const htmlBody = `
      <html>
        <body>
          <h2>Document generation failed</h2>
          <p>Hello,</p>
          <p>Unfortunately, we encountered an issue generating your document "<strong>${documentTitle}</strong>".</p>
          <p><strong>Error:</strong> ${error}</p>
          <p>Please try again or contact support if the issue persists.</p>
          <p>Best regards,<br>SpecGen AI Team</p>
        </body>
      </html>
    `;

    await sesClient.send(new SendEmailCommand({
      Source: config.sesFromEmail,
      Destination: {
        ToAddresses: [userEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          }
        }
      }
    }));
  }
}

export const sesService = new SESService();