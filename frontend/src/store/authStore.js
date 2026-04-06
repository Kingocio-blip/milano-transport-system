import { create } from 'zustand';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error de autenticación');
      }
      
      const data = await response.json();
      
      // Guardar en localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Actualizar estado
      set({ 
        user: data.user, 
        token: data.access_token, 
        isAuthenticated: true 
      });
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

// Helper para API calls
export const api = {
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || `Error ${response.status}`);
    }
    
    return response.json();
  },
  
  get(endpoint) { return this.fetch(endpoint, { method: 'GET' }); },
  post(endpoint, data) { return this.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.fetch(endpoint, { method: 'DELETE' }); }
};