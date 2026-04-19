// ============================================
// MILANO - Sistema de Gestión de Transporte
// Stores Zustand con API Backend (ACTUALIZADO Y OPTIMIZADO)
// ============================================

import { create } from 'zustand';
import { localStorageService } from '@/lib/localStorage';
import { clientesApi, vehiculosApi, conductoresApi, serviciosApi, facturasApi, dashboardApi, authApi } from '@/lib/api';
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
  Contacto,
  GastoServicio,
  RevisionVehiculo,
} from '@/types';

// ============================================
// STORE DE CLIENTES
// ============================================
interface ClientesState {
  clientes: Cliente[];
  isLoading: boolean;
  error: string | null;
  clienteSeleccionado: Cliente | null;
  fetchClientes: () => Promise<void>;
  addCliente: (cliente: any) => Promise<boolean>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;
  seleccionarCliente: (cliente: Cliente | null) => void;
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
      const clientesFormateados: Cliente[] = clientes.map((c: any) => ({
        id: String(c.id),
        codigo: c.codigo,
        nombre: c.nombre,
        razonSocial: c.razon_social,
        tipo: c.tipo,
        contacto: {
          email: c.email || '',
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          ciudad: c.ciudad || '',
          codigoPostal: c.codigo_postal || '',
        },
        nif: c.nif_cif || undefined,
        condicionesEspeciales: c.condiciones_especiales || undefined,
        formaPago: c.condiciones_pago || undefined,
        diasPago: c.dias_pago || undefined,
        fechaAlta: c.fecha_creacion,
        fechaActualizacion: c.fecha_actualizacion,
        estado: c.estado,
        notas: c.notas || undefined,
        totalServicios: c.total_servicios || 0,
        totalFacturado: c.total_facturado || 0,
        ultimoServicio: c.ultimo_servicio || undefined,
      }));
      set({ clientes: clientesFormateados, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error fetchClientes:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addCliente: async (cliente) => {
    set({ isLoading: true, error: null });
    try {
      // FIX: Generar código si no viene
      const codigo = cliente.codigo || `CLI-${Date.now().toString().slice(-5)}`;
      
      const clienteParaBackend: any = {
        codigo: codigo,
        nombre: cliente.nombre,
        tipo: cliente.tipo || 'empresa',
        razon_social: cliente.razonSocial || null,
        nif_cif: cliente.nif || null,
        estado: cliente.estado || 'activo',
        condiciones_pago: cliente.formaPago || 'transferencia',
        dias_pago: cliente.diasPago || 30,
        condiciones_especiales: cliente.condicionesEspeciales || null,
        notas: cliente.notas || null,
        email: cliente.contacto?.email || null,
        telefono: cliente.contacto?.telefono || null,
        direccion: cliente.contacto?.direccion || null,
        ciudad: cliente.contacto?.ciudad || null,
        codigo_postal: cliente.contacto?.codigoPostal || null,
        pais: 'España',
        persona_contacto_nombre: null,
        persona_contacto_email: null,
        persona_contacto_telefono: null,
        persona_contacto_cargo: null,
      };

      console.log('📤 Enviando cliente:', clienteParaBackend);
      
      const nuevo = await clientesApi.create(clienteParaBackend);
      
      console.log('✅ Cliente creado:', nuevo);

      const clienteFormateado: Cliente = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        nombre: nuevo.nombre,
        razonSocial: nuevo.razon_social,
        tipo: nuevo.tipo,
        contacto: {
          email: nuevo.email || '',
          telefono: nuevo.telefono || '',
          direccion: nuevo.direccion || '',
          ciudad: nuevo.ciudad || '',
          codigoPostal: nuevo.codigo_postal || '',
        },
        nif: nuevo.nif_cif || undefined,
        condicionesEspeciales: nuevo.condiciones_especiales || undefined,
        formaPago: nuevo.condiciones_pago || undefined,
        diasPago: nuevo.dias_pago || undefined,
        fechaAlta: nuevo.fecha_creacion,
        fechaActualizacion: nuevo.fecha_actualizacion,
        estado: nuevo.estado,
        notas: nuevo.notas || undefined,
      };

      set((state) => ({
        clientes: [...state.clientes, clienteFormateado],
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      console.error('❌ Error addCliente:', error);
      set({ error: error.message || 'Error al crear cliente', isLoading: false });
      return false;
    }
  },

  updateCliente: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const dataParaBackend: any = {};

      if (data.nombre !== undefined) dataParaBackend.nombre = data.nombre;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.razonSocial !== undefined) dataParaBackend.razon_social = data.razonSocial;
      if (data.nif !== undefined) dataParaBackend.nif_cif = data.nif || null;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.formaPago !== undefined) dataParaBackend.condiciones_pago = data.formaPago;
      if (data.diasPago !== undefined) dataParaBackend.dias_pago = data.diasPago;
      if (data.condicionesEspeciales !== undefined) dataParaBackend.condiciones_especiales = data.condicionesEspeciales || null;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas || null;

      if (data.contacto) {
        dataParaBackend.email = data.contacto.email || null;
        dataParaBackend.telefono = data.contacto.telefono || null;
        dataParaBackend.direccion = data.contacto.direccion || null;
        dataParaBackend.ciudad = data.contacto.ciudad || null;
        dataParaBackend.codigo_postal = data.contacto.codigoPostal || null;
      }

      const actualizado = await clientesApi.update(id, dataParaBackend);
      if (actualizado) {
        const clienteFormateado: Cliente = {
          id: String(actualizado.id),
          codigo: actualizado.codigo,
          nombre: actualizado.nombre,
          razonSocial: actualizado.razon_social,
          tipo: actualizado.tipo,
          contacto: {
            email: actualizado.email || '',
            telefono: actualizado.telefono || '',
            direccion: actualizado.direccion || '',
            ciudad: actualizado.ciudad || '',
            codigoPostal: actualizado.codigo_postal || '',
          },
          nif: actualizado.nif_cif || undefined,
          condicionesEspeciales: actualizado.condiciones_especiales || undefined,
          formaPago: actualizado.condiciones_pago || undefined,
          diasPago: actualizado.dias_pago || undefined,
          fechaAlta: actualizado.fecha_creacion,
          fechaActualizacion: actualizado.fecha_actualizacion,
          estado: actualizado.estado,
          notas: actualizado.notas || undefined,
        };
        set((state) => ({
          clientes: state.clientes.map(c => c.id === id ? clienteFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      console.error('❌ Error updateCliente:', error);
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
      console.error('❌ Error deleteCliente:', error);
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
// STORE DE VEHÍCULOS (FLOTA) - OPTIMIZADO
// ============================================
interface VehiculosState {
  vehiculos: Vehiculo[];
  isLoading: boolean;
  error: string | null;
  vehiculoSeleccionado: Vehiculo | null;
  fetchVehiculos: () => Promise<void>;
  addVehiculo: (vehiculo: Omit<Vehiculo, 'id'> & { id?: string }) => Promise<boolean>;
  updateVehiculo: (id: string, data: Partial<Vehiculo>) => Promise<boolean>;
  deleteVehiculo: (id: string) => Promise<boolean>;
  seleccionarVehiculo: (vehiculo: Vehiculo | null) => void;
  addMantenimiento: (vehiculoId: string, mantenimiento: Mantenimiento) => void;
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
      const vehiculosFormateados: Vehiculo[] = vehiculos.map((v: any) => ({
        id: String(v.id),
        matricula: v.matricula,
        bastidor: v.bastidor || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        tipo: v.tipo || 'autobus',
        plazas: v.plazas || 0,
        añoFabricacion: v.anno_fabricacion,
        kilometraje: v.kilometraje || 0,
        kilometrajeUltimaRevision: v.kilometraje_ultima_revision,
        consumoMedio: v.consumo_medio,
        combustible: v.combustible || 'diesel',
        itv: {
          fechaUltima: v.itv_fecha_ultima,
          fechaProxima: v.fecha_vencimiento_itv || v.itv_fecha_proxima,
          resultado: v.itv_resultado,
          observaciones: v.itv_observaciones,
        },
        seguro: {
          compania: v.seguro_compania || '',
          poliza: v.seguro_poliza || '',
          tipoCobertura: v.seguro_tipo_cobertura,
          fechaInicio: v.seguro_fecha_inicio,
          fechaVencimiento: v.fecha_vencimiento_seguro || v.seguro_fecha_vencimiento,
          prima: v.seguro_prima,
        },
        mantenimientos: v.mantenimientos || [],
        estado: v.estado || 'operativo',
        ubicacion: v.ubicacion,
        notas: v.notas,
        imagenUrl: v.imagen_url,
      }));
      set({ vehiculos: vehiculosFormateados, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error fetchVehiculos:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // FIX: addVehiculo optimizado con generación de código y mejor manejo de errores
  addVehiculo: async (vehiculo) => {
    set({ isLoading: true, error: null });
    try {
      // Generar código si no viene
      const codigo = vehiculo.codigo || `VH-${Date.now().toString().slice(-6)}`;
      
      const vehiculoParaBackend: any = {
        // Campos obligatorios
        codigo: codigo,
        matricula: vehiculo.matricula,
        tipo: vehiculo.tipo || 'autobus',
        plazas: vehiculo.plazas || 0,
        estado: vehiculo.estado || 'operativo',
        
        // Campos opcionales con valores por defecto
        bastidor: vehiculo.bastidor || '',
        marca: vehiculo.marca || '',
        modelo: vehiculo.modelo || '',
        anno_fabricacion: vehiculo.añoFabricacion,
        kilometraje: vehiculo.kilometraje || 0,
        kilometraje_ultima_revision: vehiculo.kilometrajeUltimaRevision,
        consumo_medio: vehiculo.consumoMedio,
        combustible: vehiculo.combustible || 'diesel',
        ubicacion: vehiculo.ubicacion,
        notas: vehiculo.notas,
        imagen_url: vehiculo.imagenUrl,
        
        // ITV
        itv_fecha_ultima: vehiculo.itv?.fechaUltima || null,
        itv_fecha_proxima: vehiculo.itv?.fechaProxima || null,
        itv_resultado: vehiculo.itv?.resultado || null,
        itv_observaciones: vehiculo.itv?.observaciones || null,
        
        // Seguro
        seguro_compania: vehiculo.seguro?.compania || '',
        seguro_poliza: vehiculo.seguro?.poliza || '',
        seguro_tipo_cobertura: vehiculo.seguro?.tipoCobertura || null,
        seguro_fecha_inicio: vehiculo.seguro?.fechaInicio || null,
        seguro_fecha_vencimiento: vehiculo.seguro?.fechaVencimiento || null,
        seguro_prima: vehiculo.seguro?.prima || null,
        
        // Mantenimientos como array vacío inicialmente
        mantenimientos: vehiculo.mantenimientos || [],
      };

      console.log('📤 Enviando vehículo:', vehiculoParaBackend);
      
      const nuevo = await vehiculosApi.create(vehiculoParaBackend);
      
      console.log('✅ Vehículo creado:', nuevo);

      const vehiculoFormateado: Vehiculo = {
        id: String(nuevo.id),
        matricula: nuevo.matricula,
        bastidor: nuevo.bastidor || '',
        marca: nuevo.marca || '',
        modelo: nuevo.modelo || '',
        tipo: nuevo.tipo || 'autobus',
        plazas: nuevo.plazas || 0,
        añoFabricacion: nuevo.anno_fabricacion,
        kilometraje: nuevo.kilometraje || 0,
        kilometrajeUltimaRevision: nuevo.kilometraje_ultima_revision,
        consumoMedio: nuevo.consumo_medio,
        combustible: nuevo.combustible || 'diesel',
        itv: {
          fechaUltima: nuevo.itv_fecha_ultima,
          fechaProxima: nuevo.itv_fecha_proxima,
          resultado: nuevo.itv_resultado,
          observaciones: nuevo.itv_observaciones,
        },
        seguro: {
          compania: nuevo.seguro_compania || '',
          poliza: nuevo.seguro_poliza || '',
          tipoCobertura: nuevo.seguro_tipo_cobertura,
          fechaInicio: nuevo.seguro_fecha_inicio,
          fechaVencimiento: nuevo.seguro_fecha_vencimiento,
          prima: nuevo.seguro_prima,
        },
        mantenimientos: nuevo.mantenimientos || [],
        estado: nuevo.estado || 'operativo',
        ubicacion: nuevo.ubicacion,
        notas: nuevo.notas,
        imagenUrl: nuevo.imagen_url,
      };

      set((state) => ({ vehiculos: [...state.vehiculos, vehiculoFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      console.error('❌ Error addVehiculo:', error);
      set({ error: error.message || 'Error al crear vehículo', isLoading: false });
      return false;
    }
  },

  updateVehiculo: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const dataParaBackend: any = {};

      if (data.matricula !== undefined) dataParaBackend.matricula = data.matricula;
      if (data.bastidor !== undefined) dataParaBackend.bastidor = data.bastidor;
      if (data.marca !== undefined) dataParaBackend.marca = data.marca;
      if (data.modelo !== undefined) dataParaBackend.modelo = data.modelo;
      if (data.tipo !== undefined) dataParaBackend.tipo = data.tipo;
      if (data.plazas !== undefined) dataParaBackend.plazas = data.plazas;
      if (data.añoFabricacion !== undefined) dataParaBackend.anno_fabricacion = data.añoFabricacion;
      if (data.kilometraje !== undefined) dataParaBackend.kilometraje = data.kilometraje;
      if (data.kilometrajeUltimaRevision !== undefined) dataParaBackend.kilometraje_ultima_revision = data.kilometrajeUltimaRevision;
      if (data.consumoMedio !== undefined) dataParaBackend.consumo_medio = data.consumoMedio;
      if (data.combustible !== undefined) dataParaBackend.combustible = data.combustible;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.ubicacion !== undefined) dataParaBackend.ubicacion = data.ubicacion;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas;
      if (data.imagenUrl !== undefined) dataParaBackend.imagen_url = data.imagenUrl;

      if (data.itv) {
        dataParaBackend.itv_fecha_ultima = data.itv.fechaUltima;
        dataParaBackend.itv_fecha_proxima = data.itv.fechaProxima;
        dataParaBackend.itv_resultado = data.itv.resultado;
        dataParaBackend.itv_observaciones = data.itv.observaciones;
      }

      if (data.seguro) {
        dataParaBackend.seguro_compania = data.seguro.compania;
        dataParaBackend.seguro_poliza = data.seguro.poliza;
        dataParaBackend.seguro_tipo_cobertura = data.seguro.tipoCobertura;
        dataParaBackend.seguro_fecha_inicio = data.seguro.fechaInicio;
        dataParaBackend.seguro_fecha_vencimiento = data.seguro.fechaVencimiento;
        dataParaBackend.seguro_prima = data.seguro.prima;
      }

      const actualizado = await vehiculosApi.update(id, dataParaBackend);
      if (actualizado) {
        const vehiculoFormateado: Vehiculo = {
          id: String(actualizado.id),
          matricula: actualizado.matricula,
          bastidor: actualizado.bastidor || '',
          marca: actualizado.marca || '',
          modelo: actualizado.modelo || '',
          tipo: actualizado.tipo || 'autobus',
          plazas: actualizado.plazas || 0,
          añoFabricacion: actualizado.anno_fabricacion,
          kilometraje: actualizado.kilometraje || 0,
          kilometrajeUltimaRevision: actualizado.kilometraje_ultima_revision,
          consumoMedio: actualizado.consumo_medio,
          combustible: actualizado.combustible || 'diesel',
          itv: {
            fechaUltima: actualizado.itv_fecha_ultima,
            fechaProxima: actualizado.itv_fecha_proxima,
            resultado: actualizado.itv_resultado,
            observaciones: actualizado.itv_observaciones,
          },
          seguro: {
            compania: actualizado.seguro_compania || '',
            poliza: actualizado.seguro_poliza || '',
            tipoCobertura: actualizado.seguro_tipo_cobertura,
            fechaInicio: actualizado.seguro_fecha_inicio,
            fechaVencimiento: actualizado.seguro_fecha_vencimiento,
            prima: actualizado.seguro_prima,
          },
          mantenimientos: actualizado.mantenimientos || [],
          estado: actualizado.estado || 'operativo',
          ubicacion: actualizado.ubicacion,
          notas: actualizado.notas,
          imagenUrl: actualizado.imagen_url,
        };
        set((state) => ({
          vehiculos: state.vehiculos.map(v => v.id === id ? vehiculoFormateado : v),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      console.error('❌ Error updateVehiculo:', error);
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
      console.error('❌ Error deleteVehiculo:', error);
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
  getVehiculosOperativos: () => get().vehiculos.filter(v => v.estado === 'operativo'),
  getVehiculosConITVProxima: () => {
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().vehiculos.filter(v => {
      const fechaProxima = new Date(v.itv?.fechaProxima || '');
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
// STORE DE CONDUCTORES (ACTUALIZADO Y OPTIMIZADO)
// ============================================
interface ConductoresState {
  conductores: Conductor[];
  isLoading: boolean;
  error: string | null;
  conductorSeleccionado: Conductor | null;
  fetchConductores: () => Promise<void>;
  addConductor: (conductor: any) => Promise<boolean>;
  updateConductor: (id: string, data: Partial<Conductor>) => Promise<boolean>;
  deleteConductor: (id: string) => Promise<boolean>;
  seleccionarConductor: (conductor: Conductor | null) => void;
  getConductorById: (id: string) => Conductor | undefined;
  getConductoresByEstado: (estado: EstadoConductor) => Conductor[];
  getConductoresDisponibles: () => Conductor[];
  getConductoresConLicenciaProxima: () => Conductor[];
  getConductoresPriorizados: () => Conductor[];
  encontrarConductorDisponible: (fechaInicio: string, horaInicio?: string, fechaFin?: string, horaFin?: string) => Conductor | null;
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
      const conductoresFormateados: Conductor[] = conductores.map((c: any) => ({
        id: String(c.id),
        codigo: c.codigo,
        nombre: c.nombre,
        apellidos: c.apellidos,
        dni: c.dni,
        fechaNacimiento: c.fecha_nacimiento,
        fechaAlta: c.fecha_creacion,
        telefono: c.telefono || '',
        email: c.email || '',
        direccion: c.direccion,
        licencia: {
          tipo: c.licencia_tipo || c.licencia?.tipo || '',
          numero: c.licencia_numero || c.licencia?.numero || '',
          fechaExpedicion: c.licencia_fecha_expedicion || c.licencia?.fechaExpedicion,
          fechaCaducidad: c.licencia_fecha_caducidad || c.licencia?.fechaCaducidad,
          permisos: c.licencia_permisos || c.licencia?.permisos,
        },
        tarifaHora: c.tarifa_hora || c.tarifaHora || 18,
        prioridad: c.prioridad || 50,
        disponibilidad: {
          dias: c.disponibilidad_dias || c.disponibilidad?.dias || [1, 2, 3, 4, 5],
          horaInicio: c.disponibilidad_hora_inicio || c.disponibilidad?.horaInicio || '08:00',
          horaFin: c.disponibilidad_hora_fin || c.disponibilidad?.horaFin || '18:00',
          observaciones: c.disponibilidad_observaciones || c.disponibilidad?.observaciones,
        },
        credenciales: c.credenciales ? {
          usuario: c.credenciales.usuario || c.credenciales_usuario,
        } : undefined,
        panelActivo: c.panel_activo || c.panelActivo || true,
        estado: c.estado || 'activo',
        totalHorasMes: c.total_horas_mes || c.totalHorasMes || 0,
        totalServiciosMes: c.total_servicios_mes || c.totalServiciosMes || 0,
        valoracion: c.valoracion || 0,
        notas: c.notas,
      }));
      set({ conductores: conductoresFormateados, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error fetchConductores:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // FIX: addConductor optimizado con generación de código y mejor manejo de errores
  addConductor: async (conductor) => {
    set({ isLoading: true, error: null });
    try {
      // Generar código si no viene
      const codigo = conductor.codigo || `COND-${Date.now().toString().slice(-5)}`;
      
      const conductorParaBackend: any = {
        // Campos obligatorios
        codigo: codigo,
        nombre: conductor.nombre,
        apellidos: conductor.apellidos,
        dni: conductor.dni,
        estado: conductor.estado || 'activo',
        
        // Campos opcionales
        telefono: conductor.telefono || null,
        email: conductor.email || null,
        direccion: conductor.direccion || null,
        fecha_nacimiento: conductor.fechaNacimiento || null,
        
        // Tarifa y prioridad
        tarifa_hora: conductor.tarifaHora || 18,
        prioridad: conductor.prioridad || 50,
        
        // Licencia
        licencia_tipo: conductor.licencia?.tipo || 'D',
        licencia_numero: conductor.licencia?.numero || '',
        licencia_fecha_expedicion: conductor.licencia?.fechaExpedicion || null,
        licencia_fecha_caducidad: conductor.licencia?.fechaCaducidad || null,
        licencia_permisos: conductor.licencia?.permisos || [],
        
        // Disponibilidad
        disponibilidad_dias: conductor.disponibilidad?.dias || [1, 2, 3, 4, 5],
        disponibilidad_hora_inicio: conductor.disponibilidad?.horaInicio || '08:00',
        disponibilidad_hora_fin: conductor.disponibilidad?.horaFin || '18:00',
        disponibilidad_observaciones: conductor.disponibilidad?.observaciones || null,
        
        // Credenciales y panel
        credenciales: conductor.credenciales || null,
        panel_activo: conductor.panelActivo ?? true,
        
        // Inicialización
        total_horas_mes: 0,
        total_servicios_mes: 0,
        valoracion: 0,
        notas: conductor.notas || null,
      };

      console.log('📤 Enviando conductor:', conductorParaBackend);
      
      const nuevo = await conductoresApi.create(conductorParaBackend);
      
      console.log('✅ Conductor creado:', nuevo);

      const conductorFormateado: Conductor = {
        id: String(nuevo.id),
        codigo: nuevo.codigo,
        nombre: nuevo.nombre,
        apellidos: nuevo.apellidos,
        dni: nuevo.dni,
        fechaNacimiento: nuevo.fecha_nacimiento,
        fechaAlta: nuevo.fecha_creacion,
        telefono: nuevo.telefono || '',
        email: nuevo.email || '',
        direccion: nuevo.direccion,
        licencia: {
          tipo: nuevo.licencia_tipo || '',
          numero: nuevo.licencia_numero || '',
          fechaExpedicion: nuevo.licencia_fecha_expedicion,
          fechaCaducidad: nuevo.licencia_fecha_caducidad,
          permisos: nuevo.licencia_permisos,
        },
        tarifaHora: nuevo.tarifa_hora || 18,
        prioridad: nuevo.prioridad || 50,
        disponibilidad: {
          dias: nuevo.disponibilidad_dias || [1, 2, 3, 4, 5],
          horaInicio: nuevo.disponibilidad_hora_inicio || '08:00',
          horaFin: nuevo.disponibilidad_hora_fin || '18:00',
          observaciones: nuevo.disponibilidad_observaciones,
        },
        credenciales: nuevo.credenciales ? { usuario: nuevo.credenciales.usuario } : undefined,
        panelActivo: nuevo.panel_activo ?? true,
        estado: nuevo.estado || 'activo',
        totalHorasMes: nuevo.total_horas_mes || 0,
        totalServiciosMes: nuevo.total_servicios_mes || 0,
        notas: nuevo.notas,
      };

      set((state) => ({ conductores: [...state.conductores, conductorFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      console.error('❌ Error addConductor:', error);
      set({ error: error.message || 'Error al crear conductor', isLoading: false });
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
      if (data.fechaNacimiento !== undefined) dataParaBackend.fecha_nacimiento = data.fechaNacimiento;
      if (data.telefono !== undefined) dataParaBackend.telefono = data.telefono;
      if (data.email !== undefined) dataParaBackend.email = data.email;
      if (data.direccion !== undefined) dataParaBackend.direccion = data.direccion;
      if (data.tarifaHora !== undefined) dataParaBackend.tarifa_hora = data.tarifaHora;
      if (data.prioridad !== undefined) dataParaBackend.prioridad = data.prioridad;
      if (data.estado !== undefined) dataParaBackend.estado = data.estado;
      if (data.panelActivo !== undefined) dataParaBackend.panel_activo = data.panelActivo;
      if (data.notas !== undefined) dataParaBackend.notas = data.notas;

      if (data.licencia) {
        dataParaBackend.licencia_tipo = data.licencia.tipo;
        dataParaBackend.licencia_numero = data.licencia.numero;
        dataParaBackend.licencia_fecha_expedicion = data.licencia.fechaExpedicion;
        dataParaBackend.licencia_fecha_caducidad = data.licencia.fechaCaducidad;
        dataParaBackend.licencia_permisos = data.licencia.permisos;
      }

      if (data.disponibilidad) {
        dataParaBackend.disponibilidad_dias = data.disponibilidad.dias;
        dataParaBackend.disponibilidad_hora_inicio = data.disponibilidad.horaInicio;
        dataParaBackend.disponibilidad_hora_fin = data.disponibilidad.horaFin;
        dataParaBackend.disponibilidad_observaciones = data.disponibilidad.observaciones;
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
          fechaAlta: actualizado.fecha_creacion,
          telefono: actualizado.telefono || '',
          email: actualizado.email || '',
          direccion: actualizado.direccion,
          licencia: {
            tipo: actualizado.licencia_tipo || '',
            numero: actualizado.licencia_numero || '',
            fechaExpedicion: actualizado.licencia_fecha_expedicion,
            fechaCaducidad: actualizado.licencia_fecha_caducidad,
            permisos: actualizado.licencia_permisos,
          },
          tarifaHora: actualizado.tarifa_hora || 18,
          prioridad: actualizado.prioridad || 50,
          disponibilidad: {
            dias: actualizado.disponibilidad_dias || [1, 2, 3, 4, 5],
            horaInicio: actualizado.disponibilidad_hora_inicio || '08:00',
            horaFin: actualizado.disponibilidad_hora_fin || '18:00',
            observaciones: actualizado.disponibilidad_observaciones,
          },
          credenciales: actualizado.credenciales ? { usuario: actualizado.credenciales.usuario } : undefined,
          panelActivo: actualizado.panel_activo ?? true,
          estado: actualizado.estado || 'activo',
          totalHorasMes: actualizado.total_horas_mes || 0,
          totalServiciosMes: actualizado.total_servicios_mes || 0,
          notas: actualizado.notas,
        };
        set((state) => ({
          conductores: state.conductores.map(c => c.id === id ? conductorFormateado : c),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      console.error('❌ Error updateConductor:', error);
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
      console.error('❌ Error deleteConductor:', error);
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
  getConductoresPriorizados: () => {
    return [...get().conductores]
      .filter(c => c.estado === 'activo')
      .sort((a, b) => (b.prioridad || 50) - (a.prioridad || 50));
  },
  encontrarConductorDisponible: (fechaInicio, horaInicio, fechaFin, horaFin) => {
    const disponibles = get().getConductoresPriorizados();
    return disponibles[0] || null;
  },
}));

// ============================================
// STORE DE SERVICIOS (ACTUALIZADO Y OPTIMIZADO)
// ============================================
interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  error: string | null;
  servicioSeleccionado: Servicio | null;
  fetchServicios: () => Promise<void>;
  addServicio: (servicio: any) => Promise<boolean>;
  updateServicio: (id: string, data: Partial<Servicio>) => Promise<boolean>;
  deleteServicio: (id: string) => Promise<boolean>;
  seleccionarServicio: (servicio: Servicio | null) => void;
  addIncidencia: (servicioId: string, incidencia: any) => void;
  updateTarea: (servicioId: string, tareaId: string, completada: boolean) => void;
  addGasto: (servicioId: string, gasto: GastoServicio) => Promise<boolean>;
  addRevision: (servicioId: string, revision: RevisionVehiculo) => Promise<boolean>;
  updateTracking: (servicioId: string, tracking: any) => Promise<boolean>;
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
      const serviciosFormateados: Servicio[] = servicios.map((s: any) => ({
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
        horaInicioReal: s.hora_inicio_real,
        horaFinReal: s.hora_fin_real,
        horasReales: s.horas_reales,
        numeroVehiculos: s.numero_vehiculos || 1,
        vehiculosAsignados: s.vehiculos_asignados || [],
        conductoresAsignados: s.conductores_asignados || [],
        origen: s.origen,
        destino: s.destino,
        ubicacionEvento: s.ubicacion_evento,
        costeEstimado: s.coste_estimado || 0,
        costeReal: s.coste_real,
        precio: s.precio || 0,
        facturado: s.facturado || false,
        facturaId: s.factura_id,
        notasInternas: s.notas_internas,
        notasCliente: s.notas_cliente,
        fechaCreacion: s.fecha_creacion,
        fechaModificacion: s.fecha_modificacion,
        creadoPor: s.creado_por,
        rutas: s.rutas || [],
        tareas: s.tareas || [],
        incidencias: s.incidencias || [],
        gastos: s.gastos || [],
        revisiones: s.revisiones || [],
        tracking: s.tracking || {},
        documentos: s.documentos || [],
      }));
      set({ servicios: serviciosFormateados, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error fetchServicios:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // FIX: addServicio acepta camelCase o snake_case y convierte automáticamente
  addServicio: async (servicio) => {
    set({ isLoading: true, error: null });
    try {
      // Generar código si no viene
      const codigo = servicio.codigo || `SRV-${Date.now().toString().slice(-6)}`;
      
      // FIX: Normalizar fechas - acepta Date, string, o undefined
      const normalizeDate = (date: any): string | null => {
        if (!date) return null;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') {
          // Si ya es ISO string, devolverlo
          if (date.includes('T')) return date;
          // Si es YYYY-MM-DD, convertirlo
          return new Date(date).toISOString();
        }
        return null;
      };

      const servicioParaBackend: any = {
        codigo: codigo,
        cliente_id: servicio.cliente_id || servicio.clienteId || null,
        cliente_nombre: servicio.cliente_nombre || servicio.clienteNombre || null,
        tipo: servicio.tipo || 'discrecional',
        estado: servicio.estado || 'planificando',
        titulo: servicio.titulo,
        descripcion: servicio.descripcion || servicio.descripcion || null,
        fecha_inicio: normalizeDate(servicio.fecha_inicio || servicio.fechaInicio),
        fecha_fin: normalizeDate(servicio.fecha_fin || servicio.fechaFin),
        hora_inicio: servicio.hora_inicio || servicio.horaInicio || null,
        hora_fin: servicio.hora_fin || servicio.horaFin || null,
        numero_vehiculos: servicio.numero_vehiculos || servicio.numeroVehiculos || 1,
        vehiculos_asignados: servicio.vehiculos_asignados || servicio.vehiculosAsignados || [],
        conductores_asignados: servicio.conductores_asignados || servicio.conductoresAsignados || [],
        origen: servicio.origen || null,
        destino: servicio.destino || null,
        ubicacion_evento: servicio.ubicacion_evento || servicio.ubicacionEvento || null,
        coste_estimado: servicio.coste_estimado || servicio.costeEstimado || 0,
        coste_real: servicio.coste_real || servicio.costeReal || null,
        precio: servicio.precio || 0,
        facturado: servicio.facturado || false,
        factura_id: servicio.factura_id || servicio.facturaId || null,
        notas_internas: servicio.notas_internas || servicio.notasInternas || null,
        notas_cliente: servicio.notas_cliente || servicio.notasCliente || null,
        rutas: servicio.rutas || [],
        tareas: servicio.tareas || [],
        incidencias: servicio.incidencias || [],
        documentos: servicio.documentos || [],
      };

      console.log('📤 Enviando servicio:', servicioParaBackend);
      
      const nuevo = await serviciosApi.create(servicioParaBackend);
      
      console.log('✅ Servicio creado:', nuevo);

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
        horaInicioReal: nuevo.hora_inicio_real,
        horaFinReal: nuevo.hora_fin_real,
        horasReales: nuevo.horas_reales,
        numeroVehiculos: nuevo.numero_vehiculos || 1,
        vehiculosAsignados: nuevo.vehiculos_asignados || [],
        conductoresAsignados: nuevo.conductores_asignados || [],
        origen: nuevo.origen,
        destino: nuevo.destino,
        ubicacionEvento: nuevo.ubicacion_evento,
        costeEstimado: nuevo.coste_estimado || 0,
        costeReal: nuevo.coste_real,
        precio: nuevo.precio || 0,
        facturado: nuevo.facturado || false,
        facturaId: nuevo.factura_id,
        notasInternas: nuevo.notas_internas,
        notasCliente: nuevo.notas_cliente,
        fechaCreacion: nuevo.fecha_creacion,
        fechaModificacion: nuevo.fecha_modificacion,
        creadoPor: nuevo.creado_por,
        rutas: nuevo.rutas || [],
        tareas: nuevo.tareas || [],
        incidencias: nuevo.incidencias || [],
        gastos: nuevo.gastos || [],
        revisiones: nuevo.revisiones || [],
        tracking: nuevo.tracking || {},
        documentos: nuevo.documentos || [],
      };

      set((state) => ({ servicios: [...state.servicios, servicioFormateado], isLoading: false }));
      return true;
    } catch (error: any) {
      console.error('❌ Error addServicio:', error);
      set({ error: error.message || 'Error al crear servicio', isLoading: false });
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
      if (data.descripcion !== undefined) dataParaBackend.descripcion = data.descripcion;
      if (data.fechaInicio !== undefined) dataParaBackend.fecha_inicio = data.fechaInicio;
      if (data.fechaFin !== undefined) dataParaBackend.fecha_fin = data.fechaFin;
      if (data.horaInicio !== undefined) dataParaBackend.hora_inicio = data.horaInicio;
      if (data.horaFin !== undefined) dataParaBackend.hora_fin = data.horaFin;
      if (data.horaInicioReal !== undefined) dataParaBackend.hora_inicio_real = data.horaInicioReal;
      if (data.horaFinReal !== undefined) dataParaBackend.hora_fin_real = data.horaFinReal;
      if (data.horasReales !== undefined) dataParaBackend.horas_reales = data.horasReales;
      if (data.numeroVehiculos !== undefined) dataParaBackend.numero_vehiculos = data.numeroVehiculos;
      if (data.vehiculosAsignados !== undefined) dataParaBackend.vehiculos_asignados = data.vehiculosAsignados;
      if (data.conductoresAsignados !== undefined) dataParaBackend.conductores_asignados = data.conductoresAsignados;
      if (data.origen !== undefined) dataParaBackend.origen = data.origen;
      if (data.destino !== undefined) dataParaBackend.destino = data.destino;
      if (data.ubicacionEvento !== undefined) dataParaBackend.ubicacion_evento = data.ubicacionEvento;
      if (data.costeEstimado !== undefined) dataParaBackend.coste_estimado = data.costeEstimado;
      if (data.costeReal !== undefined) dataParaBackend.coste_real = data.costeReal;
      if (data.precio !== undefined) dataParaBackend.precio = data.precio;
      if (data.facturado !== undefined) dataParaBackend.facturado = data.facturado;
      if (data.facturaId !== undefined) dataParaBackend.factura_id = data.facturaId;
      if (data.notasInternas !== undefined) dataParaBackend.notas_internas = data.notasInternas;
      if (data.notasCliente !== undefined) dataParaBackend.notas_cliente = data.notasCliente;
      if (data.rutas !== undefined) dataParaBackend.rutas = data.rutas;
      if (data.tareas !== undefined) dataParaBackend.tareas = data.tareas;
      if (data.incidencias !== undefined) dataParaBackend.incidencias = data.incidencias;
      if (data.gastos !== undefined) dataParaBackend.gastos = data.gastos;
      if (data.revisiones !== undefined) dataParaBackend.revisiones = data.revisiones;
      if (data.tracking !== undefined) dataParaBackend.tracking = data.tracking;
      if (data.documentos !== undefined) dataParaBackend.documentos = data.documentos;

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
          horaInicioReal: actualizado.hora_inicio_real,
          horaFinReal: actualizado.hora_fin_real,
          horasReales: actualizado.horas_reales,
          numeroVehiculos: actualizado.numero_vehiculos || 1,
          vehiculosAsignados: actualizado.vehiculos_asignados || [],
          conductoresAsignados: actualizado.conductores_asignados || [],
          origen: actualizado.origen,
          destino: actualizado.destino,
          ubicacionEvento: actualizado.ubicacion_evento,
          costeEstimado: actualizado.coste_estimado || 0,
          costeReal: actualizado.coste_real,
          precio: actualizado.precio || 0,
          facturado: actualizado.facturado || false,
          facturaId: actualizado.factura_id,
          notasInternas: actualizado.notas_internas,
          notasCliente: actualizado.notas_cliente,
          fechaCreacion: actualizado.fecha_creacion,
          fechaModificacion: actualizado.fecha_modificacion,
          creadoPor: actualizado.creado_por,
          rutas: actualizado.rutas || [],
          tareas: actualizado.tareas || [],
          incidencias: actualizado.incidencias || [],
          gastos: actualizado.gastos || [],
          revisiones: actualizado.revisiones || [],
          tracking: actualizado.tracking || {},
          documentos: actualizado.documentos || [],
        };
        set((state) => ({
          servicios: state.servicios.map(s => s.id === id ? servicioFormateado : s),
          isLoading: false,
        }));
      }
      return !!actualizado;
    } catch (error: any) {
      console.error('❌ Error updateServicio:', error);
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
      console.error('❌ Error deleteServicio:', error);
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

  addGasto: async (servicioId, gasto) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (!servicio) return false;
    
    const gastosActualizados = [...(servicio.gastos || []), gasto];
    const costeRealActualizado = (servicio.costeReal || servicio.costeEstimado || 0) + gasto.precio;
    
    return await get().updateServicio(servicioId, {
      gastos: gastosActualizados,
      costeReal: costeRealActualizado,
    });
  },

  addRevision: async (servicioId, revision) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (!servicio) return false;
    
    const revisionesActualizadas = [...(servicio.revisiones || []), revision];
    return await get().updateServicio(servicioId, { revisiones: revisionesActualizadas });
  },

  updateTracking: async (servicioId, tracking) => {
    const servicio = get().servicios.find(s => s.id === servicioId);
    if (!servicio) return false;
    
    const trackingActualizado = { ...(servicio.tracking || {}), ...tracking };
    return await get().updateServicio(servicioId, { tracking: trackingActualizado });
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
  fetchFacturas: () => Promise<void>;
  addFactura: (factura: Omit<Factura, 'id' | 'numero' | 'fechaEmision'>) => Promise<boolean>;
  updateFactura: (id: string, data: Partial<Factura>) => Promise<boolean>;
  deleteFactura: (id: string) => Promise<boolean>;
  marcarPagada: (id: string) => Promise<boolean>;
  seleccionarFactura: (factura: Factura | null) => void;
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
      console.error('❌ Error fetchFacturas:', error);
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
      console.error('❌ Error addFactura:', error);
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
      console.error('❌ Error updateFactura:', error);
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
      console.error('❌ Error deleteFactura:', error);
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
      console.error('❌ Error marcarPagada:', error);
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
    const vehiculos = localStorageService.vehiculos.getAll();
    const conductores = localStorageService.conductores.getAll();
    const facturas = localStorageService.facturas.getAll();
    const hoy = new Date();
    const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alertas: Alerta[] = [];

    vehiculos.forEach(v => {
      const fechaITV = new Date(v.itv?.fechaProxima || '');
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
          fechaVencimiento: v.itv?.fechaProxima,
          leida: false,
          accion: 'Ver vehículo',
          accionUrl: `/flota`,
        });
      }
    });

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
      console.error('❌ Error fetchOportunidades:', error);
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
      console.error('❌ Error addOportunidad:', error);
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
      console.error('❌ Error updateOportunidad:', error);
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
      console.error('❌ Error deleteOportunidad:', error);
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
// STORE DE AUTENTICACIÓN (JWT Robusto)
// Reemplaza al antiguo useUsuarioStore
// ============================================

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permisos: string[];
  
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  fetchMe: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  checkAuth: () => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  permisos: [],

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      
      if (!response.access_token || !response.refresh_token) {
        throw new Error('Respuesta del servidor inválida');
      }

      console.log('✅ Login exitoso, tokens recibidos');
      
      await get().fetchMe();
      await get().fetchPermissions();
      
      set({ isAuthenticated: true, isLoading: false });
      return true;
      
    } catch (error: any) {
      console.error('❌ Error login:', error);
      set({ 
        error: error.message || 'Error al iniciar sesión', 
        isLoading: false,
        isAuthenticated: false 
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout backend falló, limpiando localmente');
    } finally {
      set({ 
        usuario: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: null,
        permisos: [] 
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  logoutAll: async () => {
    set({ isLoading: true });
    try {
      await authApi.logoutAll();
    } catch (error) {
      console.warn('Logout-all backend falló, limpiando localmente');
    } finally {
      set({ 
        usuario: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: null,
        permisos: [] 
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  fetchMe: async () => {
    try {
      const usuario = await authApi.me();
      set({ usuario });
    } catch (error: any) {
      console.error('❌ Error fetchMe:', error);
      set({ usuario: null, isAuthenticated: false });
    }
  },

  fetchPermissions: async () => {
    try {
      const response = await authApi.permissions();
      set({ permisos: response.permisos || [] });
    } catch (error: any) {
      console.error('❌ Error fetchPermissions:', error);
      set({ permisos: [] });
    }
  },

  checkAuth: () => {
    const { isAuthenticated, usuario } = get();
    return isAuthenticated && usuario !== null;
  },

  clearError: () => set({ error: null }),
}));

// ============================================
// STORE DE DASHBOARD (KPIs) - SIN CAMBIOS
// ============================================
interface DashboardState {
  kpi: KPIDashboard | null;
  loading: boolean;
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
      console.error('❌ Error refreshKPI:', error);
      set({ loading: false });
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
// INICIALIZACIÓN DE AUTENTICACIÓN (JWT ROBUSTO)
// ============================================
if (typeof window !== 'undefined') {
  const accessToken = localStorage.getItem('milano_access_token');
  const refreshToken = localStorage.getItem('milano_refresh_token');
  
  if (accessToken && refreshToken) {
    console.log('🔐 Tokens encontrados, restaurando sesión...');
    useAuthStore.getState().fetchMe().then(() => {
      useAuthStore.getState().fetchPermissions();
      useAuthStore.setState({ isAuthenticated: true });
    }).catch(() => {
      console.log('❌ No se pudo restaurar la sesión');
      localStorage.removeItem('milano_access_token');
      localStorage.removeItem('milano_refresh_token');
    });
  }
}