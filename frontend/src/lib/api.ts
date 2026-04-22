// ============================================
// MILANO - API Client (JWT Robusto v2.0)
// Maneja access_token (15min) + refresh_token (7días)
// ============================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ============================================
// GESTIÓN DE TOKENS (localStorage)
// ============================================

const TOKEN_KEY = 'milano_access_token';
const REFRESH_KEY = 'milano_refresh_token';

// Obtener access token
function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Obtener refresh token
function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

// Guardar ambos tokens (después de login o refresh)
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  console.log('🔐 Tokens guardados (access + refresh)');
}

// Guardar solo access token (después de refresh)
export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Eliminar tokens (logout)
export function removeTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  console.log('👋 Tokens eliminados (logout)');
}

// ============================================
// REFRESH TOKEN AUTOMÁTICO
// ============================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Suscribirse a la renovación de token
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Notificar a todos los suscriptores que hay nuevo token
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

// Renovar el access token usando el refresh token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    console.error('❌ No hay refresh token disponible');
    return null;
  }

  if (isRefreshing) {
    // Si ya está renovando, esperar a que termine
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken: string) => {
        resolve(newToken);
      });
    });
  }

  isRefreshing = true;
  console.log('🔄 Renovando access token...');

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token inválido o expirado
      console.error('❌ Refresh token inválido, redirigiendo a login');
      removeTokens();
      window.location.href = '/login';
      return null;
    }

    const data = await response.json();
    
    // Guardar nuevos tokens (rotación: refresh token también cambia)
    setTokens(data.access_token, data.refresh_token);
    
    console.log('✅ Token renovado correctamente');
    onTokenRefreshed(data.access_token);
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Error renovando token:', error);
    removeTokens();
    window.location.href = '/login';
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ============================================
// HEADERS Y MANEJO DE ERRORES
// ============================================

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Manejar errores con renovación automática de token
async function handleResponse(response: Response, retryFunc?: () => Promise<any>) {
  // 401 (Unauthorized) = token expirado, intentar renovar
  if (response.status === 401) {
    console.warn('⚠️ Token expirado (401), intentando renovar...');
    
    const newToken = await refreshAccessToken();
    
    if (newToken && retryFunc) {
      console.log('🔄 Reintentando petición con nuevo token...');
      return retryFunc();
    } else {
      window.location.href = '/login';
      throw new Error('Sesion expirada. Por favor, inicie sesion nuevamente.');
    }
  }

  // 403 (Forbidden) = sin permisos, NO intentar renovar token
  if (response.status === 403) {
    let errorData: any = {};
    try { errorData = await response.json(); } catch (e) { /* ignorar */ }
    const msg = errorData.detail || 'No tiene permisos para realizar esta accion';
    console.error('❌ Sin permisos (403):', msg);
    throw new Error(`PERMISO_REQUERIDO: ${msg}`);
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Error desconocido' };
    }
    
    console.error('❌ API Error:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      error: errorData
    });
    
    let errorMessage = errorData.detail || errorData.error || `Error ${response.status}: ${response.statusText}`;
    if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; ');
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// ============================================
// API CLIENT CON REFRESH AUTOMÁTICO
// ============================================

