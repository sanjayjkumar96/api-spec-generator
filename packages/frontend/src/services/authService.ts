import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://s1mmzhde8j.execute-api.ap-south-1.amazonaws.com/Prod';

// Configure axios defaults for CORS
axios.defaults.withCredentials = false;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

export interface User {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadFromStorage();
    this.setupAxiosInterceptors();
  }

  private loadFromStorage() {
    try {
      this.token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch (error) {
          console.error('Failed to parse user from localStorage:', error);
          this.clearStorage();
        }
      }
      
      // Log the loaded state for debugging
      console.log('AuthService loaded from storage:', {
        hasToken: !!this.token,
        hasUser: !!this.user,
        userId: this.user?.userId
      });
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.clearStorage();
    }
  }

  private saveToStorage(token: string, user: User) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.token = token;
    this.user = user;
  }

  private clearStorage() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.token = null;
    this.user = null;
  }

  private setupAxiosInterceptors() {
    // Clear any existing interceptors to avoid duplicates
    axios.interceptors.request.clear();
    axios.interceptors.response.clear();

    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        // Add auth token
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        
        // Ensure credentials are included for CORS
        config.withCredentials = false;
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors and CORS issues
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Response error:', error);
        
        // Handle auth errors
        if (error.response?.status === 401) {
          console.log('Unauthorized - logging out user');
          this.logout();
          // Don't redirect to avoid infinite loops
        }
        
        // Handle CORS errors
        if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
          console.error('CORS or network error detected:', error);
          throw new Error('Network error: Unable to connect to the server. Please check if the server is running and CORS is properly configured.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      
      // Handle backend response structure: {success: true, user: {id, email, role}, token}
      const { token, user: backendUser } = response.data;
      
      // Map backend user structure to frontend user structure
      const user: User = {
        userId: backendUser.id,
        email: backendUser.email,
        role: backendUser.role,
        createdAt: backendUser.createdAt || new Date().toISOString(),
        updatedAt: backendUser.updatedAt,
        lastLogin: backendUser.lastLogin
      };
      
      this.saveToStorage(token, user);
      return { token, user };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, credentials);
      
      // Handle backend response structure: {success: true, user: {id, email, role}, token}
      const { token, user: backendUser } = response.data;
      
      // Map backend user structure to frontend user structure
      const user: User = {
        userId: backendUser.id,
        email: backendUser.email,
        role: backendUser.role,
        createdAt: backendUser.createdAt || new Date().toISOString(),
        updatedAt: backendUser.updatedAt,
        lastLogin: backendUser.lastLogin
      };
      
      this.saveToStorage(token, user);
      return { token, user };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  logout() {
    this.clearStorage();
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  async refreshUser(): Promise<User | null> {
    if (!this.token) return null;

    try {
      // Use the correct profile endpoint
      const response = await axios.get(`${API_BASE_URL}/auth/profile`);
      
      // Handle backend response structure: {success: true, user: {id, email, role, ...}}
      const { success, user: backendUser } = response.data;
      
      if (success && backendUser) {
        // Map backend user structure to frontend user structure
        const user: User = {
          userId: backendUser.id,
          email: backendUser.email,
          role: backendUser.role,
          createdAt: backendUser.createdAt,
          updatedAt: backendUser.updatedAt,
          lastLogin: backendUser.lastLogin
        };
        
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.user = user;
        return user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't automatically logout on refresh failure, let the auth context handle it
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;