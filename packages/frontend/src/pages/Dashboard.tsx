import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useDocumentStore } from '../store/documents';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { documents, loading, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'PENDING': return '#ffc107';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1>SpecGen AI Dashboard</h1>
        <div>
          <span>Welcome, {user?.email} ({user?.role})</span>
          <button onClick={logout} style={{ marginLeft: '10px' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <section>
          <h2>Recent Documents ({documents.length})</h2>
          {loading ? (
            <p>Loading documents...</p>
          ) : documents.length === 0 ? (
            <p>No documents yet. Create your first document!</p>
          ) : (
            documents.slice(0, 5).map(doc => (
              <div key={doc.id} style={{ 
                border: '1px solid #ccc', 
                padding: '15px', 
                margin: '10px 0',
                borderRadius: '8px'
              }}>
                <h3>{doc.title}</h3>
                <p>Type: {doc.type}</p>
                <p style={{ color: getStatusColor(doc.status) }}>
                  Status: {doc.status}
                  {doc.status === 'PENDING' && ' ⏳'}
                  {doc.status === 'COMPLETED' && ' ✅'}
                  {doc.status === 'FAILED' && ' ❌'}
                </p>
                <p>Created: {new Date(doc.createdAt).toLocaleDateString()}</p>
                {doc.status === 'COMPLETED' && (
                  <Link to={`/document/${doc.id}`}>
                    <button style={{ marginTop: '10px', padding: '5px 10px' }}>
                      View Document
                    </button>
                  </Link>
                )}
                {doc.errorMessage && (
                  <p style={{ color: '#dc3545', fontSize: '14px' }}>
                    Error: {doc.errorMessage}
                  </p>
                )}
              </div>
            ))
          )}
          {documents.length > 5 && (
            <Link to="/documents">
              <button style={{ marginTop: '10px' }}>View All Documents</button>
            </Link>
          )}
        </section>

        <section>
          <h2>Quick Actions</h2>
          <Link to="/generate">
            <button style={{ 
              width: '100%', 
              padding: '20px', 
              margin: '10px 0', 
              fontSize: '16px',
              background: '#28a745'
            }}>
              📝 Generate New Document
            </button>
          </Link>
          <Link to="/prompts">
            <button style={{ 
              width: '100%', 
              padding: '20px', 
              margin: '10px 0', 
              fontSize: '16px',
              background: '#17a2b8'
            }}>
              📚 Browse Prompt Library
            </button>
          </Link>
          
          <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Getting Started</h3>
            <p style={{ fontSize: '14px', margin: '10px 0' }}>
              1. Click "Generate New Document" to create EARS specifications or user stories
            </p>
            <p style={{ fontSize: '14px', margin: '10px 0' }}>
              2. Browse the prompt library for AI coding assistance
            </p>
            <p style={{ fontSize: '14px', margin: '10px 0' }}>
              3. Documents are processed asynchronously - you'll see status updates here
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}