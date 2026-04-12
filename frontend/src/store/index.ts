import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Tipos compartidos (o importa desde types/index.ts)
type TipoCliente = 'festival' | 'promotor' | 'colegio' | 'empresa' | 'particular';

// ==================== TIPOS ====================

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: 'admin' | 'conductor' | 'usuario';
  activo: boolean;
  fechaAlta?: string;
  ultimoAcceso?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: any;
}

// Cliente
export interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  cif: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  formaPago: string;
  diasPago: number;
  condicionesEspeciales: string;
  notas: string;
  fechaAlta: string;
  tipo: TipoCliente;    // <-- CORREGIDO: Usa el tipo específico
  estado: string;
  contacto: {
    id: number;
    clienteId: number;
    nombre: string;
    email: string;
    telefono: string;
    cargo: string;
    principal: boolean;
  };
  totalServicios: number;
  totalFacturado: number;
  ultimoServicio?: string;
}

export interface CreateClienteData {
  nombre: string;
  cif?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  formaPago?: string;
  diasPago?: number;
  condicionesEspeciales?: string;
  notas?: string;
  contacto?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    cargo?: string;
  };
}

export interface UpdateClienteData {
  nombre?: string;
  cif?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  formaPago?: string;
  diasPago?: number;
  condicionesEspeciales?: string;
  notas?: string;
  contacto?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    cargo?: string;
  };
}

// Servicio
export interface Servicio {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNombre: string;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: 'pendiente' | 'en_curso' | 'completado' | 'cancelado';
  importe: number;
  notas: string;
}

export interface CreateServicioData {
  clienteId: number;
  tipo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin?: string;
  importe?: number;
  notas?: string;
}

export interface UpdateServicioData {
  tipo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: 'pendiente' | 'en_curso' | 'completado' | 'cancelado';
  importe?: number;
  notas?: string;
}

// Factura
export interface Factura {
  id: number;
  numero: string;
  clienteId: number;
  clienteNombre: string;
  fecha: string;
  fechaVencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  concepto: string;
}

export interface CreateFacturaData {
  clienteId: number;
  fecha: string;
  fechaVencimiento: string;
  subtotal: number;
  iva?: number;
  concepto?: string;
}

// Dashboard
export interface DashboardData {
  stats: {
    totalClientes: number;
    totalServicios: number;
    totalFacturado: number;
    facturasPendientes: number;
    serviciosPendientes: number;
    serviciosEsteMes: number;
  };
  monthlyData: any[];
  ultimosServicios: any[];
  facturasPendientes: any[];
}

// ==================== API HELPER ====================

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
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
  
  get(endpoint: string) { return this.fetch(endpoint, { method: 'GET' }); },
  post(endpoint: string, data: any) { return this.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint: string, data: any) { return this.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(endpoint: string) { return this.fetch(endpoint, { method: 'DELETE' }); }
};

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  checkAuth: () => boolean;
}

