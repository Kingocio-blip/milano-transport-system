import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Cliente,
  Servicio,
  Factura,
  CreateClienteData,
  UpdateClienteData,
  CreateServicioData,
  UpdateServicioData,
  CreateFacturaData,
  DashboardData,
  LoginCredentials,
  AuthResponse,
} from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => boolean;
}

// Helper para convertir usuario del backend
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
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Error de autenticación');
        }

        const data: AuthResponse = await response.json();
        
        set({
          user: convertUserFromBackend(data.user),
          token: data.access_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
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
  fetchClientes: (token: string) => Promise<void>;
  fetchCliente: (id: number, token: string) => Promise<void>;
  createCliente: (data: CreateClienteData, token: string) => Promise<void>;
  updateCliente: (id: number, data: UpdateClienteData, token: string) => Promise<void>;
  deleteCliente: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir cliente del backend
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
  contacto: {
    id: 0,
    clienteId: cliente.id,
    nombre: '',
    email: cliente.contacto_email || '',
    telefono: cliente.contacto_telefono || '',
    cargo: '',
    principal: true,
  },
  totalServicios: cliente.total_servicios || 0,
  totalFacturado: cliente.total_facturado || 0,
  ultimoServicio: cliente.ultimo_servicio,
});

// Helper para convertir datos al backend
const convertClienteToBackend = (data: CreateClienteData | UpdateClienteData) => {
  const backendData: any = {};
  
  if (data.nombre !== undefined) backendData.nombre = data.nombre;
  if (data.cif !== undefined) backendData.nif = data.cif || null;
  if (data.email !== undefined) backendData.contacto_email = data.email || null;
  if (data.telefono !== undefined) backendData.contacto_telefono = data.telefono || null;
  if (data.direccion !== undefined) backendData.contacto_direccion = data.direccion || null;
  if (data.ciudad !== undefined) backendData.contacto_ciudad = data.ciudad || null;
  if (data.codigoPostal !== undefined) backendData.contacto_codigo_postal = data.codigoPostal || null;
  if (data.formaPago !== undefined) backendData.forma_pago = data.formaPago || null;
  if (data.diasPago !== undefined) backendData.dias_pago = data.diasPago || null;
  if (data.condicionesEspeciales !== undefined) backendData.condiciones_especiales = data.condicionesEspeciales || null;
  if (data.notas !== undefined) backendData.notas = data.notas || null;
  
  // contacto solo existe en CreateClienteData
  if ('contacto' in data && data.contacto !== undefined) {
    backendData.contacto = data.contacto;
  }
  
  return backendData;
};

export const useClientesStore = create<ClientesState>((set) => ({
  clientes: [],
  clienteActual: null,
  loading: false,
  error: null,

  fetchClientes: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar clientes');

      const data = await response.json();
      set({ 
        clientes: data.map(convertClienteFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCliente: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar cliente');

      const data = await response.json();
      set({ 
        clienteActual: convertClienteFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCliente: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertClienteToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear cliente');
      }

      const newCliente = await response.json();
      set((state) => ({
        clientes: [...state.clientes, convertClienteFromBackend(newCliente)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCliente: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertClienteToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar cliente');
      }

      const updatedCliente = await response.json();
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

  deleteCliente: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar cliente');

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
  fetchServicios: (token: string) => Promise<void>;
  fetchServicio: (id: number, token: string) => Promise<void>;
  createServicio: (data: CreateServicioData, token: string) => Promise<void>;
  updateServicio: (id: number, data: UpdateServicioData, token: string) => Promise<void>;
  deleteServicio: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir servicio del backend
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

// Helper para convertir datos al backend
const convertServicioToBackend = (data: CreateServicioData | UpdateServicioData) => {
  const backendData: any = {};
  
  // clienteId solo existe en CreateServicioData
  if ('clienteId' in data && data.clienteId !== undefined) {
    backendData.cliente_id = data.clienteId;
  }
  
  // estado solo existe en UpdateServicioData
  if ('estado' in data && data.estado !== undefined) {
    backendData.estado = data.estado;
  }
  
  // Campos comunes
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

  fetchServicios: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar servicios');

      const data = await response.json();
      set({ 
        servicios: data.map(convertServicioFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServicio: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar servicio');

      const data = await response.json();
      set({ 
        servicioActual: convertServicioFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createServicio: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertServicioToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear servicio');
      }

      const newServicio = await response.json();
      set((state) => ({
        servicios: [...state.servicios, convertServicioFromBackend(newServicio)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateServicio: async (id, data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(convertServicioToBackend(data)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar servicio');
      }

      const updatedServicio = await response.json();
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

  deleteServicio: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/servicios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar servicio');

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
  fetchFacturas: (token: string) => Promise<void>;
  fetchFactura: (id: number, token: string) => Promise<void>;
  createFactura: (data: CreateFacturaData, token: string) => Promise<void>;
  updateFacturaEstado: (id: number, estado: string, token: string) => Promise<void>;
  deleteFactura: (id: number, token: string) => Promise<void>;
  clearError: () => void;
}

// Helper para convertir factura del backend
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

  fetchFacturas: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar facturas');

      const data = await response.json();
      set({ 
        facturas: data.map(convertFacturaFromBackend),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFactura: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar factura');

      const data = await response.json();
      set({ 
        facturaActual: convertFacturaFromBackend(data),
        loading: false 
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createFactura: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cliente_id: data.clienteId,
          fecha_emision: data.fecha,
          fecha_vencimiento: data.fechaVencimiento,
          notas: data.concepto,
          subtotal: data.subtotal,
          impuestos: data.iva || 21,
          total: data.subtotal * (1 + (data.iva || 21) / 100),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al crear factura');
      }

      const newFactura = await response.json();
      set((state) => ({
        facturas: [...state.facturas, convertFacturaFromBackend(newFactura)],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateFacturaEstado: async (id, estado, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado }),
      });

      if (!response.ok) throw new Error('Error al actualizar estado');

      const updatedFactura = await response.json();
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

  deleteFactura: async (id, token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al eliminar factura');

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
  fetchDashboard: (token: string) => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchDashboard: async (token) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar dashboard');

      const data = await response.json();
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