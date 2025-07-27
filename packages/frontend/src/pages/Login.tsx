import { useState } from 'react';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState<'Analyst' | 'Developer'>('Analyst');
  const { login, register, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, role);
      }
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>SpecGen AI</h1>
      
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => setIsLogin(true)}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            background: isLogin ? '#007bff' : '#f8f9fa',
            color: isLogin ? 'white' : '#333'
          }}
        >
          Login
        </button>
        <button 
          onClick={() => setIsLogin(false)}
          style={{ 
            padding: '10px 20px',
            background: !isLogin ? '#007bff' : '#f8f9fa',
            color: !isLogin ? 'white' : '#333'
          }}
        >
          Register
        </button>
      </div>

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
            required
            minLength={isLogin ? 1 : 6}
          />
        </div>
        {!isLogin && (
          <div style={{ marginBottom: '15px' }}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'Analyst' | 'Developer')}
              style={{ width: '100%', padding: '10px' }}
            >
              <option value="Analyst">Business Analyst</option>
              <option value="Developer">Developer</option>
            </select>
          </div>
        )}
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>
    </div>
  );
}