import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documents';

export default function DocumentGenerator() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'EARS' | 'USER_STORY'>('EARS');
  const [rawContent, setRawContent] = useState('');
  const navigate = useNavigate();
  const { generateDocument, loading, error } = useDocumentStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await generateDocument({ title, type, rawContent });
      alert(`Document generation started! Document ID: ${result.documentId}\n\nYou can track progress on the dashboard.`);
      navigate('/');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const getTypeDescription = () => {
    if (type === 'EARS') {
      return 'EARS (Easy Approach to Requirements Syntax) - Structured requirements with clear acceptance criteria';
    }
    return 'User Stories - Agile format stories with acceptance criteria from user perspective';
  };

  const getPlaceholderText = () => {
    if (type === 'EARS') {
      return `Example requirements for EARS specification:

- The system must authenticate users via email/password
- Users should be able to create, edit, and delete documents
- The system must send email notifications when documents are ready
- Response time should be under 2 seconds for standard operations
- All data must be encrypted at rest and in transit`;
    }
    return `Example requirements for User Stories:

- Users need to log in to access their documents
- Business analysts want to generate EARS specifications from raw notes
- Developers need access to a prompt library for AI coding assistance
- Users should receive notifications when document generation is complete
- The system should work offline when possible`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      <h1>Generate New Document</h1>
      
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Document Title:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
            placeholder="e.g., Payment API Specifications, User Management System"
            required
            maxLength={200}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Document Type:
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'EARS' | 'USER_STORY')}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            <option value="EARS">EARS Specification</option>
            <option value="USER_STORY">User Stories</option>
          </select>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            {getTypeDescription()}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Requirements/Content:
          </label>
          <textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            style={{ 
              width: '100%', 
              height: '300px', 
              padding: '12px', 
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
            placeholder={getPlaceholderText()}
            required
            maxLength={10000}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {rawContent.length}/10,000 characters
          </p>
        </div>

        <div style={{ 
          background: '#e7f3ff', 
          padding: '15px', 
          marginBottom: '20px',
          borderRadius: '4px',
          border: '1px solid #b3d9ff'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>💡 Tips for better results:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Be specific about functional and non-functional requirements</li>
            <li>Include user roles and permissions if applicable</li>
            <li>Mention integration points with other systems</li>
            <li>Specify performance, security, and compliance requirements</li>
          </ul>
        </div>

        <div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '15px 30px', 
              fontSize: '16px',
              background: loading ? '#ccc' : '#28a745',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Generating...' : '🚀 Generate Document'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/')}
            style={{ 
              padding: '15px 30px', 
              fontSize: '16px', 
              marginLeft: '10px',
              background: '#6c757d'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}