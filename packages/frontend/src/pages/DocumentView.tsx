import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documents';
import { Document } from '../types';

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDocument } = useDocumentStore();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchDocument = async () => {
      try {
        const doc = await getDocument(id);
        setDocument(doc);
      } catch (error) {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, getDocument, navigate]);

  const copyToClipboard = () => {
    if (document?.content) {
      navigator.clipboard.writeText(document.content);
      alert('Document content copied to clipboard!');
    }
  };

  const downloadDocument = () => {
    if (document?.content) {
      const blob = new Blob([document.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading document...</h2>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error || 'Document not found'}</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  if (document.status === 'PENDING') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Document is being generated...</h2>
        <p>Please wait while we process your document.</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  if (document.status === 'FAILED') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Document generation failed</h2>
        <p>{document.errorMessage || 'An error occurred during generation'}</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{document.title}</h1>
            <p style={{ color: '#666', margin: '5px 0' }}>
              Type: {document.type} | Created: {new Date(document.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <button 
              onClick={copyToClipboard}
              style={{ padding: '10px 15px', marginRight: '10px' }}
            >
              📋 Copy
            </button>
            <button 
              onClick={downloadDocument}
              style={{ padding: '10px 15px', marginRight: '10px' }}
            >
              💾 Download
            </button>
            <button 
              onClick={() => navigate('/')}
              style={{ padding: '10px 15px' }}
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Original Requirements:</h3>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          fontSize: '14px',
          background: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {document.rawContent}
        </pre>
      </div>

      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px',
        border: '1px solid #ddd',
        minHeight: '400px'
      }}>
        <h3 style={{ marginBottom: '20px' }}>Generated Document:</h3>
        <div style={{ 
          fontSize: '14px', 
          lineHeight: '1.6',
          fontFamily: 'Georgia, serif'
        }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'inherit',
            margin: 0
          }}>
            {document.content}
          </pre>
        </div>
      </div>
    </div>
  );
}