export const api = {
  // GET con retry automático
  get: async <T = any>(endpoint: string): Promise<T> => {
    console.log('📤 API GET:', `${API_URL}${endpoint}`);
    
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response, () => api.get(endpoint));
    };
    
    const data = await makeRequest();
    console.log('✅ API GET Response:', endpoint, data);
    return data as T;
  },
  
  // POST con retry automático
  post: async <T = any>(endpoint: string, body: any): Promise<T> => {
    console.log('📤 API POST:', `${API_URL}${endpoint}`, body);
    
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(response, () => api.post(endpoint, body));
    };
    
    const result = await makeRequest();
    console.log('✅ API POST Response:', endpoint, result);
    return result as T;
  },
  
  // PUT con retry automático
  put: async <T = any>(endpoint: string, body: any): Promise<T> => {
    console.log('📤 API PUT:', `${API_URL}${endpoint}`, body);
    
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(response, () => api.put(endpoint, body));
    };
    
    const result = await makeRequest();
    console.log('✅ API PUT Response:', endpoint, result);
    return result as T;
  },
  
  // PATCH con retry automático
  patch: async <T = any>(endpoint: string, body?: any): Promise<T> => {
    console.log('📤 API PATCH:', `${API_URL}${endpoint}`, body);
    
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse(response, () => api.patch(endpoint, body));
    };
    
    const result = await makeRequest();
    console.log('✅ API PATCH Response:', endpoint, result);
    return result as T;
  },
  
  // DELETE con retry automático
  delete: async <T = any>(endpoint: string): Promise<T> => {
    console.log('📤 API DELETE:', `${API_URL}${endpoint}`);
    
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(response, () => api.delete(endpoint));
    };
    
    const result = await makeRequest();
    console.log('✅ API DELETE Response:', endpoint, result);
    return result as T;
  },
};

// ============================================
// SERVICIOS API ACTUALIZADOS
// ============================================

export const authApi = {
  // Login guarda AMBOS tokens
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    // Guardar access + refresh tokens
    if (response.access_token && response.refresh_token) {
      setTokens(response.access_token, response.refresh_token);
    }
    return response;
  },
  
  // Logout llama al backend y limpia tokens
  logout: async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      console.warn('Logout backend falló, limpiando localmente');
    }
    removeTokens();
  },
  
  // Logout de todos los dispositivos
  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all', {});
    } catch (e) {
      console.warn('Logout-all backend falló, limpiando localmente');
    }
    removeTokens();
  },
  
  // Obtener datos del usuario actual
  me: () => api.get('/auth/me'),
  
  // Obtener permisos del usuario
  permissions: () => api.get('/auth/permissions'),
};

// Resto de APIs sin cambios (usan el api client mejorado)
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

// ============================================
// PERMISOS Y ROLES (nuevos endpoints)
// ============================================

export const permissionsApi = {
  getAll: () => api.get('/permissions'),
};

export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

// ============================================
// VEHICULO TAREAS (mantenimiento, averias, documentacion)
// ============================================

export const vehiculoTareasApi = {
  getByVehiculo: (vehiculoId: string, params?: { tipo?: string; estado?: string }) => {
    const query = params
      ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
      : '';
    return api.get(`/vehiculos/${vehiculoId}/tareas${query}`);
  },
  create: (vehiculoId: string, data: any) => api.post(`/vehiculos/${vehiculoId}/tareas`, data),
  update: (tareaId: string, data: any) => api.put(`/vehiculo-tareas/${tareaId}`, data),
  delete: (tareaId: string) => api.delete(`/vehiculo-tareas/${tareaId}`),
};

export const vehiculoEstadoApi = {
  update: (vehiculoId: string, data: any) => api.put(`/vehiculos/${vehiculoId}/estado`, data),
};

// ============================================
// MENSAJES (Chat por servicio)
// ============================================

export const mensajesApi = {
  getByServicio: (servicioId: string) => api.get(`/servicios/${servicioId}/mensajes`),
  create: (servicioId: string, data: any) => api.post(`/servicios/${servicioId}/mensajes`, data),
  marcarLeido: (mensajeId: string) => api.patch(`/mensajes/${mensajeId}/leido`),
};

// ============================================
// RUTAS (Hojas de ruta)
// ============================================

export const rutasApi = {
  getAll: (params?: { servicio_id?: string; estado?: string }) => {
    const query = params
      ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
      : '';
    return api.get(`/rutas${query}`);
  },
  getById: (id: string) => api.get(`/rutas/${id}`),
  getByServicio: (servicioId: string) => api.get(`/servicios/${servicioId}/ruta`),
  create: (data: any) => api.post('/rutas', data),
  update: (id: string, data: any) => api.put(`/rutas/${id}`, data),
  delete: (id: string) => api.delete(`/rutas/${id}`),
};