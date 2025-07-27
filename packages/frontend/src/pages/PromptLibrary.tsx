import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePromptStore } from '../store/prompts';

export default function PromptLibrary() {
  const navigate = useNavigate();
  const { prompts, categories, loading, fetchPrompts, fetchCategories, createPrompt } = usePromptStore();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    category: '',
    promptText: '',
    tags: [] as string[]
  });

  useEffect(() => {
    fetchPrompts(selectedCategory || undefined);
    fetchCategories();
  }, [selectedCategory, fetchPrompts, fetchCategories]);

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    alert(`"${title}" copied to clipboard!`);
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPrompt({
        ...newPrompt
      });
      setNewPrompt({ title: '', category: '', promptText: '', tags: [] });
      setShowAddForm(false);
      fetchCategories(); // Refresh categories
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Prompt Library ({prompts.length} prompts)</h1>
        <div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '10px 20px', marginRight: '10px', background: '#28a745' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Prompt'}
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px' }}>
            ← Dashboard
          </button>
        </div>
      </header>

      {showAddForm && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          marginBottom: '30px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3>Add New Prompt</h3>
          <form onSubmit={handleAddPrompt}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Prompt title"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({...newPrompt, title: e.target.value})}
                style={{ width: '100%', padding: '10px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Category (e.g., Testing, React, Python)"
                value={newPrompt.category}
                onChange={(e) => setNewPrompt({...newPrompt, category: e.target.value})}
                style={{ width: '100%', padding: '10px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <textarea
                placeholder="Prompt text..."
                value={newPrompt.promptText}
                onChange={(e) => setNewPrompt({...newPrompt, promptText: e.target.value})}
                style={{ width: '100%', height: '150px', padding: '10px' }}
                required
              />
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#007bff' }}>
              Add Prompt
            </button>
          </form>
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '10px', marginRight: '10px', minWidth: '200px' }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <span style={{ color: '#666', fontSize: '14px' }}>
          {selectedCategory ? `Showing ${prompts.length} prompts in "${selectedCategory}"` : `Showing all ${prompts.length} prompts`}
        </span>
      </div>

      {loading ? (
        <p>Loading prompts...</p>
      ) : prompts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>No prompts found{selectedCategory ? ` in "${selectedCategory}"` : ''}.</p>
          <button 
            onClick={() => setShowAddForm(true)}
            style={{ padding: '10px 20px', background: '#28a745' }}
          >
            Add the first prompt
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
          {prompts.map(prompt => (
            <div key={prompt.id} style={{ 
              border: '1px solid #ccc', 
              padding: '20px', 
              borderRadius: '8px',
              background: 'white'
            }}>
              <h3 style={{ marginBottom: '10px' }}>{prompt.title}</h3>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ 
                  background: '#e9ecef', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginRight: '10px'
                }}>
                  {prompt.category}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Used {prompt.usageCount} times
                </span>
              </div>
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginBottom: '15px',
                lineHeight: '1.4'
              }}>
                {prompt.promptText.length > 150 
                  ? `${prompt.promptText.substring(0, 150)}...` 
                  : prompt.promptText
                }
              </p>
              {prompt.tags.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  {prompt.tags.map(tag => (
                    <span key={tag} style={{
                      background: '#007bff',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      marginRight: '5px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button 
                onClick={() => copyToClipboard(prompt.promptText, prompt.title)}
                style={{ 
                  padding: '8px 16px', 
                  marginRight: '10px',
                  background: '#28a745'
                }}
              >
                📋 Copy Prompt
              </button>
              <button 
                onClick={() => {
                  const modal = window.open('', '_blank', 'width=600,height=400');
                  if (modal) {
                    modal.document.write(`
                      <html>
                        <head><title>${prompt.title}</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                          <h2>${prompt.title}</h2>
                          <p><strong>Category:</strong> ${prompt.category}</p>
                          <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                            <pre style="white-space: pre-wrap; font-family: inherit;">${prompt.promptText}</pre>
                          </div>
                        </body>
                      </html>
                    `);
                  }
                }}
                style={{ 
                  padding: '8px 16px',
                  background: '#17a2b8'
                }}
              >
                👁️ Preview
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}