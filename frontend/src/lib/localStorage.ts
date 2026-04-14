// ============================================
// MILANO - LocalStorage Service (Modo Offline)
// ============================================

import type { 
  Cliente, 
  Vehiculo, 
  Conductor, 
  Servicio, 
  Factura, 
  Usuario,
  Mantenimiento,
  KPIDashboard 
} from '../types';

const STORAGE_KEYS = {
  CLIENTES: 'milano_clientes',
  VEHICULOS: 'milano_vehiculos',
  CONDUCTORES: 'milano_conductores',
  SERVICIOS: 'milano_servicios',
  FACTURAS: 'milano_facturas',
  USUARIO: 'milano_usuario',
  MANTENIMIENTO: 'milano_mantenimiento',
  KPIDashboard: 'milano_kpidashboard',
  INITIALIZED: 'milano_initialized',
};

// Datos iniciales de ejemplo
const datosIniciales = {
  clientes: [
    {
      id: 'c1',
      codigo: 'CLI001',
      nombre: 'Festival de Música de Barcelona',
      tipo: 'festival',
      contacto: { email: 'produccion@festivalbarcelona.com', telefono: '+34 93 123 45 67', direccion: 'Carrer de la Música, 123', ciudad: 'Barcelona', codigoPostal: '08001' },
      nif: 'B12345678',
      condicionesEspeciales: 'Servicio 24h durante el festival. Prioridad en lanzaderas.',
      formaPago: 'transferencia',
      diasPago: 30,
      fechaAlta: '2023-01-15T00:00:00.000Z',
      estado: 'activo',
      notas: 'Cliente habitual. Gran volumen en verano.',
    },
    {
      id: 'c2',
      codigo: 'CLI002',
      nombre: 'Sala Razzmatazz',
      tipo: 'promotor',
      contacto: { email: 'logistica@razzmatazz.com', telefono: '+34 93 234 56 78', direccion: 'C/ Almogàvers, 122', ciudad: 'Barcelona', codigoPostal: '08018' },
      nif: 'B87654321',
      formaPago: 'transferencia',
      diasPago: 15,
      fechaAlta: '2023-03-10T00:00:00.000Z',
      estado: 'activo',
    },
    {
      id: 'c3',
      codigo: 'CLI003',
      nombre: 'Colegio Internacional de Madrid',
      tipo: 'colegio',
      contacto: { email: 'administracion@colegiomadrid.es', telefono: '+34 91 345 67 89', direccion: 'Av. de la Paz, 45', ciudad: 'Madrid', codigoPostal: '28003' },
      nif: 'A12345678',
      condicionesEspeciales: 'Vehículos con cinturones homologados. Conductores con certificado de penales.',
      formaPago: 'domiciliacion',
      diasPago: 45,
      fechaAlta: '2023-06-20T00:00:00.000Z',
      estado: 'activo',
    },
    {
      id: 'c4',
      codigo: 'CLI004',
      nombre: 'Empresa Constructora del Norte',
      tipo: 'empresa',
      contacto: { email: 'rrhh@constructoranorte.com', telefono: '+34 94 456 78 90', direccion: 'Polígono Industrial Norte, Nave 12', ciudad: 'Bilbao', codigoPostal: '48002' },
      nif: 'B98765432',
      formaPago: 'transferencia',
      diasPago: 60,
      fechaAlta: '2023-09-05T00:00:00.000Z',
      estado: 'activo',
      notas: 'Traslados de personal a obras.',
    },
    {
      id: 'c5',
      codigo: 'CLI005',
      nombre: 'PromoConciertos S.L.',
      tipo: 'promotor',
      contacto: { email: 'info@promoconciertos.es', telefono: '+34 93 567 89 01', direccion: 'C/ Roc Boronat, 45', ciudad: 'Barcelona', codigoPostal: '08005' },
      nif: 'B45678901',
      formaPago: 'transferencia',
      diasPago: 30,
      fechaAlta: '2024-01-10T00:00:00.000Z',
      estado: 'activo',
    },
  ],
  vehiculos: [
    {
      id: 'v1',
      matricula: '1234 BCD',
      bastidor: 'WVWZZZ1KZBW000001',
      marca: 'Mercedes-Benz',
      modelo: 'Tourismo',
      tipo: 'autobus',
      plazas: 55,
      añoFabricacion: 2022,
      kilometraje: 125000,
      consumoMedio: 28.5,
      combustible: 'diesel',
      itv: { fechaUltima: '2024-03-15T00:00:00.000Z', fechaProxima: '2025-03-15T00:00:00.000Z', resultado: 'favorable' },
      seguro: { compania: 'Mutua Madrileña', poliza: 'AU-12345678', tipoCobertura: 'Todo Riesgo', fechaInicio: '2024-01-01T00:00:00.000Z', fechaVencimiento: '2025-01-01T00:00:00.000Z', prima: 3500 },
      mantenimientos: [],
      estado: 'operativo',
      ubicacion: 'Barcelona',
    },
    {
      id: 'v2',
      matricula: '5678 FGH',
      bastidor: 'WVWZZZ1KZBW000002',
      marca: 'Volvo',
      modelo: '9700',
      tipo: 'autobus',
      plazas: 50,
      añoFabricacion: 2021,
      kilometraje: 180000,
      consumoMedio: 26.0,
      combustible: 'diesel',
      itv: { fechaUltima: '2024-06-20T00:00:00.000Z', fechaProxima: '2025-06-20T00:00:00.000Z', resultado: 'favorable' },
      seguro: { compania: 'Mapfre', poliza: 'AU-87654321', fechaInicio: '2024-06-01T00:00:00.000Z', fechaVencimiento: '2025-06-01T00:00:00.000Z', prima: 3200 },
      mantenimientos: [],
      estado: 'operativo',
      ubicacion: 'Barcelona',
    },
    {
      id: 'v3',
      matricula: '9012 JKL',
      bastidor: 'WVWZZZ1KZBW000003',
      marca: 'MAN',
      modelo: 'Lion\'s Coach',
      tipo: 'autobus',
      plazas: 53,
      añoFabricacion: 2023,
      kilometraje: 85000,
      consumoMedio: 27.0,
      combustible: 'diesel',
      itv: { fechaUltima: '2024-09-10T00:00:00.000Z', fechaProxima: '2026-09-10T00:00:00.000Z', resultado: 'favorable' },
      seguro: { compania: 'Mutua Madrileña', poliza: 'AU-11111111', fechaInicio: '2024-09-01T00:00:00.000Z', fechaVencimiento: '2025-09-01T00:00:00.000Z', prima: 3800 },
      mantenimientos: [],
      estado: 'operativo',
      ubicacion: 'Madrid',
    },
    {
      id: 'v4',
      matricula: '3456 MNP',
      bastidor: 'WVWZZZ1KZBW000004',
      marca: 'Mercedes-Benz',
      modelo: 'Sprinter',
      tipo: 'minibus',
      plazas: 19,
      añoFabricacion: 2022,
      kilometraje: 95000,
      consumoMedio: 12.5,
      combustible: 'diesel',
      itv: { fechaUltima: '2024-08-05T00:00:00.000Z', fechaProxima: '2025-02-05T00:00:00.000Z', resultado: 'favorable' },
      seguro: { compania: 'Mapfre', poliza: 'AU-22222222', fechaInicio: '2024-08-01T00:00:00.000Z', fechaVencimiento: '2025-02-01T00:00:00.000Z', prima: 1800 },
      mantenimientos: [],
      estado: 'operativo',
      ubicacion: 'Barcelona',
    },
    {
      id: 'v5',
      matricula: '7890 QRS',
      bastidor: 'WVWZZZ1KZBW000005',
      marca: 'Irizar',
      modelo: 'i6',
      tipo: 'autobus',
      plazas: 60,
      añoFabricacion: 2020,
      kilometraje: 250000,
      consumoMedio: 29.0,
      combustible: 'diesel',
      itv: { fechaUltima: '2024-01-20T00:00:00.000Z', fechaProxima: '2025-01-20T00:00:00.000Z', resultado: 'favorable' },
      seguro: { compania: 'Mutua Madrileña', poliza: 'AU-33333333', fechaInicio: '2024-01-01T00:00:00.000Z', fechaVencimiento: '2025-01-01T00:00:00.000Z', prima: 3000 },
      mantenimientos: [],
      estado: 'taller',
      ubicacion: 'Madrid',
    },
  ],
  conductores: [
    {
      id: 'd1',
      codigo: 'COND001',
      nombre: 'Antonio',
      apellidos: 'García López',
      dni: '12345678A',
      fechaNacimiento: '1980-05-15T00:00:00.000Z',
      fechaAlta: '2022-01-10T00:00:00.000Z',
      telefono: '+34 612 345 678',
      email: 'antonio.garcia@milano.es',
      direccion: 'C/ Mayor, 45, Barcelona',
      licencia: { tipo: 'D', numero: 'D12345678', fechaExpedicion: '2015-03-20T00:00:00.000Z', fechaCaducidad: '2027-03-20T00:00:00.000Z', permisos: ['D', 'DE', 'C', 'CE'] },
      tarifaHora: 18.50,
      disponibilidad: { dias: [0, 1, 2, 3, 4, 5], horaInicio: '06:00', horaFin: '22:00' },
      estado: 'activo',
      totalHorasMes: 160,
      totalServiciosMes: 24,
      valoracion: 4.8,
      notas: 'Conductor experimentado. Especialista en larga distancia.',
    },
    {
      id: 'd2',
      codigo: 'COND002',
      nombre: 'María',
      apellidos: 'Rodríguez Sánchez',
      dni: '87654321B',
      fechaNacimiento: '1985-08-22T00:00:00.000Z',
      fechaAlta: '2022-06-15T00:00:00.000Z',
      telefono: '+34 623 456 789',
      email: 'maria.rodriguez@milano.es',
      direccion: 'Av. Diagonal, 234, Barcelona',
      licencia: { tipo: 'D', numero: 'D87654321', fechaExpedicion: '2018-07-10T00:00:00.000Z', fechaCaducidad: '2028-07-10T00:00:00.000Z', permisos: ['D', 'C'] },
      tarifaHora: 17.00,
      disponibilidad: { dias: [0, 1, 2, 3, 4], horaInicio: '07:00', horaFin: '19:00' },
      estado: 'activo',
      totalHorasMes: 140,
      totalServiciosMes: 20,
      valoracion: 4.9,
      notas: 'Excelente trato con clientes. Especialista en servicios escolares.',
    },
    {
      id: 'd3',
      codigo: 'COND003',
      nombre: 'Pedro',
      apellidos: 'Martínez Ruiz',
      dni: '45678901C',
      fechaNacimiento: '1975-11-03T00:00:00.000Z',
      fechaAlta: '2021-03-01T00:00:00.000Z',
      telefono: '+34 634 567 890',
      email: 'pedro.martinez@milano.es',
      direccion: 'C/ Aragó, 123, Barcelona',
      licencia: { tipo: 'D', numero: 'D45678901', fechaExpedicion: '2010-01-15T00:00:00.000Z', fechaCaducidad: '2026-01-15T00:00:00.000Z', permisos: ['D', 'DE', 'C', 'CE', 'B'] },
      tarifaHora: 19.00,
      disponibilidad: { dias: [0, 1, 2, 3, 4, 5, 6], horaInicio: '05:00', horaFin: '23:00' },
      estado: 'activo',
      totalHorasMes: 180,
      totalServiciosMes: 28,
      valoracion: 4.7,
      notas: 'Jefe de conductores. Disponible para servicios especiales.',
    },
    {
      id: 'd4',
      codigo: 'COND004',
      nombre: 'Laura',
      apellidos: 'Fernández Gómez',
      dni: '78901234D',
      fechaNacimiento: '1990-02-28T00:00:00.000Z',
      fechaAlta: '2023-01-20T00:00:00.000Z',
      telefono: '+34 645 678 901',
      email: 'laura.fernandez@milano.es',
      direccion: 'C/ Consell de Cent, 89, Barcelona',
      licencia: { tipo: 'D', numero: 'D78901234', fechaExpedicion: '2020-09-05T00:00:00.000Z', fechaCaducidad: '2030-09-05T00:00:00.000Z', permisos: ['D', 'C'] },
      tarifaHora: 16.50,
      disponibilidad: { dias: [1, 2, 3, 4, 5], horaInicio: '08:00', horaFin: '20:00' },
      estado: 'vacaciones',
      totalHorasMes: 0,
      totalServiciosMes: 0,
      valoracion: 4.5,
    },
    {
      id: 'd5',
      codigo: 'COND005',
      nombre: 'Carlos',
      apellidos: 'López Hernández',
      dni: '01234567E',
      fechaNacimiento: '1982-07-14T00:00:00.000Z',
      fechaAlta: '2022-09-10T00:00:00.000Z',
      telefono: '+34 656 789 012',
      email: 'carlos.lopez@milano.es',
      direccion: 'C/ Valencia, 456, Barcelona',
      licencia: { tipo: 'D', numero: 'D01234567', fechaExpedicion: '2012-04-20T00:00:00.000Z', fechaCaducidad: '2025-04-20T00:00:00.000Z', permisos: ['D', 'DE', 'C'] },
      tarifaHora: 18.00,
      disponibilidad: { dias: [0, 1, 2, 3, 4, 5], horaInicio: '06:00', horaFin: '21:00' },
      estado: 'activo',
      totalHorasMes: 155,
      totalServiciosMes: 22,
      valoracion: 4.6,
    },
  ],
  servicios: [
    {
      id: 's1',
      codigo: 'SRV001',
      clienteId: 'c1',
      clienteNombre: 'Festival de Música de Barcelona',
      contactoCliente: { email: 'produccion@festivalbarcelona.com', telefono: '+34 93 123 45 67' },
      tipo: 'lanzadera',
      estado: 'completado',
      fechaInicio: '2024-06-15T00:00:00.000Z',
      fechaFin: '2024-06-20T00:00:00.000Z',
      horaInicio: '16:00',
      horaFin: '02:00',
      titulo: 'Lanzaderas Festival de Verano',
      descripcion: 'Servicio de lanzaderas para el festival de verano. 5 días de servicio continuo.',
      numeroVehiculos: 3,
      vehiculosAsignados: ['v1', 'v2', 'v4'],
      conductoresAsignados: ['d1', 'd2', 'd3'],
      rutas: [],
      ubicacionEvento: 'Parc del Fòrum, Barcelona',
      costeEstimado: 15000,
      costeReal: 16200,
      precio: 22000,
      margen: 5800,
      facturado: true,
      facturaId: 'f1',
      tareas: [
        { id: 't1', nombre: 'Recopilar información del evento', completada: true, fechaCompletada: '2024-05-01T00:00:00.000Z' },
        { id: 't2', nombre: 'Planificar rutas', completada: true, fechaCompletada: '2024-05-05T00:00:00.000Z' },
        { id: 't3', nombre: 'Asignar conductores', completada: true, fechaCompletada: '2024-05-10T00:00:00.000Z' },
        { id: 't4', nombre: 'Preparar vehículos', completada: true, fechaCompletada: '2024-06-14T00:00:00.000Z' },
        { id: 't5', nombre: 'Coordinación con cliente', completada: true, fechaCompletada: '2024-06-14T00:00:00.000Z' },
        { id: 't6', nombre: 'Ejecución del servicio', completada: true, fechaCompletada: '2024-06-20T00:00:00.000Z' },
        { id: 't7', nombre: 'Cierre operativo', completada: true, fechaCompletada: '2024-06-21T00:00:00.000Z' },
      ],
      incidencias: [
        { id: 'i1', fecha: '2024-06-18T00:00:00.000Z', tipo: 'trafico', severidad: 'media', descripcion: 'Retraso de 30 min por accidente en Ronda Litoral.', reportadoPor: 'Antonio García', resuelta: true, fechaResolucion: '2024-06-18T00:00:00.000Z', solucion: 'Ruta alternativa implementada.' },
      ],
      documentos: [],
      fechaCreacion: '2024-04-01T00:00:00.000Z',
      creadoPor: 'Juan García',
    },
    {
      id: 's2',
      codigo: 'SRV002',
      clienteId: 'c1',
      clienteNombre: 'Festival de Música de Barcelona',
      tipo: 'staff',
      estado: 'confirmado',
      fechaInicio: '2025-06-01T00:00:00.000Z',
      fechaFin: '2025-06-05T00:00:00.000Z',
      titulo: 'Primavera Sound 2025 - Staff',
      descripcion: 'Transporte de staff y artistas para el Primavera Sound.',
      numeroVehiculos: 2,
      vehiculosAsignados: [],
      conductoresAsignados: [],
      rutas: [],
      costeEstimado: 8000,
      precio: 12000,
      facturado: false,
      tareas: [
        { id: 't8', nombre: 'Recopilar información', completada: true },
        { id: 't9', nombre: 'Planificar rutas', completada: false },
        { id: 't10', nombre: 'Asignar conductores', completada: false },
      ],
      incidencias: [],
      documentos: [],
      fechaCreacion: '2024-11-15T00:00:00.000Z',
      creadoPor: 'María López',
    },
    {
      id: 's3',
      codigo: 'SRV003',
      clienteId: 'c2',
      clienteNombre: 'Sala Razzmatazz',
      tipo: 'discrecional',
      estado: 'en_curso',
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
      horaInicio: '20:00',
      horaFin: '23:30',
      titulo: 'Concierto Especial - Traslado Artista',
      descripcion: 'Traslado del aeropuerto al hotel y posteriormente a la sala.',
      numeroVehiculos: 1,
      vehiculosAsignados: ['v4'],
      conductoresAsignados: ['d2'],
      rutas: [],
      costeEstimado: 350,
      precio: 600,
      facturado: false,
      tareas: [
        { id: 't11', nombre: 'Recopilar información', completada: true },
        { id: 't12', nombre: 'Planificar rutas', completada: true },
        { id: 't13', nombre: 'Asignar conductores', completada: true },
        { id: 't14', nombre: 'Preparar vehículos', completada: true },
        { id: 't15', nombre: 'Ejecución del servicio', completada: false },
      ],
      incidencias: [],
      documentos: [],
      fechaCreacion: '2024-12-01T00:00:00.000Z',
      creadoPor: 'Juan García',
    },
    {
      id: 's4',
      codigo: 'SRV004',
      clienteId: 'c2',
      clienteNombre: 'Sala Razzmatazz',
      tipo: 'staff',
      estado: 'asignado',
      fechaInicio: '2025-01-20T00:00:00.000Z',
      fechaFin: '2025-01-20T00:00:00.000Z',
      titulo: 'Gira de Invierno - Staff',
      descripcion: 'Transporte de staff para la gira de invierno.',
      numeroVehiculos: 1,
      vehiculosAsignados: ['v2'],
      conductoresAsignados: ['d1'],
      rutas: [],
      costeEstimado: 400,
      precio: 700,
      facturado: false,
      tareas: [
        { id: 't16', nombre: 'Recopilar información', completada: true },
        { id: 't17', nombre: 'Asignar conductores', completada: true },
      ],
      incidencias: [],
      documentos: [],
      fechaCreacion: '2024-12-10T00:00:00.000Z',
      creadoPor: 'María López',
    },
    {
      id: 's5',
      codigo: 'SRV005',
      clienteId: 'c4',
      clienteNombre: 'Empresa Constructora del Norte',
      tipo: 'ruta_programada',
      estado: 'completado',
      fechaInicio: '2024-12-01T00:00:00.000Z',
      fechaFin: '2024-12-20T00:00:00.000Z',
      titulo: 'Ruta Diaria Obra Zabalondo',
      descripcion: 'Traslado diario de trabajadores a la planta industrial.',
      numeroVehiculos: 1,
      vehiculosAsignados: ['v3'],
      conductoresAsignados: ['d3'],
      rutas: [],
      costeEstimado: 3500,
      costeReal: 3800,
      precio: 5500,
      margen: 1700,
      facturado: false,
      tareas: [
        { id: 't18', nombre: 'Recopilar información', completada: true },
        { id: 't19', nombre: 'Planificar rutas', completada: true },
        { id: 't20', nombre: 'Asignar conductores', completada: true },
        { id: 't21', nombre: 'Ejecución del servicio', completada: true },
        { id: 't22', nombre: 'Cierre operativo', completada: true },
      ],
      incidencias: [],
      documentos: [],
      fechaCreacion: '2024-11-01T00:00:00.000Z',
      creadoPor: 'Pedro Martínez',
    },
  ],
  facturas: [
    {
      id: 'f1',
      numero: 'F2024-001',
      serie: '2024',
      clienteId: 'c1',
      clienteNombre: 'Festival de Música de Barcelona',
      servicioId: 's1',
      servicioCodigo: 'SRV001',
      fechaEmision: '2024-06-25T00:00:00.000Z',
      fechaVencimiento: '2024-07-25T00:00:00.000Z',
      fechaPago: '2024-07-20T00:00:00.000Z',
      conceptos: [
        { id: 'cf1', concepto: 'Servicio de lanzaderas Festival de Verano', cantidad: 5, unidad: 'días', precioUnitario: 4000, impuesto: 21, total: 20000 },
        { id: 'cf2', concepto: 'Servicio extra horario', cantidad: 10, unidad: 'horas', precioUnitario: 100, impuesto: 21, total: 1000 },
        { id: 'cf3', concepto: 'Peajes y aparcamientos', cantidad: 1, unidad: 'suma', precioUnitario: 200, impuesto: 21, total: 200 },
      ],
      subtotal: 21200,
      baseImponible: 21200,
      impuestos: 4452,
      total: 25652,
      estado: 'pagada',
      metodoPago: 'transferencia',
      referenciaPago: 'TRX-20240720-001',
    },
    {
      id: 'f2',
      numero: 'F2024-002',
      serie: '2024',
      clienteId: 'c2',
      clienteNombre: 'Sala Razzmatazz',
      servicioId: 's3',
      servicioCodigo: 'SRV003',
      fechaEmision: new Date().toISOString(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      conceptos: [
        { id: 'cf4', concepto: 'Traslado artista aeropuerto-hotel-sala', cantidad: 1, unidad: 'servicio', precioUnitario: 600, impuesto: 21, total: 600 },
      ],
      subtotal: 600,
      baseImponible: 600,
      impuestos: 126,
      total: 726,
      estado: 'pendiente',
    },
    {
      id: 'f3',
      numero: 'F2024-003',
      serie: '2024',
      clienteId: 'c4',
      clienteNombre: 'Empresa Constructora del Norte',
      servicioId: 's5',
      servicioCodigo: 'SRV005',
      fechaEmision: '2024-12-21T00:00:00.000Z',
      fechaVencimiento: '2025-02-19T00:00:00.000Z',
      conceptos: [
        { id: 'cf5', concepto: 'Ruta diaria trabajadores - Diciembre 2024', cantidad: 20, unidad: 'días', precioUnitario: 250, impuesto: 21, total: 5000 },
        { id: 'cf6', concepto: 'Gastos de combustible adicionales', cantidad: 1, unidad: 'suma', precioUnitario: 300, impuesto: 21, total: 300 },
      ],
      subtotal: 5300,
      baseImponible: 5300,
      impuestos: 1113,
      total: 6413,
      estado: 'enviada',
    },
  ],
};

// ============================================
// LocalStorage Service
// ============================================

export const localStorageService = {
  // Inicializar datos si no existen
  initialize: () => {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(datosIniciales.clientes));
      localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(datosIniciales.vehiculos));
      localStorage.setItem(STORAGE_KEYS.CONDUCTORES, JSON.stringify(datosIniciales.conductores));
      localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(datosIniciales.servicios));
      localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(datosIniciales.facturas));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  // Resetear a datos iniciales
  reset: () => {
    localStorage.removeItem(STORAGE_KEYS.CLIENTES);
    localStorage.removeItem(STORAGE_KEYS.VEHICULOS);
    localStorage.removeItem(STORAGE_KEYS.CONDUCTORES);
    localStorage.removeItem(STORAGE_KEYS.SERVICIOS);
    localStorage.removeItem(STORAGE_KEYS.FACTURAS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorageService.initialize();
  },

  // Clientes
  clientes: {
    getAll: (): Cliente[] => {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTES);
      return data ? JSON.parse(data) : [];
    },
    getById: (id: string): Cliente | undefined => {
      const clientes = localStorageService.clientes.getAll();
      return clientes.find(c => c.id === id);
    },
    create: (cliente: Omit<Cliente, 'id' | 'codigo' | 'fechaAlta'>): Cliente => {
      const clientes = localStorageService.clientes.getAll();
      const nuevo: Cliente = {
        ...cliente,
        id: `c${Date.now()}`,
        codigo: `CLI${String(clientes.length + 1).padStart(3, '0')}`,
        fechaAlta: new Date().toISOString(),
      } as Cliente;
      clientes.push(nuevo);
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
      return nuevo;
    },
    update: (id: string, data: Partial<Cliente>): Cliente | null => {
      const clientes = localStorageService.clientes.getAll();
      const index = clientes.findIndex(c => c.id === id);
      if (index === -1) return null;
      clientes[index] = { ...clientes[index], ...data };
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
      return clientes[index];
    },
    delete: (id: string): boolean => {
      const clientes = localStorageService.clientes.getAll();
      const filtered = clientes.filter(c => c.id !== id);
      if (filtered.length === clientes.length) return false;
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(filtered));
      return true;
    },
  },

  // Vehículos
  vehiculos: {
    getAll: (): Vehiculo[] => {
      const data = localStorage.getItem(STORAGE_KEYS.VEHICULOS);
      return data ? JSON.parse(data) : [];
    },
    getById: (id: string): Vehiculo | undefined => {
      const vehiculos = localStorageService.vehiculos.getAll();
      return vehiculos.find(v => v.id === id);
    },
    create: (vehiculo: Omit<Vehiculo, 'id' | 'mantenimientos'> & { mantenimientos?: Mantenimiento[] }): Vehiculo => {
      const vehiculos = localStorageService.vehiculos.getAll();
      const nuevo: Vehiculo = {
        ...vehiculo,
        mantenimientos: vehiculo.mantenimientos || [],
        id: `v${Date.now()}`,
      } as Vehiculo;
      vehiculos.push(nuevo);
      localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(vehiculos));
      return nuevo;
    },
    update: (id: string, data: Partial<Vehiculo>): Vehiculo | null => {
      const vehiculos = localStorageService.vehiculos.getAll();
      const index = vehiculos.findIndex(v => v.id === id);
      if (index === -1) return null;
      vehiculos[index] = { ...vehiculos[index], ...data };
      localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(vehiculos));
      return vehiculos[index];
    },
    delete: (id: string): boolean => {
      const vehiculos = localStorageService.vehiculos.getAll();
      const filtered = vehiculos.filter(v => v.id !== id);
      if (filtered.length === vehiculos.length) return false;
      localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(filtered));
      return true;
    },
  },

  // Conductores
  conductores: {
    getAll: (): Conductor[] => {
      const data = localStorage.getItem(STORAGE_KEYS.CONDUCTORES);
      return data ? JSON.parse(data) : [];
    },
    getById: (id: string): Conductor | undefined => {
      const conductores = localStorageService.conductores.getAll();
      return conductores.find(d => d.id === id);
    },
    create: (conductor: Omit<Conductor, 'id' | 'codigo' | 'fechaAlta'>): Conductor => {
      const conductores = localStorageService.conductores.getAll();
      const nuevo: Conductor = {
        ...conductor,
        id: `d${Date.now()}`,
        codigo: `COND${String(conductores.length + 1).padStart(3, '0')}`,
        fechaAlta: new Date().toISOString(),
      } as Conductor;
      conductores.push(nuevo);
      localStorage.setItem(STORAGE_KEYS.CONDUCTORES, JSON.stringify(conductores));
      return nuevo;
    },
    update: (id: string, data: Partial<Conductor>): Conductor | null => {
      const conductores = localStorageService.conductores.getAll();
      const index = conductores.findIndex(d => d.id === id);
      if (index === -1) return null;
      conductores[index] = { ...conductores[index], ...data };
      localStorage.setItem(STORAGE_KEYS.CONDUCTORES, JSON.stringify(conductores));
      return conductores[index];
    },
    delete: (id: string): boolean => {
      const conductores = localStorageService.conductores.getAll();
      const filtered = conductores.filter(d => d.id !== id);
      if (filtered.length === conductores.length) return false;
      localStorage.setItem(STORAGE_KEYS.CONDUCTORES, JSON.stringify(filtered));
      return true;
    },
  },

  // Servicios
  servicios: {
    getAll: (): Servicio[] => {
      const data = localStorage.getItem(STORAGE_KEYS.SERVICIOS);
      return data ? JSON.parse(data) : [];
    },
    getById: (id: string): Servicio | undefined => {
      const servicios = localStorageService.servicios.getAll();
      return servicios.find(s => s.id === id);
    },
    create: (servicio: Omit<Servicio, 'id' | 'codigo' | 'fechaCreacion'>): Servicio => {
      const servicios = localStorageService.servicios.getAll();
      const nuevo: Servicio = {
        ...servicio,
        id: `s${Date.now()}`,
        codigo: `SRV${String(servicios.length + 1).padStart(3, '0')}`,
        fechaCreacion: new Date().toISOString(),
      } as Servicio;
      servicios.push(nuevo);
      localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(servicios));
      return nuevo;
    },
    update: (id: string, data: Partial<Servicio>): Servicio | null => {
      const servicios = localStorageService.servicios.getAll();
      const index = servicios.findIndex(s => s.id === id);
      if (index === -1) return null;
      servicios[index] = { ...servicios[index], ...data };
      localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(servicios));
      return servicios[index];
    },
    delete: (id: string): boolean => {
      const servicios = localStorageService.servicios.getAll();
      const filtered = servicios.filter(s => s.id !== id);
      if (filtered.length === servicios.length) return false;
      localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(filtered));
      return true;
    },
  },

  // Facturas
  facturas: {
    getAll: (): Factura[] => {
      const data = localStorage.getItem(STORAGE_KEYS.FACTURAS);
      return data ? JSON.parse(data) : [];
    },
    getById: (id: string): Factura | undefined => {
      const facturas = localStorageService.facturas.getAll();
      return facturas.find(f => f.id === id);
    },
    create: (factura: Omit<Factura, 'id' | 'numero' | 'fechaEmision'>): Factura => {
      const facturas = localStorageService.facturas.getAll();
      const año = new Date().getFullYear();
      const nuevo: Factura = {
        ...factura,
        id: `f${Date.now()}`,
        numero: `F${año}-${String(facturas.length + 1).padStart(3, '0')}`,
        fechaEmision: new Date().toISOString(),
      } as Factura;
      facturas.push(nuevo);
      localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(facturas));
      return nuevo;
    },
    update: (id: string, data: Partial<Factura>): Factura | null => {
      const facturas = localStorageService.facturas.getAll();
      const index = facturas.findIndex(f => f.id === id);
      if (index === -1) return null;
      facturas[index] = { ...facturas[index], ...data };
      localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(facturas));
      return facturas[index];
    },
    delete: (id: string): boolean => {
      const facturas = localStorageService.facturas.getAll();
      const filtered = facturas.filter(f => f.id !== id);
      if (filtered.length === facturas.length) return false;
      localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(filtered));
      return true;
    },
  },

  // Dashboard stats
  dashboard: {
    getStats: (): KPIDashboard => {
      const clientes = localStorageService.clientes.getAll();
      const vehiculos = localStorageService.vehiculos.getAll();
      const conductores = localStorageService.conductores.getAll();
      const servicios = localStorageService.servicios.getAll();
      const facturas = localStorageService.facturas.getAll();

      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      return {
        serviciosActivos: servicios.filter(s => s.estado === 'en_curso' || s.estado === 'asignado').length,
        serviciosHoy: servicios.filter(s => {
          const fecha = new Date(s.fechaInicio);
          return fecha.toDateString() === hoy.toDateString();
        }).length,
        serviciosMes: servicios.filter(s => new Date(s.fechaInicio) >= inicioMes).length,
        conductoresDisponibles: conductores.filter(d => d.estado === 'activo').length,
        conductoresOcupados: conductores.filter(d => d.estado === 'baja' || d.estado === 'vacaciones').length,
        vehiculosOperativos: vehiculos.filter(v => v.estado === 'operativo').length,
        vehiculosTaller: vehiculos.filter(v => v.estado === 'taller').length,
        facturacionMes: facturas
          .filter(f => f.estado === 'pagada' && f.fechaPago && new Date(f.fechaPago) >= inicioMes)
          .reduce((sum, f) => sum + (f.total || 0), 0),
        facturacionPendiente: facturas
          .filter(f => f.estado === 'pendiente' || f.estado === 'enviada')
          .reduce((sum, f) => sum + (f.total || 0), 0),
        serviciosPendientesFacturar: servicios.filter(s => s.estado === 'completado' && !s.facturado).length,
      };
    },
  },
};
