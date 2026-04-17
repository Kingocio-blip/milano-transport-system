# ============================================
# MILANO - Schemas Pydantic v2 (OPTIMIZADO)
# ============================================

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import enum
import uuid

# ============== ENUMS ==============

class TipoCliente(str, enum.Enum):
    EMPRESA = "empresa"
    PARTICULAR = "particular"
    FESTIVAL = "festival"
    PROMOTOR = "promotor"
    COLEGIO = "colegio"

class EstadoCliente(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    PROSPECTO = "prospecto"

class EstadoConductor(str, enum.Enum):
    ACTIVO = "activo"
    BAJA = "baja"
    VACACIONES = "vacaciones"
    DESCANSO = "descanso"
    INACTIVO = "inactivo"
    EN_RUTA = "en_ruta"

class EstadoVehiculo(str, enum.Enum):
    OPERATIVO = "operativo"
    TALLER = "taller"
    BAJA = "baja"
    RESERVADO = "reservado"

class TipoVehiculo(str, enum.Enum):
    AUTOBUS = "autobus"
    MINIBUS = "minibus"
    FURGONETA = "furgoneta"
    COCHE = "coche"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"
    CONDUCTOR = "conductor"

class TipoServicio(str, enum.Enum):
    LANZADERA = "lanzadera"
    DISCRECIONAL = "discrecional"
    STAFF = "staff"
    RUTA_PROGRAMADA = "ruta_programada"

class EstadoServicio(str, enum.Enum):
    SOLICITUD = "solicitud"
    PRESUPUESTO = "presupuesto"
    NEGOCIACION = "negociacion"
    CONFIRMADO = "confirmado"
    PLANIFICANDO = "planificando"
    ASIGNADO = "asignado"
    EN_CURSO = "en_curso"
    COMPLETADO = "completado"
    FACTURADO = "facturado"
    CANCELADO = "cancelado"

class TipoGasto(str, enum.Enum):
    GASOIL = "gasoil"
    PEAJE = "peaje"
    APARCAMIENTO = "aparcamiento"
    OTRO = "otro"

class TipoRevision(str, enum.Enum):
    LIMPIEZA = "limpieza"
    NEUMATICOS = "neumaticos"
    ACEITE = "aceite"
    LUCES = "luces"
    CARROCERIA = "carroceria"
    OTRO = "otro"

class EstadoRevision(str, enum.Enum):
    OK = "ok"
    KO = "ko"
    NA = "na"

# ============== CONSTANTES ==============

CONSUMO_LITROS_100KM = 35
PRECIO_GASOIL_LITRO = 1.6
COSTE_KM_CONDUCTOR = 0.5
TARIFA_CONDUCTOR_HORA = 18
TARIFA_COORDINADOR_HORA = 25

# ============== USER SCHEMAS ==============

class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    nombre_completo: str = Field(..., max_length=100)
    rol: UserRole = UserRole.OPERADOR

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    email: Optional[str] = Field(None, max_length=100)
    nombre_completo: Optional[str] = Field(None, max_length=100)
    rol: Optional[UserRole] = None
    activo: Optional[bool] = None
    conductor_id: Optional[int] = None

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    activo: bool = True
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    conductor_id: Optional[int] = None

# ============== CLIENTE SCHEMAS ==============

class ContactoPersona(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    nombre: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    cargo: Optional[str] = Field(None, max_length=50)

class ClienteBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    codigo: str = Field(..., max_length=20)
    tipo: TipoCliente = TipoCliente.EMPRESA
    nombre: str = Field(..., max_length=100)
    razon_social: Optional[str] = Field(None, max_length=100)
    nif_cif: Optional[str] = Field(None, max_length=20)
    direccion: Optional[str] = Field(None, max_length=200)
    ciudad: Optional[str] = Field(None, max_length=50)
    codigo_postal: Optional[str] = Field(None, max_length=10)
    pais: str = Field(default="España", max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    estado: EstadoCliente = EstadoCliente.ACTIVO
    condiciones_pago: Optional[str] = Field(None, max_length=50)
    dias_pago: Optional[int] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None
    
    persona_contacto_nombre: Optional[str] = Field(None, max_length=100)
    persona_contacto_email: Optional[str] = Field(None, max_length=100)
    persona_contacto_telefono: Optional[str] = Field(None, max_length=20)
    persona_contacto_cargo: Optional[str] = Field(None, max_length=50)

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    tipo: Optional[TipoCliente] = None
    nombre: Optional[str] = Field(None, max_length=100)
    razon_social: Optional[str] = Field(None, max_length=100)
    nif_cif: Optional[str] = Field(None, max_length=20)
    direccion: Optional[str] = Field(None, max_length=200)
    ciudad: Optional[str] = Field(None, max_length=50)
    codigo_postal: Optional[str] = Field(None, max_length=10)
    pais: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    estado: Optional[EstadoCliente] = None
    condiciones_pago: Optional[str] = Field(None, max_length=50)
    dias_pago: Optional[int] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None
    
    persona_contacto_nombre: Optional[str] = Field(None, max_length=100)
    persona_contacto_email: Optional[str] = Field(None, max_length=100)
    persona_contacto_telefono: Optional[str] = Field(None, max_length=20)
    persona_contacto_cargo: Optional[str] = Field(None, max_length=50)

class Cliente(ClienteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    total_servicios: int = 0
    total_facturado: Decimal = Decimal('0')

# ============== CONDUCTOR SCHEMAS ==============

class Licencia(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    tipo: Optional[str] = None
    numero: Optional[str] = None
    fecha_expedicion: Optional[date] = None
    fecha_caducidad: Optional[date] = None
    permisos: List[str] = []

class Disponibilidad(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    dias: List[int] = Field(default=[1, 2, 3, 4, 5], description="0=Domingo, 1=Lunes...")
    hora_inicio: str = "08:00"
    hora_fin: str = "18:00"
    observaciones: Optional[str] = None

class CredencialesConductor(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    usuario: str
    password: Optional[str] = None

class ConductorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    codigo: Optional[str] = Field(None, max_length=20)
    nombre: str = Field(..., max_length=50)
    apellidos: str = Field(..., max_length=100)
    dni: str = Field(..., max_length=20)
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = Field(None, max_length=200)
    
    # Licencia
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[date] = None
    licencia_fecha_caducidad: Optional[date] = None
    licencia_permisos: List[str] = []
    
    # Tarifas
    tarifa_hora: float = Field(default=18, ge=0)
    tarifa_servicio: Optional[float] = None
    prioridad: int = Field(default=50, ge=0, le=100)
    
    # Disponibilidad
    disponibilidad_dias: List[int] = [1, 2, 3, 4, 5]
    disponibilidad_hora_inicio: str = "08:00"
    disponibilidad_hora_fin: str = "18:00"
    disponibilidad_observaciones: Optional[str] = None
    
    # Credenciales
    credenciales: Optional[CredencialesConductor] = None
    panel_activo: bool = True
    
    # Estadísticas
    total_horas_mes: float = 0
    total_servicios_mes: int = 0
    valoracion: Optional[float] = Field(None, ge=0, le=5)
    
    estado: EstadoConductor = EstadoConductor.ACTIVO
    notas: Optional[str] = None

class ConductorCreate(ConductorBase):
    @field_validator('codigo', mode='before')
    @classmethod
    def set_codigo(cls, v):
        if v is None or v == "":
            return f"COND-{uuid.uuid4().hex[:6].upper()}"
        return v

class ConductorUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    nombre: Optional[str] = Field(None, max_length=50)
    apellidos: Optional[str] = Field(None, max_length=100)
    dni: Optional[str] = Field(None, max_length=20)
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = Field(None, max_length=200)
    
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[date] = None
    licencia_fecha_caducidad: Optional[date] = None
    licencia_permisos: Optional[List[str]] = None
    
    tarifa_hora: Optional[float] = Field(None, ge=0)
    tarifa_servicio: Optional[float] = None
    prioridad: Optional[int] = Field(None, ge=0, le=100)
    
    disponibilidad_dias: Optional[List[int]] = None
    disponibilidad_hora_inicio: Optional[str] = None
    disponibilidad_hora_fin: Optional[str] = None
    disponibilidad_observaciones: Optional[str] = None
    
    credenciales: Optional[CredencialesConductor] = None
    panel_activo: Optional[bool] = None
    
    total_horas_mes: Optional[float] = None
    total_servicios_mes: Optional[int] = None
    valoracion: Optional[float] = Field(None, ge=0, le=5)
    
    estado: Optional[EstadoConductor] = None
    notas: Optional[str] = None

class Conductor(ConductorBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============== VEHICULO SCHEMAS ==============

class ITV(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha_ultima: Optional[date] = None
    fecha_proxima: Optional[date] = None
    resultado: Optional[str] = None
    observaciones: Optional[str] = None

class Seguro(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    compania: Optional[str] = None
    poliza: Optional[str] = None
    tipo_cobertura: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    prima: Optional[float] = None

class Mantenimiento(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    fecha: date
    tipo: str
    descripcion: str
    kilometraje: int = 0
    coste: float = 0
    taller: Optional[str] = None
    piezas_cambiadas: List[str] = []
    proximo_mantenimiento: Optional[date] = None
    observaciones: Optional[str] = None

class VehiculoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    codigo: Optional[str] = Field(None, max_length=20)
    matricula: str = Field(..., max_length=20)
    tipo: TipoVehiculo = TipoVehiculo.AUTOBUS
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    anno_fabricacion: Optional[int] = None
    plazas: int = 0
    
    kilometraje: int = 0
    kilometraje_ultima_revision: Optional[int] = None
    consumo_medio: Optional[float] = None
    combustible: str = "diesel"
    
    itv_fecha_ultima: Optional[date] = None
    itv_fecha_proxima: Optional[date] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[date] = None
    seguro_fecha_vencimiento: Optional[date] = None
    seguro_prima: Optional[float] = None
    
    mantenimientos: List[Mantenimiento] = []
    
    estado: EstadoVehiculo = EstadoVehiculo.OPERATIVO
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    @field_validator('codigo', mode='before')
    @classmethod
    def set_codigo(cls, v):
        if v is None or v == "":
            return f"VH-{uuid.uuid4().hex[:6].upper()}"
        return v

class VehiculoUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    matricula: Optional[str] = Field(None, max_length=20)
    tipo: Optional[TipoVehiculo] = None
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    anno_fabricacion: Optional[int] = None
    plazas: Optional[int] = None
    
    kilometraje: Optional[int] = None
    kilometraje_ultima_revision: Optional[int] = None
    consumo_medio: Optional[float] = None
    combustible: Optional[str] = None
    
    itv_fecha_ultima: Optional[date] = None
    itv_fecha_proxima: Optional[date] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[date] = None
    seguro_fecha_vencimiento: Optional[date] = None
    seguro_prima: Optional[float] = None
    
    mantenimientos: Optional[List[Mantenimiento]] = None
    
    estado: Optional[EstadoVehiculo] = None
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None

class Vehiculo(VehiculoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============== SERVICIO SCHEMAS ==============

class TareaServicio(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    nombre: str
    descripcion: Optional[str] = None
    completada: bool = False
    asignada_a: Optional[str] = None
    fecha_limite: Optional[datetime] = None
    fecha_completada: Optional[datetime] = None
    tipo: Optional[str] = "conductor"

class Incidencia(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    fecha: datetime
    tipo: str
    severidad: str
    descripcion: str
    reportado_por: str
    resuelta: bool = False
    fecha_resolucion: Optional[datetime] = None
    solucion: Optional[str] = None
    coste_adicional: Optional[float] = None

class GastoServicio(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tipo: TipoGasto
    cantidad: Optional[float] = None
    precio: float
    precio_unitario: Optional[float] = None
    notas: Optional[str] = None
    ticket: Optional[str] = None
    fecha: datetime
    conductor_id: Optional[int] = None
    aprobado: bool = False

class RevisionVehiculo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tipo: TipoRevision
    estado: EstadoRevision
    notas: Optional[str] = None
    fotos: List[str] = []
    fecha: datetime
    conductor_id: int
    vehiculo_id: Optional[int] = None

class TrackingRuta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    km_inicio: Optional[int] = None
    km_fin: Optional[int] = None
    km_total: Optional[int] = None
    ruta_tomada: Optional[str] = None
    duracion_real: Optional[int] = None
    incidencias_ruta: Optional[str] = None

class ServicioBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    codigo: Optional[str] = Field(None, max_length=20)
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    tipo: str
    estado: str = "planificando"
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
    
    numero_vehiculos: int = 1
    vehiculos_asignados: List[str] = []
    conductores_asignados: List[str] = []
    
    coste_estimado: float = 0
    coste_real: Optional[float] = None
    precio: float = 0
    facturado: bool = False
    factura_id: Optional[int] = None
    
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    
    rutas: List[Dict[str, Any]] = []
    tareas: List[TareaServicio] = []
    incidencias: List[Incidencia] = []
    documentos: List[Dict[str, Any]] = []
    
    gastos: List[GastoServicio] = []
    revisiones: List[RevisionVehiculo] = []
    tracking: TrackingRuta = {}
    
    creado_por: Optional[str] = None

class ServicioCreate(ServicioBase):
    @field_validator('codigo', mode='before')
    @classmethod
    def set_codigo(cls, v):
        if v is None or v == "":
            return f"SRV-{uuid.uuid4().hex[:6].upper()}"
        return v

class ServicioUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    tipo: Optional[str] = None
    estado: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    
    hora_inicio_real: Optional[datetime] = None
    hora_fin_real: Optional[datetime] = None
    horas_reales: Optional[float] = None
    
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    
    numero_vehiculos: Optional[int] = None
    vehiculos_asignados: Optional[List[str]] = None
    conductores_asignados: Optional[List[str]] = None
    
    coste_estimado: Optional[float] = None
    coste_real: Optional[float] = None
    precio: Optional[float] = None
    facturado: Optional[bool] = None
    factura_id: Optional[int] = None
    
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    
    rutas: Optional[List[Dict[str, Any]]] = None
    tareas: Optional[List[TareaServicio]] = None
    incidencias: Optional[List[Incidencia]] = None
    documentos: Optional[List[Dict[str, Any]]] = None
    
    gastos: Optional[List[GastoServicio]] = None
    revisiones: Optional[List[RevisionVehiculo]] = None
    tracking: Optional[TrackingRuta] = None

class Servicio(ServicioBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None

# ============== FACTURA SCHEMAS ==============

class ConceptoFactura(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    concepto: str
    descripcion: Optional[str] = None
    cantidad: float
    unidad: Optional[str] = None
    precio_unitario: float
    descuento: float = 0
    impuesto: float
    total: float

class FacturaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    numero: str
    serie: str = "A"
    cliente_id: int
    cliente_nombre: Optional[str] = None
    servicio_id: Optional[int] = None
    servicio_codigo: Optional[str] = None
    
    fecha_emision: datetime
    fecha_vencimiento: datetime
    fecha_pago: Optional[datetime] = None
    
    conceptos: List[ConceptoFactura] = []
    
    subtotal: float = 0
    descuento_total: float = 0
    base_imponible: float = 0
    impuestos: float = 0
    iva: float = 21
    total: float = 0
    
    estado: str = "pendiente"
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    
    notas: Optional[str] = None
    condiciones: Optional[str] = None
    pdf_url: Optional[str] = None

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha_vencimiento: Optional[datetime] = None
    fecha_pago: Optional[datetime] = None
    conceptos: Optional[List[ConceptoFactura]] = None
    subtotal: Optional[float] = None
    descuento_total: Optional[float] = None
    base_imponible: Optional[float] = None
    impuestos: Optional[float] = None
    iva: Optional[float] = None
    total: Optional[float] = None
    estado: Optional[str] = None
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    notas: Optional[str] = None
    condiciones: Optional[str] = None
    pdf_url: Optional[str] = None

class Factura(FacturaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

# ============== DASHBOARD SCHEMAS ==============

class KPIDashboard(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    servicios_activos: int
    servicios_hoy: int
    servicios_mes: int
    conductores_disponibles: int
    conductores_ocupados: int
    vehiculos_operativos: int
    vehiculos_taller: int
    facturacion_mes: float
    facturacion_pendiente: float
    servicios_pendientes_facturar: int

# ============== AUTH SCHEMAS ==============

class Token(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    access_token: str
    token_type: str

class TokenData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    username: Optional[str] = None

class LoginRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    username: str
    password: str

# ============== NUEVOS ENUMS - HISTORIAL VEHICULO ==============

class TipoMantenimiento(str, enum.Enum):
    PREVENTIVO = "preventivo"
    CORRECTIVO = "correctivo"
    ITV = "itv"
    NEUMATICOS = "neumaticos"
    ACEITE = "aceite"
    FRENO = "freno"
    ELECTRICO = "electrico"
    CARROCERIA = "carroceria"
    OTRO = "otro"

class EstadoAveria(str, enum.Enum):
    REPORTADA = "reportada"
    EN_DIAGNOSTICO = "en_diagnostico"
    EN_REPARACION = "en_reparacion"
    RESUELTA = "resuelta"
    CANCELADA = "cancelada"

class GravedadAveria(str, enum.Enum):
    LEVE = "leve"
    MEDIA = "media"
    GRAVE = "grave"
    CRITICA = "critica"

class TipoAnotacion(str, enum.Enum):
    INCIDENCIA = "incidencia"
    OBSERVACION = "observacion"
    DANO = "dano"
    LIMPIEZA = "limpieza"
    COMBUSTIBLE = "combustible"
    REVISION = "revision"
    OTRO = "otro"

class EstadoGeneral(str, enum.Enum):
    BUENO = "bueno"
    REGULAR = "regular"
    MALO = "malo"

# ============== MANTENIMIENTO SCHEMAS ==============

class MantenimientoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    tipo: TipoMantenimiento
    fecha: date
    kilometraje: Optional[int] = None
    descripcion: Optional[str] = None
    taller: Optional[str] = None
    coste: Optional[Decimal] = None
    documento_url: Optional[str] = None
    realizado_por: Optional[str] = None
    notas: Optional[str] = None

class MantenimientoCreate(MantenimientoBase):
    vehiculo_id: int

class MantenimientoUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    tipo: Optional[TipoMantenimiento] = None
    fecha: Optional[date] = None
    kilometraje: Optional[int] = None
    descripcion: Optional[str] = None
    taller: Optional[str] = None
    coste: Optional[Decimal] = None
    documento_url: Optional[str] = None
    realizado_por: Optional[str] = None
    notas: Optional[str] = None

class MantenimientoResponse(MantenimientoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============== AVERIA SCHEMAS ==============

class AveriaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    descripcion: str
    gravedad: GravedadAveria = GravedadAveria.MEDIA
    estado: EstadoAveria = EstadoAveria.REPORTADA
    taller: Optional[str] = None
    coste_reparacion: Optional[Decimal] = None
    piezas_cambiadas: List[str] = []
    diagnostico: Optional[str] = None
    solucion: Optional[str] = None
    reportado_por_id: Optional[int] = None
    reportado_por_nombre: Optional[str] = None

class AveriaCreate(AveriaBase):
    vehiculo_id: int

class AveriaUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    descripcion: Optional[str] = None
    gravedad: Optional[GravedadAveria] = None
    estado: Optional[EstadoAveria] = None
    taller: Optional[str] = None
    coste_reparacion: Optional[Decimal] = None
    piezas_cambiadas: Optional[List[str]] = None
    diagnostico: Optional[str] = None
    solucion: Optional[str] = None

class AveriaResponse(AveriaBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============== ANOTACION VEHICULO SCHEMAS ==============

class AnotacionVehiculoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha: datetime
    tipo: TipoAnotacion = TipoAnotacion.OBSERVACION
    descripcion: str
    kilometraje: Optional[int] = None
    nivel_combustible: Optional[int] = Field(None, ge=0, le=100)
    estado_general: EstadoGeneral = EstadoGeneral.BUENO
    fotos: List[str] = []

class AnotacionVehiculoCreate(AnotacionVehiculoBase):
    vehiculo_id: int
    servicio_id: Optional[int] = None
    conductor_id: Optional[int] = None

class AnotacionVehiculoUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    fecha: Optional[datetime] = None
    tipo: Optional[TipoAnotacion] = None
    descripcion: Optional[str] = None
    kilometraje: Optional[int] = None
    nivel_combustible: Optional[int] = Field(None, ge=0, le=100)
    estado_general: Optional[EstadoGeneral] = None
    fotos: Optional[List[str]] = None

class AnotacionVehiculoResponse(AnotacionVehiculoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    vehiculo_id: int
    servicio_id: Optional[int] = None
    conductor_id: Optional[int] = None
    conductor_nombre: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# ============== VEHICULO CON HISTORIAL ==============

class VehiculoHistorial(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    mantenimientos: List[MantenimientoResponse] = []
    averias: List[AveriaResponse] = []
    anotaciones: List[AnotacionVehiculoResponse] = []

class VehiculoDetalleResponse(VehiculoResponse):
    model_config = ConfigDict(from_attributes=True)
    
    historial: VehiculoHistorial = VehiculoHistorial()