import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  rol: localStorage.getItem('rol'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      // Obtener datos del usuario incluyendo rol
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = userResponse.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('rol', userData.rol);
      
      set({ 
        token: access_token, 
        user: userData,
        rol: userData.rol
      });
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.detail || 'Error al iniciar sesion' });
      return false;
    }
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, rol: response.data.rol });
      localStorage.setItem('rol', response.data.rol);
    } catch (error) {
      get().logout();
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (token) {
      set({ token, rol });
      await get().fetchUser();
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    set({ user: null, token: null, rol: null, error: null });
  },
}));

export { api };