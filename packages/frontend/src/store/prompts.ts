import { create } from 'zustand';
import axios from 'axios';
import { Prompt } from '../types';
import '../config/api';

interface PromptState {
  prompts: Prompt[];
  categories: string[];
  loading: boolean;
  error: string | null;
  fetchPrompts: (category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createPrompt: (prompt: Omit<Prompt, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set) => ({
  prompts: [],
  categories: [],
  loading: false,
  error: null,

  fetchPrompts: async (category?: string) => {
    set({ loading: true, error: null });
    try {
      const params = category ? { category } : {};
      const response = await axios.get('/prompts', { params });
      set({ prompts: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch prompts', loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const response = await axios.get('/prompts/categories');
      set({ categories: response.data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  createPrompt: async (promptData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/prompts', promptData);
      set(state => ({
        prompts: [response.data, ...state.prompts],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create prompt', loading: false });
      throw error;
    }
  }
}));