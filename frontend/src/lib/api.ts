// ============================================
// MILANO - API Client
// Configuración de conexión con el backend
// ============================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Obtener token del localStorage
function getToken(): string | null {
  return localStorage.getItem('milano_token');
}

// Guardar token
export function setToken(token: string): void {
  localStorage.setItem('milano_token', token);
}

// Eliminar token (logout)
export function removeToken(): void {
  localStorage.removeItem('milano_token');
}

// Headers por defecto
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Manejar errores
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.detail || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// API Client
export const api = {
  // GET
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  // POST
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  // PUT
  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  // DELETE
  delete: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================
// SERVICIOS API
// ============================================

export const authApi = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  me: () => 
    api.get('/auth/me'),
};

export const clientesApi = {
  getAll: () => api.get('/clientes'),
  getById: (id: string) => api.get(`/clientes/${id}`),
  create: (data: any) => api.post('/clientes', data),
  update: (id: string, data: any) => api.put(`/clientes/${id}`, data),
  delete: (id: string) => api.delete(`/clientes/${id}`),
};

export const vehiculosApi = {
  getAll: () => api.get('/vehiculos'),
  getById: (id: string) => api.get(`/vehiculos/${id}`),
  create: (data: any) => api.post('/vehiculos', data),
  update: (id: string, data: any) => api.put(`/vehiculos/${id}`, data),
  delete: (id: string) => api.delete(`/vehiculos/${id}`),
};

export const conductoresApi = {
  getAll: () => api.get('/conductores'),
  getById: (id: string) => api.get(`/conductores/${id}`),
  create: (data: any) => api.post('/conductores', data),
  update: (id: string, data: any) => api.put(`/conductores/${id}`, data),
  delete: (id: string) => api.delete(`/conductores/${id}`),
};

export const serviciosApi = {
  getAll: () => api.get('/servicios'),
  getById: (id: string) => api.get(`/servicios/${id}`),
  create: (data: any) => api.post('/servicios', data),
  update: (id: string, data: any) => api.put(`/servicios/${id}`, data),
  delete: (id: string) => api.delete(`/servicios/${id}`),
};

export const facturasApi = {
  getAll: () => api.get('/facturas'),
  getById: (id: string) => api.get(`/facturas/${id}`),
  create: (data: any) => api.post('/facturas', data),
  update: (id: string, data: any) => api.put(`/facturas/${id}`, data),
  delete: (id: string) => api.delete(`/facturas/${id}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getServiciosRecientes: () => api.get('/dashboard/servicios-recientes'),
};
