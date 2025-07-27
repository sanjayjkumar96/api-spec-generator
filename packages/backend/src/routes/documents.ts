import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { documentService } from '../services/documentService';
import { AuthRequest } from '../types';
import { z } from 'zod';

export const documentsRouter = Router();

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['EARS', 'USER_STORY']),
  rawContent: z.string().min(1).max(10000)
});

documentsRouter.use(authenticateToken);

documentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const { title, type, rawContent } = createDocumentSchema.parse(req.body);
    const result = await documentService.generateDocument(authReq.user!.id, { title, type, rawContent });
    res.status(202).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

documentsRouter.get('/', async (req: Request, res) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const documents = await documentService.getUserDocuments(authReq.user!.id);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

documentsRouter.get('/:id', async (req: Request, res) => {
  try {
    const authReq = req as unknown as AuthRequest;
    const document = await documentService.getDocumentById(req.params.id, authReq.user!.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});