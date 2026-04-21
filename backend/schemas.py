# ============================================
# MILANO - Pydantic Schemas (v2)
# ============================================

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ============================================
# AUTH SCHEMAS
# ============================================

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ============================================
# USER SCHEMAS
# ============================================

class UserBase(BaseModel):
    username: str
    email: str
    nombre_completo: str

class UserCreate(UserBase):
    password: str
    rol: Optional[str] = "operador"
    conductor_id: Optional[int] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    rol_custom_id: Optional[int] = None
    activo: Optional[bool] = None

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    rol: str
    activo: bool
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    rol_custom_id: Optional[int] = None

# ============================================
# PERMISSION SCHEMAS
# ============================================

class Permission(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    categoria: str
    es_sistema: bool
    activo: bool

class PermissionCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    categoria: str

# ============================================
# ROLE SCHEMAS
# ============================================

class RolePermissionDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    permission: Permission

class Role(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    es_sistema: bool
    rol_base: Optional[str] = None
    activo: bool
    permisos: Optional[List[RolePermissionDetail]] = []

class RoleCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permisos_ids: List[int]

class RoleUpdate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    permisos_ids: List[int]

# ============================================
# USER PERMISSION OVERRIDE SCHEMAS
# ============================================

class UserPermissionOverride(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    permission_id: int
    permission_codigo: str
    permission_nombre: str
    tipo: str  # "allow" o "deny"
    razon: Optional[str] = None
    expires_at: Optional[datetime] = None

class UserPermissionCreate(BaseModel):
    permission_id: int
    tipo: str  # "allow" o "deny"
    razon: Optional[str] = None
    expires_at: Optional[datetime] = None

# ============================================
# CLIENTE SCHEMAS
# ============================================

class ClienteBase(BaseModel):
    codigo: Optional[str] = None
    tipo: Optional[str] = "empresa"
    nombre: str
    razon_social: Optional[str] = None
    nif_cif: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: Optional[str] = "España"
    email: Optional[str] = None
    telefono: Optional[str] = None
    persona_contacto_nombre: Optional[str] = None
    persona_contacto_email: Optional[str] = None
    persona_contacto_telefono: Optional[str] = None
    persona_contacto_cargo: Optional[str] = None
    estado: Optional[str] = "activo"
    condiciones_pago: Optional[str] = None
    dias_pago: Optional[int] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(ClienteBase):
    pass

class Cliente(ClienteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    total_servicios: int
    total_facturado: Decimal
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============================================
# CONDUCTOR SCHEMAS
# ============================================

class ConductorBase(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    apellidos: str
    dni: str
    fecha_nacimiento: Optional[datetime] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[datetime] = None
    licencia_fecha_caducidad: Optional[datetime] = None
    licencia_permisos: Optional[List[str]] = []
    # CAP
    licencia_cap_numero: Optional[str] = None
    licencia_cap_fecha_vencimiento: Optional[datetime] = None
    tarifa_hora: Optional[Decimal] = Decimal("18.00")
    tarifa_servicio: Optional[Decimal] = None
    prioridad: Optional[int] = 50
    disponibilidad_dias: Optional[List[int]] = [1, 2, 3, 4, 5]
    disponibilidad_hora_inicio: Optional[str] = "08:00"
    disponibilidad_hora_fin: Optional[str] = "18:00"
    disponibilidad_observaciones: Optional[str] = None
    # Nomina
    nomina_tipo: Optional[str] = "tarifa_hora"
    nomina_tarifa_hora: Optional[Decimal] = None
    nomina_horas_contratadas: Optional[int] = None
    nomina_horas_extras: Optional[bool] = None
    nomina_bloques: Optional[List[dict]] = None
    # DEPRECATED: usar sistema de usuarios
    credenciales: Optional[dict] = None
    panel_activo: Optional[bool] = True
    estado: Optional[str] = "activo"
    notas: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class ConductorUpdate(ConductorBase):
    pass

class Conductor(ConductorBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    total_horas_mes: Decimal
    total_servicios_mes: int
    valoracion: Optional[Decimal] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============================================
# VEHICULO SCHEMAS
# ============================================

class VehiculoBase(BaseModel):
    codigo: Optional[str] = None
    matricula: str
    bastidor: Optional[str] = None
    tipo: Optional[str] = "autobus"
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anno_fabricacion: Optional[int] = None
    plazas: Optional[int] = 0
    kilometraje: Optional[int] = 0
    kilometraje_ultima_revision: Optional[int] = None
    consumo_medio: Optional[Decimal] = None
    combustible: Optional[str] = "diesel"
    itv_fecha_ultima: Optional[datetime] = None
    itv_fecha_proxima: Optional[datetime] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[datetime] = None
    seguro_fecha_vencimiento: Optional[datetime] = None
    seguro_prima: Optional[Decimal] = None
    
    # Documentacion obligatoria
    tarjeta_transportes_numero: Optional[str] = None
    tarjeta_transportes_fecha_renovacion: Optional[datetime] = None
    tarjeta_transportes_documento_url: Optional[str] = None
    
    tacografo_fecha_calibracion: Optional[datetime] = None
    tacografo_documento_url: Optional[str] = None
    
    extintores_fecha_vencimiento: Optional[datetime] = None
    extintores_documento_url: Optional[str] = None
    
    itv_documento_url: Optional[str] = None
    seguro_documento_url: Optional[str] = None
    
    # Estado taller
    taller_fecha_inicio: Optional[datetime] = None
    taller_fecha_fin: Optional[datetime] = None
    taller_motivo: Optional[str] = None
    
    # Estado baja
    baja_motivo: Optional[str] = None
    baja_fecha: Optional[datetime] = None
    
    estado: Optional[str] = "operativo"
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(VehiculoBase):
    pass

class Vehiculo(VehiculoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============================================
# MANTENIMIENTO SCHEMAS
# ============================================

class MantenimientoCreate(BaseModel):
    tipo: str
    fecha: datetime
    kilometraje: Optional[int] = None
    descripcion: Optional[str] = None
    taller: Optional[str] = None
    coste: Optional[Decimal] = None
    factura_numero: Optional[str] = None
    documento_url: Optional[str] = None
    realizado_por: Optional[str] = None
    proxima_fecha: Optional[datetime] = None
    proximo_kilometraje: Optional[int] = None
    estado: Optional[str] = "completado"

class Mantenimiento(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    tipo: str
    fecha: datetime
    kilometraje: Optional[int]
    descripcion: Optional[str]
    taller: Optional[str]
    coste: Optional[Decimal]
    factura_numero: Optional[str]
    documento_url: Optional[str]
    realizado_por: Optional[str]
    proxima_fecha: Optional[datetime]
    proximo_kilometraje: Optional[int]
    estado: Optional[str]
    fecha_creacion: datetime

# ============================================
# AVERIA SCHEMAS
# ============================================

class AveriaCreate(BaseModel):
    descripcion: str
    gravedad: Optional[str] = "media"
    estado: Optional[str] = "reportada"
    taller: Optional[str] = None
    coste_reparacion: Optional[Decimal] = None
    piezas_cambiadas: Optional[List[str]] = []
    diagnostico: Optional[str] = None
    solucion: Optional[str] = None
    reportado_por_id: Optional[int] = None

class AveriaUpdate(BaseModel):
    descripcion: Optional[str] = None
    gravedad: Optional[str] = None
    estado: Optional[str] = None
    taller: Optional[str] = None
    coste_reparacion: Optional[Decimal] = None
    diagnostico: Optional[str] = None
    solucion: Optional[str] = None

class Averia(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    fecha_inicio: datetime
    fecha_fin: Optional[datetime]
    descripcion: str
    gravedad: str
    estado: str
    taller: Optional[str]
    coste_reparacion: Optional[Decimal]
    diagnostico: Optional[str]
    solucion: Optional[str]
    reportado_por: Optional[str]

# ============================================
# ANOTACION VEHICULO SCHEMAS
# ============================================

class AnotacionVehiculoCreate(BaseModel):
    tipo: Optional[str] = "observacion"
    descripcion: str
    kilometraje: Optional[int] = None
    nivel_combustible: Optional[int] = None
    estado_general: Optional[str] = "bueno"
    fotos: Optional[List[str]] = []
    conductor_id: Optional[int] = None
    servicio_id: Optional[int] = None

class AnotacionVehiculo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    fecha: datetime
    tipo: str
    descripcion: str
    kilometraje: Optional[int]
    conductor_nombre: Optional[str]

# ============================================
# SERVICIO SCHEMAS
# ============================================

class ServicioBase(BaseModel):
    codigo: Optional[str] = None
    cliente_id: Optional[int] = None
    tipo: str
    estado: Optional[str] = "planificando"
    titulo: str
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    hora_inicio_real: Optional[datetime] = None
    hora_fin_real: Optional[datetime] = None
    horas_reales: Optional[float] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    numero_vehiculos: Optional[int] = 1
    vehiculos_asignados: Optional[List[int]] = []
    conductores_asignados: Optional[List[int]] = []
    coste_estimado: Optional[Decimal] = Decimal("0")
    coste_real: Optional[Decimal] = None
    precio: Optional[Decimal] = Decimal("0")
    facturado: Optional[bool] = False
    factura_id: Optional[int] = None
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    rutas: Optional[List[dict]] = []
    tareas: Optional[List[dict]] = []
    incidencias: Optional[List[dict]] = []
    documentos: Optional[List[dict]] = []

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(ServicioBase):
    pass

class Servicio(ServicioBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    cliente_nombre: Optional[str]
    fecha_creacion: datetime
    fecha_modificacion: datetime
    creado_por: Optional[str]

# ============================================
# FACTURA SCHEMAS
# ============================================

class FacturaBase(BaseModel):
    numero: str
    serie: Optional[str] = "A"
    cliente_id: int
    cliente_nombre: Optional[str] = None
    servicio_id: Optional[int] = None
    servicio_codigo: Optional[str] = None
    fecha_vencimiento: datetime
    fecha_pago: Optional[datetime] = None
    subtotal: Optional[Decimal] = Decimal("0")
    descuento_total: Optional[Decimal] = Decimal("0")
    base_imponible: Optional[Decimal] = Decimal("0")
    impuestos: Optional[Decimal] = Decimal("0")
    iva: Optional[Decimal] = Decimal("21")
    total: Optional[Decimal] = Decimal("0")
    estado: Optional[str] = "pendiente"
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    notas: Optional[str] = None
    condiciones: Optional[str] = None
    pdf_url: Optional[str] = None
    conceptos: Optional[List[dict]] = []

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_pago: Optional[datetime] = None
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None

class Factura(FacturaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_emision: datetime
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============================================
# DASHBOARD SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    serviciosActivos: int
    serviciosHoy: int
    serviciosMes: int
    conductoresDisponibles: int
    conductoresOcupados: int
    vehiculosOperativos: int
    vehiculosTaller: int
    facturacionMes: float
    facturacionPendiente: float
    serviciosPendientesFacturar: int

# ============================================
# EMPRESA SCHEMAS (SaaS)
# ============================================

class EmpresaBase(BaseModel):
    nombre: str
    razon_social: Optional[str] = None
    cif: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    codigo_tenant: str
    plan: Optional[str] = "trial"
    configuracion: Optional[dict] = {}
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class Empresa(EmpresaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    estado: str
    max_usuarios: int
    max_vehiculos: int
    max_conductores: int
    fecha_registro: datetime
    fecha_inicio_plan: Optional[datetime]
    fecha_fin_plan: Optional[datetime]
    created_at: datetime
    updated_at: datetime

# ============================================
# VEHICULO TAREA SCHEMAS
# ============================================

class VehiculoTareaBase(BaseModel):
    tipo: str
    estado: Optional[str] = "pendiente"
    fecha: datetime
    fecha_completada: Optional[datetime] = None
    concepto: Optional[str] = None
    gasto: Optional[float] = None
    anotaciones: Optional[str] = None
    factura_url: Optional[str] = None
    documento_url: Optional[str] = None
    auto_generada: Optional[bool] = False

class VehiculoTareaCreate(VehiculoTareaBase):
    vehiculo_id: int

class VehiculoTareaUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_completada: Optional[datetime] = None
    concepto: Optional[str] = None
    gasto: Optional[float] = None
    anotaciones: Optional[str] = None
    factura_url: Optional[str] = None
    documento_url: Optional[str] = None
    completado_por: Optional[int] = None

class VehiculoTarea(VehiculoTareaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    creado_por: Optional[int] = None
    completado_por: Optional[int] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============================================
# MENSAJE SCHEMAS
# ============================================

class MensajeBase(BaseModel):
    texto: str
    autor_tipo: Optional[str] = "operador"

class MensajeCreate(MensajeBase):
    servicio_id: Optional[int] = None

class Mensaje(MensajeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    servicio_id: int
    autor_id: Optional[int] = None
    autor_nombre: str
    leido: bool = False
    created_at: datetime

# ============================================
# RUTA SCHEMAS
# ============================================

class ParadaSchema(BaseModel):
    tipo: str  # origen, parada, descanso, destino
    ubicacion: str
    hora: Optional[str] = None
    notas: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    orden: Optional[int] = None

class RutaBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    estado: Optional[str] = "planificada"
    origen: Optional[str] = None
    destino: Optional[str] = None
    origen_lat: Optional[float] = None
    origen_lng: Optional[float] = None
    destino_lat: Optional[float] = None
    destino_lng: Optional[float] = None
    paradas: Optional[List[ParadaSchema]] = []
    distancia_km: Optional[float] = None
    duracion_minutos: Optional[int] = None
    google_maps_url: Optional[str] = None
    polyline: Optional[str] = None
    requiere_pernocta: Optional[bool] = False
    conductores_necesarios: Optional[int] = 1
    observaciones_normativa: Optional[str] = None
    tracking_activo: Optional[bool] = False

class RutaCreate(RutaBase):
    servicio_id: int

class RutaUpdate(BaseModel):
    estado: Optional[str] = None
    tracking_activo: Optional[bool] = None
    ultima_posicion_lat: Optional[float] = None
    ultima_posicion_lng: Optional[float] = None

class Ruta(RutaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    servicio_id: int
    codigo: Optional[str] = None
    ultima_posicion_lat: Optional[float] = None
    ultima_posicion_lng: Optional[float] = None
    ultima_posicion_fecha: Optional[datetime] = None
    fecha_creacion: datetime
    fecha_modificacion: datetime