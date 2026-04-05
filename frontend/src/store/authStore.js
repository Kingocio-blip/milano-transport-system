import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.REACT_APP_API_URL || 'https://milano-transport-system.onrender.com';

// API helper con métodos HTTP
export const api = {
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    // Si la respuesta es 204 No Content, no intentar parsear JSON
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  },
  
  // Métodos HTTP convenientes
  get(endpoint) {
    return this.fetch(endpoint, { method: 'GET' });
  },
  
  post(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete(endpoint) {
    return this.fetch(endpoint, { method: 'DELETE' });
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      rol: null,
      conductorId: null,
      loading: false,
      error: null,

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const formData = new URLSearchParams();
          formData.append('username', username);
          formData.append('password', password);

          const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.detail || 'Error de autenticación');
          }

          const { access_token, rol, conductor_id } = data;
          
          localStorage.setItem('token', access_token);
          localStorage.setItem('rol', rol);
          if (conductor_id) {
            localStorage.setItem('conductorId', conductor_id.toString());
          }

          set({ 
            token: access_token, 
            rol, 
            conductorId: conductor_id,
            loading: false,
            error: null 
          });

          return { success: true, rol };
        } catch (error) {
          set({ loading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('rol');
        localStorage.removeItem('conductorId');
        set({ token: null, rol: null, conductorId: null, error: null });
      },

      checkAuth: () => {
        const token = localStorage.getItem('token');
        const rol = localStorage.getItem('rol');
        const conductorId = localStorage.getItem('conductorId');
        if (token && rol) {
          set({ token, rol, conductorId: conductorId ? parseInt(conductorId) : null });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);