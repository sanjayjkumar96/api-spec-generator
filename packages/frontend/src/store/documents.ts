import { create } from 'zustand';
import axios from 'axios';
import { Document, DocumentGenerationRequest } from '../types';
import '../config/api';

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  generateDocument: (request: DocumentGenerationRequest) => Promise<{ documentId: string; status: string }>;
  getDocument: (id: string) => Promise<Document>;
  pollDocumentStatus: (id: string) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/documents');
      set({ documents: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch documents', loading: false });
    }
  },

  generateDocument: async (request: DocumentGenerationRequest) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/documents', request);
      
      // Refresh documents list
      get().fetchDocuments();
      
      // Start polling for status updates
      get().pollDocumentStatus(response.data.documentId);
      
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to generate document', loading: false });
      throw error;
    }
  },

  getDocument: async (id: string) => {
    try {
      const response = await axios.get(`/documents/${id}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch document');
    }
  },

  pollDocumentStatus: (id: string) => {
    const poll = async () => {
      try {
        const document = await get().getDocument(id);
        
        // Update the document in the list
        set(state => ({
          documents: state.documents.map(doc => 
            doc.id === id ? document : doc
          )
        }));

        // Continue polling if still pending
        if (document.status === 'PENDING') {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 1000);
  }
}));