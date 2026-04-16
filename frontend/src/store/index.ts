// ============================================
// MILANO - Sistema de Gestión de Transporte
// Stores Zustand con API Backend (FIX MAPEO DE CAMPOS)
// ============================================

import { create } from 'zustand';
import { localStorageService } from '@/lib/localStorage';
import { clientesApi, vehiculosApi, conductoresApi, serviciosApi, facturasApi, dashboardApi } from '@/lib/api';
import type {
  Cliente,
  Vehiculo,
  Conductor,
  Servicio,
  Factura,
  Alerta,
  Usuario,
  KPIDashboard,
  TipoCliente,
  EstadoVehiculo,
  EstadoConductor,
  EstadoFactura,
  Mantenimiento,
} from '@/types';

// ============================================
// STORE DE CLIENTES
// ============================================
interface ClientesState {
  clientes: Cliente[];
  isLoading: boolean;
  error: string | null;
  clienteSeleccionado: Cliente | null;
  // Acciones
  fetchClientes: () => Promise<void>;
  addCliente: (cliente: any) => Promise<boolean>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;
  seleccionarCliente: (cliente: Cliente | null) => void;
  // Getters
  getClienteById: (id: string) => Cliente | undefined;
  getClientesByTipo: (tipo: TipoCliente) => Cliente[];
  getClientesActivos: () => Cliente[];
}

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  isLoading: false,
  error: null,
  clienteSeleccionado: null,

  fetchClientes: async () => {
    set({ isLoading: true, error: null });
    try {
      const clientes = await clientesApi.getAll();
      // FIX: Mapear correctamente desde snake_case a camelCase
      const clientesFormateados = clientes.map((c: any) => ({
        id: String(c.id),
        codigo: c.codigo,
        tipo: c.tipo,
        nombre: c.nombre,
        razonSocial: c.razon_social,
        nif: c.nif_cif,  // Backend: nif_cif → Frontend: nif
        estado: c.estado,
        formaPago: c.condiciones_pago,
        diasPago: c.dias_pago,
        condicionesEspeciales: c.condiciones_especiales,
        notas: c.notas,
        // Contacto mapeado desde campos planos del backend
        contacto: {
          email: c.email || '',
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          ciudad: c.ciudad || '',
          codigoPostal: c.codigo_postal || '',
        },
        fechaAlta: c.fecha_creacion,
        fechaActualizacion: c.fecha_actualizacion,
      }));
      set({ clientes: clientesFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addCliente: async (cliente) => {
    set({ isLoading: true, error: null });
    try {
      // FIX: Enviar en formato exacto que espera el backend (schemas.py)
      const clienteParaBackend: any = {
        codigo: cliente.codigo,
        nombre: cliente.nombre,
        tipo: cliente.tipo || 'empresa',
        razon_social: null,
        nif_cif: cliente.nif || null,
        estado: cliente.estado || 'activo',
        condiciones_pago: cliente.formaPago || 'transferencia',
        dias_pago: cliente.diasPago || 30,
        condiciones_especiales: cliente.condicionesEspeciales || null,
        notas: cliente.notas || null,
        // Contacto como campos planos
        email: cliente.contacto?.email || null,
        telefono: cliente.contacto?.telefono || null,
        direccion: cliente.contacto?.direccion || null,
        ciudad: cliente.contacto?.ciudad || null,
        codigo_postal: cliente.contacto?.codigoPostal || null,
        pais: 'España',
        // Persona de contacto vacía por ahora
        persona_contacto_nombre: null,
        persona_contacto_email: null,
        persona_contacto_telefono: null,
        persona_contacto_cargo: null,
      };

      const nuevo = await clientesApi.create(clienteParaBackend);
      
      // FIX: Mapear respuesta del backend al formato frontend
      const clienteFormateado: Cliente = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        tipo: nuevo.tipo,
        nombre: nuevo.nombre,
        razonSocial: nuevo.razon_social,
        nif: nuevo.nif_cif,
        estado: nuevo.estado,
        formaPago: nuevo.condiciones_pago,
        diasPago: nuevo.dias_pago,
        condicionesEspeciales: nuevo.condiciones_especiales,
        notas: nuevo.notas,
        contacto: {
          email: nuevo.email || '',
          telefono: nuevo.telefono || '',
          direccion: nuevo.direccion || '',
          ciudad: nuevo.ciudad || '',
          codigoPostal: nuevo.codigo_postal || '',
        },
        fechaAlta: nuevo.fecha_creacion,
        fechaActualizacion: nuevo.fecha_actualizacion,
      };
      
      set((state) => ({ 
        clientes: [...state.clientes, clienteFormateado], 
        isLoading: false 
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateCliente: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Convertir datos del frontend al formato que espera el backend (snake_case)
      const dataParaBackend: any = {};
      
      if (data.nombre !== undefined) dataParaBackend.nombre = data.nombre;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.nif !== undefined) dataParaBackend.nif_cif = data.nif || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.formaPago !== undefined) dataParaBackend.condiciones_pago = data.formaPago;
      if (data.diasPago !== undefined) dataParaBackend.dias_pago = data.diasPago;
      if (data.condicionesEspeciales !== undefined) dataParaBackend.condiciones_especiales = data.condicionesEspeciales || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      
      // Convertir contacto anidado a campos planos snake_case
      if (data.contacto) {
        dataParaBackend.email = data.contacto.email || null;
        dataParaBackend.telefono = data.contacto.telefono || null;
        dataParaBackend.direccion = data.contacto.direccion || null;
        dataParaBackend.ciudad = data.contacto.ciudad || null;
        dataParaBackend.codigo_postal = data.contacto.codigoPostal || null;
      }

      const actualizado = await clientesApi.update(id, dataParaBackend);
      if (actualizado) {
        // FIX: Mapear respuesta al formato frontend
        const clienteFormateado: Cliente = {
          id: String(actualizado.id),
          codigo: actualizado.codigo,
          tipo: actualizado.tipo,
          nombre: actualizado.nombre,
          razonSocial: actualizado.razon_social,
          nif: actualizado.nif_cif,
          estado: actualizado.estado,
          formaPago: actualizado.condiciones_pago,
          diasPago: actualizado.dias_pago,
          condicionesEspeciales: actualizado.condiciones_especiales,
          notas: actualizado.notas,
          contacto: {
            email: actualizado.email || '',
            telefono: actualizado.telefono || '',
            direccion: actualizado.direccion || '',
            ciudad: actualizado.ciudad || '',
            codigoPostal: actualizado.codigo_postal || '',
          },
          fechaAlta: actualizado.fecha_creacion,
          fechaActualizacion: actualizado.fecha_actualizacion,
        };
        set((state) => ({
          clientes: state.clientes.map(c => c.id === id ? clienteFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteCliente: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await clientesApi.delete(id);
      set((state) => ({
        clientes: state.clientes.filter(c => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarCliente: (cliente) => set({ clienteSeleccionado: cliente }),

  getClienteById: (id) => get().clientes.find(c => c.id === id),
  getClientesByTipo: (tipo) => get().clientes.filter(c => c.tipo === tipo),
  getClientesActivos: () => get().clientes.filter(c => c.estado === 'activo'),
}));

// ============================================
// STORE DE VEHÍCULOS (FLOTA)
// ============================================
interface VehiculosState {
  vehiculos: Vehiculo[];
  isLoading: boolean;
  error: string | null;
  vehiculoSeleccionado: Vehiculo | null;
  // Acciones
  fetchVehiculos: () => Promise<void>;
  addVehiculo: (vehiculo: Omit<Vehiculo, 'id' | 'mantenimientos'> & { mantenimientos?: Mantenimiento[] }) => Promise<boolean>;
  updateVehiculo: (id: string, data: Partial<Vehiculo>) => Promise<boolean>;
  deleteVehiculo: (id: string) => Promise<boolean>;
  seleccionarVehiculo: (vehiculo: Vehiculo | null) => void;
  addMantenimiento: (vehiculoId: string, mantenimiento: any) => void;
  // Getters
  getVehiculoById: (id: string) => Vehiculo | undefined;
  getVehiculosByEstado: (estado: EstadoVehiculo) => Vehiculo[];
  getVehiculosOperativos: () => Vehiculo[];
  getVehiculosConITVProxima: () => Vehiculo[];
  getVehiculosConSeguroProximo: () => Vehiculo[];
}

export const useVehiculosStore = create<VehiculosState>((set, get) => ({
  vehiculos: [],
  isLoading: false,
  error: null,
  vehiculoSeleccionado: null,

  fetchVehiculos: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehiculos = await vehiculosApi.getAll();
      // FIX: Mapear desde snake_case a camelCase según schemas.py
      const vehiculosFormateados = vehiculos.map((v: any) => ({
        id: String(v.id),
        codigo: v.codigo,
        matricula: v.matricula,
        tipo: v.tipo,
        marca: v.marca,
        modelo: v.modelo,
        annoFabricacion: v.anno_fabricacion,
        capacidadKg: v.capacidad_kg,
        volumenM3: v.volumen_m3,
        longitudM: v.longitud_m,
        estado: v.estado,
        fechaAdquisicion: v.fecha_adquisicion,
        notas: v.notas,
        // ITV mapeada
        itv: {
          fechaVencimiento: v.fecha_vencimiento_itv,
          numPolizaSeguro: v.num_poliza_seguro,
        },
        // Seguro mapeado
        seguro: {
          fechaVencimiento: v.fecha_vencimiento_seguro,
        },
        mantenimientos: v.mantenimientos || [],
      }));
      set({ vehiculos: vehiculosFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addVehiculo: async (vehiculo) => {
    set({ isLoading: true, error: null });
    try {
      // FIX: Mapear a snake_case según schemas.py
      const vehiculoParaBackend: any = {
        codigo: vehiculo.codigo,
        matricula: vehiculo.matricula,
        tipo: vehiculo.tipo || 'camion',
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anno_fabricacion: vehiculo.annoFabricacion || null,
        capacidad_kg: vehiculo.capacidadKg || null,
        volumen_m3: vehiculo.volumenM3 || null,
        longitud_m: vehiculo.longitudM || null,
        estado: vehiculo.estado || 'activo',
        fecha_adquisicion: vehiculo.fechaAdquisicion || null,
        notas: vehiculo.notas || null,
        // ITV
        fecha_vencimiento_itv: vehiculo.itv?.fechaVencimiento || null,
        num_poliza_seguro: vehiculo.itv?.numPolizaSeguro || null,
        // Seguro
        fecha_vencimiento_seguro: vehiculo.seguro?.fechaVencimiento || null,
      };

      const nuevo = await vehiculosApi.create(vehiculoParaBackend);
      
      // FIX: Mapear respuesta a camelCase
      const vehiculoFormateado: Vehiculo = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        matricula: nuevo.matricula,
        tipo: nuevo.tipo,
        marca: nuevo.marca,
        modelo: nuevo.modelo,
        annoFabricacion: nuevo.anno_fabricacion,
        capacidadKg: nuevo.capacidad_kg,
        volumenM3: nuevo.volumen_m3,
        longitudM: nuevo.longitud_m,
        estado: nuevo.estado,
        fechaAdquisicion: nuevo.fecha_adquisicion,
        notas: nuevo.notas,
        itv: {
          fechaVencimiento: nuevo.fecha_vencimiento_itv,
          numPolizaSeguro: nuevo.num_poliza_seguro,
        },
        seguro: {
          fechaVencimiento: nuevo.fecha_vencimiento_seguro,
        },
        mantenimientos: nuevo.mantenimientos || [],
      };
      
      set((state) => ({ vehiculos: [...state.vehiculos, vehiculoFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateVehiculo: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const dataParaBackend: any = {};
      
      if (data.matricula !== undefined) dataParaBackend.matricula = data.matricula;
      if (data.marca !== undefined) dataParaBackend.marca = data.marca;
      if (data.modelo !== undefined) dataParaBackend.modelo = data.modelo;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.annoFabricacion !== undefined) dataParaBackend.anno_fabricacion = data.annoFabricacion || null;
      if (data.capacidadKg !== undefined) dataParaBackend.capacidad_kg = data.capacidadKg || null;
      if (data.volumenM3 !== undefined) dataParaBackend.volumen_m3 = data.volumenM3 || null;
      if (data.longitudM !== undefined) dataParaBackend.longitud_m = data.longitudM || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.fechaAdquisicion !== undefined) dataParaBackend.fecha_adquisicion = data.fechaAdquisicion || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      
      // ITV
      if (data.itv) {
        dataParaBackend.fecha_vencimiento_itv = data.itv.fechaVencimiento || null;
        dataParaBackend.num_poliza_seguro = data.itv.numPolizaSeguro || null;
      }
      
      // Seguro
      if (data.seguro) {
        dataParaBackend.fecha_vencimiento_seguro = data.seguro.fechaVencimiento || null;
      }

      const actualizado = await vehiculosApi.update(id, dataParaBackend);
      if (actualizado) {
        const vehiculoFormateado: Vehiculo = {
          id: String(actualizado.id),
          codigo: actualizado.codigo,
          matricula: actualizado.matricula,
          tipo: actualizado.tipo,
          marca: actualizado.marca,
          modelo: actualizado.modelo,
          annoFabricacion: actualizado.anno_fabricacion,
          capacidadKg: actualizado.capacidad_kg,
          volumenM3: actualizado.volumen_m3,
          longitudM: actualizado.longitud_m,
          estado: actualizado.estado,
          fechaAdquisicion: actualizado.fecha_adquisicion,
          notas: actualizado.notas,
          itv: {
            fechaVencimiento: actualizado.fecha_vencimiento_itv,
            numPolizaSeguro: actualizado.num_poliza_seguro,
          },
          seguro: {
            fechaVencimiento: actualizado.fecha_vencimiento_seguro,
          },
          mantenimientos: actualizado.mantenimientos || [],
        };
        set((state) => ({
          vehiculos: state.vehiculos.map(v => v.id === id ? vehiculoFormateado : v),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteVehiculo: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await vehiculosApi.delete(id);
      set((state) => ({
        vehiculos: state.vehiculos.filter(v => v.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarVehiculo: (vehiculo) => set({ vehiculoSeleccionado: vehiculo }),

  addMantenimiento: (vehiculoId, mantenimiento) => {
    const vehiculo = get().vehiculos.find(v => v.id === vehiculoId);
    if (vehiculo) {
      const actualizado = {
        ...vehiculo,
        mantenimientos: [...(vehiculo.mantenimientos || []), mantenimiento],
      };
      localStorageService.vehiculos.update(vehiculoId, actualizado);
      set((state) => ({
        vehiculos: state.vehiculos.map(v => v.id === vehiculoId ? actualizado : v),
      }));
    }
  },

  getVehiculoById: (id) => get().vehiculos.find(v => v.id === id),
  getVehiculosByEstado: (estado) => get().vehiculos.filter(v => v.estado === estado),
  getVehiculosOperativos: () => get().vehiculos.filter(v => v.estado === 'activo'),
  getVehiculosConITVProxima: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().vehiculos.filter(v => {
      const fechaProxima = new Date(v.itv?.fechaVencimiento || '');
      return fechaProxima <= treintaDias && fechaProxima >= hoy;
    });
  },
  getVehiculosConSeguroProximo: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().vehiculos.filter(v => {
      const fechaVenc = new Date(v.seguro?.fechaVencimiento || '');
      return fechaVenc <= treintaDias && fechaVenc >= hoy;
    });
  },
}));

// ============================================
// STORE DE CONDUCTORES
// ============================================
interface ConductoresState {
  conductores: Conductor[];
  isLoading: boolean;
  error: string | null;
  conductorSeleccionado: Conductor | null;
  // Acciones
  fetchConductores: () => Promise<void>;
  addConductor: (conductor: any) => Promise<boolean>;
  updateConductor: (id: string, data: Partial<Conductor>) => Promise<boolean>;
  deleteConductor: (id: string) => Promise<boolean>;
  seleccionarConductor: (conductor: Conductor | null) => void;
  // Getters
  getConductorById: (id: string) => Conductor | undefined;
  getConductoresByEstado: (estado: EstadoConductor) => Conductor[];
  getConductoresDisponibles: () => Conductor[];
  getConductoresConLicenciaProxima: () => Conductor[];
}

export const useConductoresStore = create<ConductoresState>((set, get) => ({
  conductores: [],
  isLoading: false,
  error: null,
  conductorSeleccionado: null,

  fetchConductores: async () => {
    set({ isLoading: true, error: null });
    try {
      const conductores = await conductoresApi.getAll();
      // FIX: Mapear desde snake_case a camelCase según schemas.py
      const conductoresFormateados = conductores.map((c: any) => ({
        id: String(c.id),
        codigo: c.codigo,
        nombre: c.nombre,
        apellidos: c.apellidos,
        dni: c.dni,
        fechaNacimiento: c.fecha_nacimiento,
        telefono: c.telefono,
        email: c.email,
        direccion: c.direccion,
        estado: c.estado,
        fechaContratacion: c.fecha_contratacion,
        notas: c.notas,
        // Licencia mapeada
        licencia: {
          tipo: c.licencia_tipo,
          numero: c.licencia_numero,
          fechaExpedicion: c.licencia_fecha_expedicion,
          fechaCaducidad: c.licencia_fecha_caducidad,
        },
        fechaAlta: c.fecha_creacion,
        fechaActualizacion: c.fecha_actualizacion,
      }));
      set({ conductores: conductoresFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addConductor: async (conductor) => {
    set({ isLoading: true, error: null });
    try {
      // FIX: Mapear a snake_case según schemas.py
      const conductorParaBackend: any = {
        codigo: conductor.codigo,
        nombre: conductor.nombre,
        apellidos: conductor.apellidos,
        dni: conductor.dni,
        fecha_nacimiento: conductor.fechaNacimiento || null,
        telefono: conductor.telefono || null,
        email: conductor.email || null,
        direccion: conductor.direccion || null,
        estado: conductor.estado || 'activo',
        fecha_contratacion: conductor.fechaContratacion || null,
        notas: conductor.notas || null,
        // Licencia
        licencia_tipo: conductor.licencia?.tipo || null,
        licencia_numero: conductor.licencia?.numero || null,
        licencia_fecha_expedicion: conductor.licencia?.fechaExpedicion || null,
        licencia_fecha_caducidad: conductor.licencia?.fechaCaducidad || null,
      };

      const nuevo = await conductoresApi.create(conductorParaBackend);
      
      // FIX: Mapear respuesta a camelCase
      const conductorFormateado: Conductor = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        nombre: nuevo.nombre,
        apellidos: nuevo.apellidos,
        dni: nuevo.dni,
        fechaNacimiento: nuevo.fecha_nacimiento,
        telefono: nuevo.telefono,
        email: nuevo.email,
        direccion: nuevo.direccion,
        estado: nuevo.estado,
        fechaContratacion: nuevo.fecha_contratacion,
        notas: nuevo.notas,
        licencia: {
          tipo: nuevo.licencia_tipo,
          numero: nuevo.licencia_numero,
          fechaExpedicion: nuevo.licencia_fecha_expedicion,
          fechaCaducidad: nuevo.licencia_fecha_caducidad,
        },
        fechaAlta: nuevo.fecha_creacion,
        fechaActualizacion: nuevo.fecha_actualizacion,
      };
      
      set((state) => ({ conductores: [...state.conductores, conductorFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateConductor: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const dataParaBackend: any = {};
      
      if (data.nombre !== undefined) dataParaBackend.nombre = data.nombre;
      if (data.apellidos !== undefined) dataParaBackend.apellidos = data.apellidos;
      if (data.dni !== undefined) dataParaBackend.dni = data.dni;
      if (data.fechaNacimiento !== undefined) dataParaBackend.fecha_nacimiento = data.fechaNacimiento || null;
      if (data.telefono !== undefined) dataParaBackend.telefono = data.telefono || null;
      if (data.email !== undefined) dataParaBackend.email = data.email || null;
      if (data.direccion !== undefined) dataParaBackend.direccion = data.direccion || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.fechaContratacion !== undefined) dataParaBackend.fecha_contratacion = data.fechaContratacion || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;
      
      // Licencia
      if (data.licencia) {
        dataParaBackend.licencia_tipo = data.licencia.tipo || null;
        dataParaBackend.licencia_numero = data.licencia.numero || null;
        dataParaBackend.licencia_fecha_expedicion = data.licencia.fechaExpedicion || null;
        dataParaBackend.licencia_fecha_caducidad = data.licencia.fechaCaducidad || null;
      }

      const actualizado = await conductoresApi.update(id, dataParaBackend);
      if (actualizado) {
        const conductorFormateado: Conductor = {
          id: String(actualizado.id),
          codigo: actualizado.codigo,
          nombre: actualizado.nombre,
          apellidos: actualizado.apellidos,
          dni: actualizado.dni,
          fechaNacimiento: actualizado.fecha_nacimiento,
          telefono: actualizado.telefono,
          email: actualizado.email,
          direccion: actualizado.direccion,
          estado: actualizado.estado,
          fechaContratacion: actualizado.fecha_contratacion,
          notas: actualizado.notas,
          licencia: {
            tipo: actualizado.licencia_tipo,
            numero: actualizado.licencia_numero,
            fechaExpedicion: actualizado.licencia_fecha_expedicion,
            fechaCaducidad: actualizado.licencia_fecha_caducidad,
          },
          fechaAlta: actualizado.fecha_creacion,
          fechaActualizacion: actualizado.fecha_actualizacion,
        };
        set((state) => ({
          conductores: state.conductores.map(c => c.id === id ? conductorFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteConductor: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await conductoresApi.delete(id);
      set((state) => ({
        conductores: state.conductores.filter(c => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarConductor: (conductor) => set({ conductorSeleccionado: conductor }),

  getConductorById: (id) => get().conductores.find(d => d.id === id),
  getConductoresByEstado: (estado) => get().conductores.filter(d => d.estado === estado),
  getConductoresDisponibles: () => get().conductores.filter(d => d.estado === 'activo'),
  getConductoresConLicenciaProxima: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().conductores.filter(c => {
      const fechaCaducidad = new Date(c.licencia?.fechaCaducidad || '');
      return fechaCaducidad <= treintaDias && fechaCaducidad >= hoy;
    });
  },
}));

// ============================================
// STORE DE SERVICIOS
// ============================================
interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  error: string | null;
  servicioSeleccionado: Servicio | null;
  // Acciones
  fetchServicios: () => Promise<void>;
  addServicio: (servicio: any) => Promise<boolean>;
  updateServicio: (id: string, data: Partial<Servicio>) => Promise<boolean>;
  deleteServicio: (id: string) => Promise<boolean>;
  seleccionarServicio: (servicio: Servicio | null) => void;
  addIncidencia: (servicioId: string, incidencia: any) => void;
  updateTarea: (servicioId: string, tareaId: string, completada: boolean) => void;
  // Getters
  getServicioById: (id: string) => Servicio | undefined;
  getServiciosByEstado: (estado: string) => Servicio[];
  getServiciosByCliente: (clienteId: string) => Servicio[];
  getServiciosHoy: () => Servicio[];
  getServiciosPendientesFacturar: () => Servicio[];
}

export const useServiciosStore = create<ServiciosState>((set, get) => ({
  servicios: [],
  isLoading: false,
  error: null,
  servicioSeleccionado: null,

  fetchServicios: async () => {
    set({ isLoading: true, error: null });
    try {
      const servicios = await serviciosApi.getAll();
      // FIX: Mapear desde snake_case a camelCase
      const serviciosFormateados = servicios.map((s: any) => ({
        id: String(s.id),
        codigo: s.codigo,
        clienteId: String(s.cliente_id),
        clienteNombre: s.cliente_nombre,
        tipo: s.tipo,
        estado: s.estado,
        titulo: s.titulo,
        descripcion: s.descripcion,
        fechaInicio: s.fecha_inicio,
        fechaFin: s.fecha_fin,
        horaInicio: s.hora_inicio,
        horaFin: s.hora_fin,
        numeroVehiculos: s.numero_vehiculos,
        vehiculosAsignados: s.vehiculos_asignados || [],
        conductoresAsignados: s.conductores_asignados || [],
        origen: s.origen,
        destino: s.destino,
        ubicacionEvento: s.ubicacion_evento,
        costeEstimado: s.coste_estimado,
        costeReal: s.coste_real,
        precio: s.precio,
        facturado: s.facturado,
        facturaId: s.factura_id,
        notasInternas: s.notas_internas,
        notasCliente: s.notas_cliente,
        fechaCreacion: s.fecha_creacion,
        fechaModificacion: s.fecha_modificacion,
        creadoPor: s.creado_por,
      }));
      set({ servicios: serviciosFormateados, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addServicio: async (servicio) => {
    set({ isLoading: true, error: null });
    try {
      // FIX: Mapear a snake_case
      const servicioParaBackend: any = {
        cliente_id: servicio.clienteId,
        tipo: servicio.tipo,
        estado: servicio.estado || 'planificando',
        titulo: servicio.titulo,
        descripcion: servicio.descripcion || null,
        fecha_inicio: servicio.fechaInicio,
        fecha_fin: servicio.fechaFin || null,
        hora_inicio: servicio.horaInicio || null,
        hora_fin: servicio.horaFin || null,
        numero_vehiculos: servicio.numeroVehiculos || 1,
        vehiculos_asignados: servicio.vehiculosAsignados || [],
        conductores_asignados: servicio.conductoresAsignados || [],
        origen: servicio.origen || null,
        destino: servicio.destino || null,
        ubicacion_evento: servicio.ubicacionEvento || null,
        coste_estimado: servicio.costeEstimado || 0,
        coste_real: servicio.costeReal || null,
        precio: servicio.precio || 0,
        facturado: servicio.facturado || false,
        factura_id: servicio.facturaId || null,
        notas_internas: servicio.notasInternas || null,
        notas_cliente: servicio.notasCliente || null,
      };

      const nuevo = await serviciosApi.create(servicioParaBackend);
      
      // FIX: Mapear respuesta a camelCase
      const servicioFormateado: Servicio = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        clienteId: String(nuevo.cliente_id),
        clienteNombre: nuevo.cliente_nombre,
        tipo: nuevo.tipo,
        estado: nuevo.estado,
        titulo: nuevo.titulo,
        descripcion: nuevo.descripcion,
        fechaInicio: nuevo.fecha_inicio,
        fechaFin: nuevo.fecha_fin,
        horaInicio: nuevo.hora_inicio,
        horaFin: nuevo.hora_fin,
        numeroVehiculos: nuevo.numero_vehiculos,
        vehiculosAsignados: nuevo.vehiculos_asignados || [],
        conductoresAsignados: nuevo.conductores_asignados || [],
        origen: nuevo.origen,
        destino: nuevo.destino,
        ubicacionEvento: nuevo.ubicacion_evento,
        costeEstimado: nuevo.coste_estimado,
        costeReal: nuevo.coste_real,
        precio: nuevo.precio,
        facturado: nuevo.facturado,
        facturaId: nuevo.factura_id,
        notasInternas: nuevo.notas_internas,
        notasCliente: nuevo.notas_cliente,
        fechaCreacion: nuevo.fecha_creacion,
        fechaModificacion: nuevo.fecha_modificacion,
        creadoPor: nuevo.creado_por,
      };
      
      set((state) => ({ servicios: [...state.servicios, servicioFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateServicio: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const dataParaBackend: any = {};
      
      if (data.clienteId !== undefined) dataParaBackend.cliente_id = data.clienteId;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.titulo !== undefined) dataParaBackend.titulo = data.titulo;
      if (data.descripcion !== undefined) dataParaBackend.descripcion = data.descripcion || null;
      if (data.fechaInicio !== undefined) dataParaBackend.fecha_inicio = data.fechaInicio;
      if (data.fechaFin !== undefined) dataParaBackend.fecha_fin = data.fechaFin || null;
      if (data.horaInicio !== undefined) dataParaBackend.hora_inicio = data.horaInicio || null;
      if (data.horaFin !== undefined) dataParaBackend.hora_fin = data.horaFin || null;
      if (data.numeroVehiculos !== undefined) dataParaBackend.numero_vehiculos = data.numeroVehiculos;
      if (data.vehiculosAsignados !== undefined) dataParaBackend.vehiculos_asignados = data.vehiculosAsignados;
      if (data.conductoresAsignados !== undefined) dataParaBackend.conductores_asignados = data.conductoresAsignados;
      if (data.origen !== undefined) dataParaBackend.origen = data.origen || null;
      if (data.destino !== undefined) dataParaBackend.destino = data.destino || null;
      if (data.ubicacionEvento !== undefined) dataParaBackend.ubicacion_evento = data.ubicacionEvento || null;
      if (data.costeEstimado !== undefined) dataParaBackend.coste_estimado = data.costeEstimado;
      if (data.costeReal !== undefined) dataParaBackend.coste_real = data.costeReal || null;
      if (data.precio !== undefined) dataParaBackend.precio = data.precio;
      if (data.facturado !== undefined) dataParaBackend.facturado = data.facturado;
      if (data.facturaId !== undefined) dataParaBackend.factura_id = data.facturaId || null;
      if (data.notasInternas !== undefined) dataParaBackend.notas_internas = data.notasInternas || null;
      if (data.notasCliente !== undefined) dataParaBackend.notas_cliente = data.notasCliente || null;

      const actualizado = await serviciosApi.update(id, dataParaBackend);
      if (actualizado) {
        const servicioFormateado: Servicio = {
          id: String(actualizado.id),
          codigo: actualizado.codigo,
          clienteId: String(actualizado.cliente_id),
          clienteNombre: actualizado.cliente_nombre,
          tipo: actualizado.tipo,
          estado: actualizado.estado,
          titulo: actualizado.titulo,
          descripcion: actualizado.descripcion,
          fechaInicio: actualizado.fecha_inicio,
          fechaFin: actualizado.fecha_fin,
          horaInicio: actualizado.hora_inicio,
          horaFin: actualizado.hora_fin,
          numeroVehiculos: actualizado.numero_vehiculos,
          vehiculosAsignados: actualizado.vehiculos_asignados || [],
          conductoresAsignados: actualizado.conductores_asignados || [],
          origen: actualizado.origen,
          destino: actualizado.destino,
          ubicacionEvento: actualizado.ubicacion_evento,
          costeEstimado: actualizado.coste_estimado,
          costeReal: actualizado.coste_real,
          precio: actualizado.precio,
          facturado: actualizado.facturado,
          facturaId: actualizado.factura_id,
          notasInternas: actualizado.notas_internas,
          notasCliente: actualizado.notas_cliente,
          fechaCreacion: actualizado.fecha_creacion,
          fechaModificacion: actualizado.fecha_modificacion,
          creadoPor: actualizado.creado_por,
        };
        set((state) => ({
          servicios: state.servicios.map(s => s.id === id ? servicioFormateado : s),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteServicio: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await serviciosApi.delete(id);
      set((state) => ({
        servicios: state.servicios.filter(s => s.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarServicio: (servicio) => set({ servicioSeleccionado: servicio }),

  addIncidencia: (servicioId, incidencia) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (servicio) {
      const actualizado = {
        ...servicio,
        incidencias: [...(servicio.incidencias || []), incidencia],
      };
      localStorageService.servicios.update(servicioId, actualizado);
      set((state) => ({
        servicios: state.servicios.map(s => s.id === servicioId ? actualizado : s),
      }));
    }
  },

  updateTarea: (servicioId, tareaId, completada) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (servicio) {
      const tareasActualizadas = servicio.tareas?.map(t =>
        t.id === tareaId
          ? { ...t, completada, fechaCompletada: completada ? new Date().toISOString() : undefined }
          : t
      ) || [];
      const actualizado = { ...servicio, tareas: tareasActualizadas };
      localStorageService.servicios.update(servicioId, actualizado);
      set((state) => ({
        servicios: state.servicios.map(s => s.id === servicioId ? actualizado : s),
      }));
    }
  },

  getServicioById: (id) => get().servicios.find(s => s.id === id),
  getServiciosByEstado: (estado) => get().servicios.filter(s => s.estado === estado),
  getServiciosByCliente: (clienteId) => get().servicios.filter(s => s.clienteId === clienteId),
  getServiciosHoy: () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return get().servicios.filter(s => {
      const fecha = new Date(s.fechaInicio);
      return fecha.toDateString() === hoy.toDateString();
    });
  },
  getServiciosPendientesFacturar: () => get().servicios.filter(s =>
    s.estado === 'completado' && !s.facturado
  ),
}));

// ============================================
// STORE DE FACTURAS
// ============================================
interface FacturasState {
  facturas: Factura[];
  isLoading: boolean;
  error: string | null;
  facturaSeleccionada: Factura | null;
  // Acciones
  fetchFacturas: () => Promise<void>;
  addFactura: (factura: Omit<Factura, 'id' | 'numero' | 'fechaEmision'>) => Promise<boolean>;
  updateFactura: (id: string, data: Partial<Factura>) => Promise<boolean>;
  deleteFactura: (id: string) => Promise<boolean>;
  marcarPagada: (id: string) => Promise<boolean>;
  seleccionarFactura: (factura: Factura | null) => void;
  // Getters
  getFacturaById: (id: string) => Factura | undefined;
  getFacturasByEstado: (estado: EstadoFactura) => Factura[];
  getFacturasByCliente: (clienteId: string) => Factura[];
  getFacturasPendientes: () => Factura[];
  getFacturasVencidas: () => Factura[];
  getTotalFacturadoMes: () => number;
  getTotalPendiente: () => number;
}

export const useFacturasStore = create<FacturasState>((set, get) => ({
  facturas: [],
  isLoading: false,
  error: null,
  facturaSeleccionada: null,

  fetchFacturas: async () => {
    set({ isLoading: true, error: null });
    try {
      const facturas = localStorageService.facturas.getAll();
      set({ facturas, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addFactura: async (factura) => {
    set({ isLoading: true, error: null });
    try {
      const nueva = localStorageService.facturas.create(factura);
      set((state) => ({ facturas: [...state.facturas, nueva], isLoading: false }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateFactura: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const actualizado = localStorageService.facturas.update(id, data);
      if (actualizado) {
        set((state) => ({
          facturas: state.facturas.map(f => f.id === id ? actualizado : f),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteFactura: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const eliminado = localStorageService.facturas.delete(id);
      if (eliminado) {
        set((state) => ({
          facturas: state.facturas.filter(f => f.id !== id),
          isLoading: false,
        }));
      }
      return eliminado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  marcarPagada: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const actualizado = localStorageService.facturas.update(id, {
        estado: 'pagada',
        fechaPago: new Date().toISOString(),
      });
      if (actualizado) {
        set((state) => ({
          facturas: state.facturas.map(f => f.id === id ? actualizado : f),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  seleccionarFactura: (factura) => set({ facturaSeleccionada: factura }),

  getFacturaById: (id) => get().facturas.find(f => f.id === id),
  getFacturasByEstado: (estado) => get().facturas.filter(f => f.estado === estado),
  getFacturasByCliente: (clienteId) => get().facturas.filter(f => f.clienteId === clienteId),
  getFacturasPendientes: () => get().facturas.filter(f =>
    f.estado === 'pendiente' || f.estado === 'enviada'
  ),
  getFacturasVencidas: () => {
    const hoy = new Date();
    return get().facturas.filter(f => {
      if (f.estado === 'pagada' || f.estado === 'anulada') return false;
      const fechaVenc = new Date(f.fechaVencimiento);
      return fechaVenc < hoy;
    });
  },
  getTotalFacturadoMes: () => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return get().facturas
      .filter(f => {
        if (f.estado !== 'pagada') return false;
        const fechaPago = f.fechaPago ? new Date(f.fechaPago) : null;
        return fechaPago && fechaPago >= inicioMes;
      })
      .reduce((sum, f) => sum + (f.total || 0), 0);
  },
  getTotalPendiente: () => get().facturas
    .filter(f => f.estado === 'pendiente' || f.estado === 'enviada')
    .reduce((sum, f) => sum + (f.total || 0), 0),
}));

// ============================================
// STORE DE ALERTAS
// ============================================
interface AlertasState {
  alertas: Alerta[];
  isLoading: boolean;
  error: string | null;
  // Acciones
  fetchAlertas: () => Promise<void>;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  getAlertasNoLeidas: () => Alerta[];
  deleteAlerta: (id: string) => void;
}

export const useAlertasStore = create<AlertasState>((set, get) => ({
  alertas: [],
  isLoading: false,
  error: null,

  fetchAlertas: async () => {
    // Generar alertas dinámicamente basadas en datos
    const vehiculos = localStorageService.vehiculos.getAll();
    const conductores = localStorageService.conductores.getAll();
    const facturas = localStorageService.facturas.getAll();
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alertas: Alerta[] = [];

    // Alertas de ITV
    vehiculos.forEach(v => {
      const fechaITV = new Date(v.itv?.fechaVencimiento || '');
      if (fechaITV <= treintaDias && fechaITV >= hoy) {
        alertas.push({
          id: `alert-itv-${v.id}`,
          tipo: 'itv',
          severidad: 'warning',
          titulo: `ITV próxima - ${v.matricula}`,
          mensaje: `El vehículo ${v.marca} ${v.modelo} (${v.matricula}) tiene la ITV próxima a vencer.`,
          entidadId: v.id,
          entidadTipo: 'vehiculo',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: v.itv?.fechaVencimiento,
          leida: false,
          accion: 'Ver vehículo',
          accionUrl: `/flota`,
        });
      }
    });

    // Alertas de seguros
    vehiculos.forEach(v => {
      const fechaSeguro = new Date(v.seguro?.fechaVencimiento || '');
      if (fechaSeguro <= treintaDias && fechaSeguro >= hoy) {
        alertas.push({
          id: `alert-seguro-${v.id}`,
          tipo: 'seguro',
          severidad: 'warning',
          titulo: `Seguro próximo - ${v.matricula}`,
          mensaje: `El seguro del vehículo ${v.marca} ${v.modelo} (${v.matricula}) está próximo a vencer.`,
          entidadId: v.id,
          entidadTipo: 'vehiculo',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: v.seguro?.fechaVencimiento,
          leida: false,
          accion: 'Ver vehículo',
          accionUrl: `/flota`,
        });
      }
    });

    // Alertas de licencias
    conductores.forEach(c => {
      const fechaLicencia = new Date(c.licencia?.fechaCaducidad || '');
      if (fechaLicencia <= treintaDias && fechaLicencia >= hoy) {
        alertas.push({
          id: `alert-licencia-${c.id}`,
          tipo: 'licencia',
          severidad: 'warning',
          titulo: `Licencia próxima - ${c.nombre} ${c.apellidos}`,
          mensaje: `La licencia de ${c.nombre} ${c.apellidos} está próxima a caducar.`,
          entidadId: c.id,
          entidadTipo: 'conductor',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: c.licencia?.fechaCaducidad,
          leida: false,
          accion: 'Ver conductor',
          accionUrl: `/conductores`,
        });
      }
    });

    // Alertas de facturas vencidas
    facturas.forEach(f => {
      if ((f.estado === 'pendiente' || f.estado === 'enviada') && f.fechaVencimiento) {
        const fechaVenc = new Date(f.fechaVencimiento);
        if (fechaVenc < hoy) {
          alertas.push({
            id: `alert-factura-${f.id}`,
            tipo: 'factura',
            severidad: 'error',
            titulo: `Factura vencida - ${f.numero}`,
            mensaje: `La factura ${f.numero} de ${f.clienteNombre} está vencida.`,
            entidadId: f.id,
            entidadTipo: 'factura',
            fechaCreacion: new Date().toISOString(),
            leida: false,
            accion: 'Ver factura',
            accionUrl: `/facturacion`,
          });
        }
      }
    });

    set({ alertas, isLoading: false });
  },

  marcarLeida: (id) => {
    set((state) => ({
      alertas: state.alertas.map(a => a.id === id ? { ...a, leida: true } : a)
    }));
  },

  marcarTodasLeidas: () => {
    set((state) => ({
      alertas: state.alertas.map(a => ({ ...a, leida: true }))
    }));
  },

  getAlertasNoLeidas: () => get().alertas.filter(a => !a.leida),

  deleteAlerta: (id) => {
    set((state) => ({
      alertas: state.alertas.filter(a => a.id !== id)
    }));
  },
}));

// ============================================
// STORE DE OPORTUNIDADES (CRM)
// ============================================
interface OportunidadesState {
  oportunidades: any[];
  isLoading: boolean;
  error: string | null;
  // Acciones
  fetchOportunidades: () => Promise<void>;
  addOportunidad: (oportunidad: any) => Promise<boolean>;
  updateOportunidad: (id: string, data: any) => Promise<boolean>;
  deleteOportunidad: (id: string) => Promise<boolean>;
}

export const useOportunidadesStore = create<OportunidadesState>((set, get) => ({
  oportunidades: [],
  isLoading: false,
  error: null,

  fetchOportunidades: async () => {
    set({ isLoading: true, error: null });
    try {
      // Datos de ejemplo de oportunidades
      const oportunidades = [
        {
          id: 'o1',
          codigo: 'OPP001',
          titulo: 'Primavera Sound 2025',
          clienteId: 'c1',
          clienteNombre: 'Festival de Música de Barcelona',
          tipoServicio: 'lanzadera',
          descripcion: 'Servicio de lanzaderas para el festival Primavera Sound. 5 días de servicio.',
          fechaEvento: '2025-06-01T00:00:00.000Z',
          ubicacion: 'Barcelona',
          presupuestoEstimado: 45000,
          estado: 'negociacion',
          probabilidad: 75,
          fechaCreacion: '2024-11-15T00:00:00.000Z',
          fechaCierreEstimada: '2025-02-01T00:00:00.000Z',
          asignadoA: 'Juan García',
        },
        {
          id: 'o2',
          codigo: 'OPP002',
          titulo: 'Gira de Verano - Sala Razzmatazz',
          clienteId: 'c2',
          clienteNombre: 'Sala Razzmatazz',
          tipoServicio: 'staff',
          descripcion: 'Transporte de staff y artistas durante la gira de verano.',
          fechaEvento: '2025-07-15T00:00:00.000Z',
          presupuestoEstimado: 12000,
          estado: 'presupuesto_enviado',
          probabilidad: 50,
          fechaCreacion: '2024-12-01T00:00:00.000Z',
          fechaCierreEstimada: '2025-01-15T00:00:00.000Z',
          asignadoA: 'María López',
        },
        {
          id: 'o3',
          codigo: 'OPP003',
          titulo: 'Excursión Fin de Curso',
          clienteId: 'c3',
          clienteNombre: 'Colegio Internacional de Madrid',
          tipoServicio: 'discrecional',
          descripcion: 'Viaje fin de curso a Valencia. 3 autobuses, 2 días.',
          fechaEvento: '2025-06-20T00:00:00.000Z',
          ubicacion: 'Valencia',
          presupuestoEstimado: 8500,
          estado: 'nueva',
          probabilidad: 25,
          fechaCreacion: '2024-12-10T00:00:00.000Z',
          asignadoA: 'Juan García',
        },
        {
          id: 'o4',
          codigo: 'OPP004',
          titulo: 'Traslados Obra Nueva Plant',
          clienteId: 'c4',
          clienteNombre: 'Empresa Constructora del Norte',
          tipoServicio: 'ruta_programada',
          descripcion: 'Ruta diaria de traslado de trabajadores a la nueva planta industrial.',
          fechaEvento: '2025-01-15T00:00:00.000Z',
          presupuestoEstimado: 28000,
          estado: 'ganada',
          probabilidad: 100,
          fechaCreacion: '2024-10-20T00:00:00.000Z',
          fechaCierreReal: '2024-11-20T00:00:00.000Z',
          asignadoA: 'Pedro Martínez',
        },
      ];
      set({ oportunidades, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addOportunidad: async (oportunidad) => {
    set({ isLoading: true, error: null });
    try {
      const nuevo = { ...oportunidad, id: `opp${Date.now()}` };
      set((state) => ({
        oportunidades: [...state.oportunidades, nuevo],
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateOportunidad: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      set((state) => ({
        oportunidades: state.oportunidades.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteOportunidad: async (id) => {
    set({ isLoading: true, error: null });
    try {
      set((state) => ({
        oportunidades: state.oportunidades.filter(o => o.id !== id),
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },
}));

// ============================================
// STORE DE UI
// ============================================
interface UIState {
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalContent: string | null;
  toast: {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
  // Acciones
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (content: string) => void;
  closeModal: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  modalOpen: false,
  modalContent: null,
  toast: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),
  showToast: (message, type) => set({
    toast: { show: true, message, type }
  }),
  hideToast: () => set({ toast: null }),
}));

// ============================================
// STORE DE USUARIO
// ============================================
interface UsuarioState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  // Acciones
  setUsuario: (usuario: Usuario | null) => void;
  login: (usuario: Usuario) => void;
  logout: () => void;
  updatePreferencias: (preferencias: any) => void;
}

export const useUsuarioStore = create<UsuarioState>((set) => ({
  usuario: null,
  isAuthenticated: false,

  setUsuario: (usuario) => set({ usuario }),

  login: (usuario) => {
    localStorage.setItem('milano_usuario', JSON.stringify(usuario));
    set({ usuario, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('milano_usuario');
    set({ usuario: null, isAuthenticated: false });
  },

  updatePreferencias: (preferencias) => set((state) => ({
    usuario: state.usuario ? {
      ...state.usuario,
      preferencias: { ...state.usuario.preferencias, ...preferencias }
    } : null
  })),
}));

// ============================================
// STORE DE DASHBOARD (KPIs)
// ============================================
interface DashboardState {
  kpi: KPIDashboard | null;
  loading: boolean;
  // Acciones
  setKPI: (kpi: KPIDashboard) => void;
  setLoading: (loading: boolean) => void;
  refreshKPI: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  kpi: null,
  loading: false,

  setKPI: (kpi) => set({ kpi }),
  setLoading: (loading) => set({ loading }),

  refreshKPI: async () => {
    set({ loading: true });
    try {
      const stats = await dashboardApi.getStats();
      set({ kpi: stats, loading: false });
    } catch (error: any) {
      set({ loading: false });
      // Fallback a localStorage si la API falla
      const stats = localStorageService.dashboard.getStats();
      set({ kpi: stats });
    }
  },
}));

// ============================================
// INICIALIZACIÓN
// ============================================
export function initializeData() {
  localStorageService.initialize();
}

// ============================================
// INICIALIZACIÓN DE AUTENTICACIÓN
// ============================================
// Al cargar la app, verificar si hay usuario guardado
const usuarioGuardado = localStorage.getItem('milano_usuario');
if (usuarioGuardado) {
  try {
    const usuario = JSON.parse(usuarioGuardado);
    useUsuarioStore.getState().login(usuario);
  } catch (e) {
    localStorage.removeItem('milano_usuario');
  }
}