const convertUserFromBackend = (user: any): User => ({
  id: user.id,
  username: user.username,
  email: user.email,
  nombre: user.nombre,
  apellidos: user.apellidos,
  rol: user.rol,
  activo: user.activo,
  fechaAlta: user.fecha_creacion,
  ultimoAcceso: user.ultimo_acceso,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Error de autenticación');
        }

        const data: AuthResponse = await response.json();
        
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        set({
          user: convertUserFromBackend(data.user),
          token: data.access_token,
          isAuthenticated: true,
        });
        
        return data;
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: () => {
        return get().isAuthenticated && get().token !== null;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// ==================== CLIENTES STORE ====================

interface ClientesState {
  clientes: Cliente[];
  clienteActual: Cliente | null;
  loading: boolean;
  error: string | null;
  fetchClientes: () => Promise<void>;
  fetchCliente: (id: number) => Promise<void>;
  createCliente: (data: CreateClienteData) => Promise<void>;
  updateCliente: (id: number, data: UpdateClienteData) => Promise<void>;
  deleteCliente: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertClienteFromBackend = (cliente: any): Cliente => ({
  id: cliente.id,
  codigo: cliente.codigo,
  nombre: cliente.nombre,
  cif: cliente.nif || '',
  email: cliente.contacto_email || '',
  telefono: cliente.contacto_telefono || '',
  direccion: cliente.contacto_direccion || '',
  ciudad: cliente.contacto_ciudad || '',
  codigoPostal: cliente.contacto_codigo_postal || '',
  formaPago: cliente.forma_pago || '',
  diasPago: cliente.dias_pago || 30,
  condicionesEspeciales: cliente.condiciones_especiales || '',
  notas: cliente.notas || '',
  fechaAlta: cliente.fecha_alta,
  tipo: (cliente.tipo as TipoCliente) || 'particular',  // <-- CORREGIDO: Cast a TipoCliente
  estado: cliente.estado || 'activo',
  contacto: {
    id: 0,
    clienteId: cliente.id,
    nombre: cliente.persona_contacto_nombre || '',
    email: cliente.persona_contacto_email || '',
    telefono: cliente.persona_contacto_telefono || '',
    cargo: cliente.persona_contacto_cargo || '',
    principal: true,
  },
  totalServicios: cliente.total_servicios || 0,
  totalFacturado: cliente.total_facturado || 0,
  ultimoServicio: cliente.ultimo_servicio,
});

const convertClienteToBackend = (data: CreateClienteData | UpdateClienteData) => {
  const backendData: any = {};
  
  // Información básica
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.cif !== undefined) backendData.nif = data.cif || null;
  
  // Contacto principal del cliente (empresa/autónomo)
  if (data.email !== undefined) backendData.contacto_email = data.email || null;
  if (data.telefono !== undefined) backendData.contacto_telefono = data.telefono || null;
  
  // Dirección
  if (data.direccion !== undefined) backendData.contacto_direccion = data.direccion || null;
  if (data.ciudad !== undefined) backendData.contacto_ciudad = data.ciudad || null;
  if (data.codigoPostal !== undefined) backendData.contacto_codigo_postal = data.codigoPostal || null;
  
  // Condiciones
  if (data.formaPago !== undefined) backendData.forma_pago = data.formaPago || null;
  if (data.diasPago !== undefined) backendData.dias_pago = data.diasPago || null;
  if (data.condicionesEspeciales !== undefined) backendData.condiciones_especiales = data.condicionesEspeciales || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  // Persona de contacto (campos planos separados)
  if (data.contacto && data.contacto.nombre) {
    backendData.persona_contacto_nombre = data.contacto.nombre;
    backendData.persona_contacto_email = data.contacto.email || null;
    backendData.persona_contacto_telefono = data.contacto.telefono || null;
    backendData.persona_contacto_cargo = data.contacto.cargo || null;
  }
  
  return backendData;
};

export const useClientesStore = create<ClientesState>((set) => ({
  clientes: [],
  clienteActual: null,
  loading: false,
  error: null,

  fetchClientes: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/clientes/');
      set({ 
        clientes: data.map(convertClienteFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCliente: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/clientes/${id}`);
      set({ 
        clienteActual: convertClienteFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCliente: async (data) => {
    set({ loading: true, error: null });
    try {
      const newCliente = await api.post('/clientes/', convertClienteToBackend(data));
      set((state) => ({
        clientes: [...state.clientes, convertClienteFromBackend(newCliente)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCliente: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedCliente = await api.put(`/clientes/${id}`, convertClienteToBackend(data));
      set((state) => ({
        clientes: state.clientes.map((c) =>
          c.id === id ? convertClienteFromBackend(updatedCliente) : c
        ),
        clienteActual: convertClienteFromBackend(updatedCliente),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCliente: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/clientes/${id}`);
      set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== SERVICIOS STORE ====================

interface ServiciosState {
  servicios: Servicio[];
  servicioActual: Servicio | null;
  loading: boolean;
  error: string | null;
  fetchServicios: () => Promise<void>;
  fetchServicio: (id: number) => Promise<void>;
  createServicio: (data: CreateServicioData) => Promise<void>;
  updateServicio: (id: number, data: UpdateServicioData) => Promise<void>;
  deleteServicio: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertServicioFromBackend = (servicio: any): Servicio => ({
  id: servicio.id,
  codigo: servicio.codigo,
  clienteId: servicio.cliente_id,
  clienteNombre: servicio.cliente?.nombre || '',
  tipo: servicio.tipo,
  descripcion: servicio.descripcion || '',
  fechaInicio: servicio.fecha_inicio || '',
  fechaFin: servicio.fecha_fin,
  estado: servicio.estado,
  importe: servicio.precio || 0,
  notas: servicio.notas_cliente || '',
});

const convertServicioToBackend = (data: CreateServicioData | UpdateServicioData) => {
  const backendData: any = {};
  
  if ('clienteId' in data && data.clienteId !== undefined) {
    backendData.cliente_id = data.clienteId;
  }
  
  if ('estado' in data && data.estado !== undefined) {
    backendData.estado = data.estado;
  }
  
  if (data.tipo !== undefined) backendData.tipo = data.tipo;
  if (data.descripcion !== undefined) backendData.descripcion = data.descripcion;
  if (data.fechaInicio !== undefined) backendData.fecha_inicio = data.fechaInicio;
  if (data.fechaFin !== undefined) backendData.fecha_fin = data.fechaFin || null;
  if (data.importe !== undefined) backendData.precio = data.importe || 0;
  if (data.notas !== undefined) backendData.notas_cliente = data.notas || null;
  
  return backendData;
};

export const useServiciosStore = create<ServiciosState>((set) => ({
  servicios: [],
  servicioActual: null,
  loading: false,
  error: null,

  fetchServicios: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/servicios/');
      set({ 
        servicios: data.map(convertServicioFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServicio: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/servicios/${id}`);
      set({ 
        servicioActual: convertServicioFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createServicio: async (data) => {
    set({ loading: true, error: null });
    try {
      const newServicio = await api.post('/servicios/', convertServicioToBackend(data));
      set((state) => ({
        servicios: [...state.servicios, convertServicioFromBackend(newServicio)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateServicio: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedServicio = await api.put(`/servicios/${id}`, convertServicioToBackend(data));
      set((state) => ({
        servicios: state.servicios.map((s) =>
          s.id === id ? convertServicioFromBackend(updatedServicio) : s
        ),
        servicioActual: convertServicioFromBackend(updatedServicio),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteServicio: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/servicios/${id}`);
      set((state) => ({
        servicios: state.servicios.filter((s) => s.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== FACTURAS STORE ====================

interface FacturasState {
  facturas: Factura[];
  facturaActual: Factura | null;
  loading: boolean;
  error: string | null;
  fetchFacturas: () => Promise<void>;
  fetchFactura: (id: number) => Promise<void>;
  createFactura: (data: CreateFacturaData) => Promise<void>;
  updateFacturaEstado: (id: number, estado: string) => Promise<void>;
  deleteFactura: (id: number) => Promise<void>;
  clearError: () => void;
}

const convertFacturaFromBackend = (factura: any): Factura => ({
  id: factura.id,
  numero: factura.numero,
  clienteId: factura.cliente_id,
  clienteNombre: factura.cliente?.nombre || '',
  fecha: factura.fecha_emision || '',
  fechaVencimiento: factura.fecha_vencimiento || '',
  subtotal: factura.subtotal || 0,
  iva: factura.impuestos || 0,
  total: factura.total || 0,
  estado: factura.estado,
  concepto: factura.notas || '',
});

export const useFacturasStore = create<FacturasState>((set) => ({
  facturas: [],
  facturaActual: null,
  loading: false,
  error: null,

  fetchFacturas: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/facturas/');
      set({ 
        facturas: data.map(convertFacturaFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFactura: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/facturas/${id}`);
      set({ 
        facturaActual: convertFacturaFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createFactura: async (data) => {
    set({ loading: true, error: null });
    try {
      const newFactura = await api.post('/facturas/', {
        cliente_id: data.clienteId,
        fecha_emision: data.fecha,
        fecha_vencimiento: data.fechaVencimiento,
        notas: data.concepto,
        subtotal: data.subtotal,
        impuestos: data.iva || 21,
        total: data.subtotal * (1 + (data.iva || 21) / 100),
      });
      set((state) => ({
        facturas: [...state.facturas, convertFacturaFromBackend(newFactura)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateFacturaEstado: async (id, estado) => {
    set({ loading: true, error: null });
    try {
      const updatedFactura = await api.put(`/facturas/${id}/estado`, { estado });
      set((state) => ({
        facturas: state.facturas.map((f) =>
          f.id === id ? convertFacturaFromBackend(updatedFactura) : f
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteFactura: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/facturas/${id}`);
      set((state) => ({
        facturas: state.facturas.filter((f) => f.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// ==================== DASHBOARD STORE ====================

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/dashboard/stats');
      set({ 
        data: {
          stats: {
            totalClientes: data.totalClientes || 0,
            totalServicios: data.serviciosMes || 0,
            totalFacturado: data.facturacionMes || 0,
            facturasPendientes: 0,
            serviciosPendientes: data.serviciosActivos || 0,
            serviciosEsteMes: data.serviciosMes || 0,
          },
          monthlyData: [],
          ultimosServicios: [],
          facturasPendientes: [],
        },
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));