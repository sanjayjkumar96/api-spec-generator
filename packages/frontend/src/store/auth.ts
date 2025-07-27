import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'Analyst' | 'Developer') => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.post('/api/auth/login', { email, password });
          const { user, token } = response.data;
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed', 
            loading: false 
          });
          throw error;
        }
      },

      register: async (email: string, password: string, role: 'Analyst' | 'Developer') => {
        set({ loading: true, error: null });
        try {
          const response = await axios.post('/api/auth/register', { email, password, role });
          const { user, token } = response.data;
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Registration failed', 
            loading: false 
          });
          throw error;
        }
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null, error: null });
      },

      initializeAuth: () => {
        const { token } = get();
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      }
    }),
    { 
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeAuth();
        }
      }
    }
  )
);