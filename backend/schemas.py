from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import enum

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

# ============== USER SCHEMAS ==============

class UserBase(BaseModel):
    username: str
    email: str
    nombre_completo: str
    rol: UserRole = UserRole.OPERADOR

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    rol: Optional[UserRole] = None
    activo: Optional[bool] = None
    conductor_id: Optional[int] = None

class User(UserBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    conductor_id: Optional[int] = None

    class Config:
        orm_mode = True

# ============== CLIENTE SCHEMAS ==============

class ContactoPersona(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    cargo: Optional[str] = None

class ClienteBase(BaseModel):
    codigo: str
    tipo: TipoCliente = TipoCliente.EMPRESA
    nombre: str
    razon_social: Optional[str] = None
    nif_cif: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: str = "España"
    email: Optional[str] = None
    telefono: Optional[str] = None
    estado: EstadoCliente = EstadoCliente.ACTIVO
    condiciones_pago: Optional[str] = None
    dias_pago: Optional[int] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None
    
    persona_contacto_nombre: Optional[str] = None
    persona_contacto_email: Optional[str] = None
    persona_contacto_telefono: Optional[str] = None
    persona_contacto_cargo: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    tipo: Optional[TipoCliente] = None
    nombre: Optional[str] = None
    razon_social: Optional[str] = None
    nif_cif: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    estado: Optional[EstadoCliente] = None
    condiciones_pago: Optional[str] = None
    dias_pago: Optional[int] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None
    
    persona_contacto_nombre: Optional[str] = None
    persona_contacto_email: Optional[str] = None
    persona_contacto_telefono: Optional[str] = None
    persona_contacto_cargo: Optional[str] = None

class Cliente(ClienteBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    total_servicios: int = 0
    total_facturado: Decimal = 0

    class Config:
        orm_mode = True

# ============== CONDUCTOR SCHEMAS (ACTUALIZADO) ==============

class Licencia(BaseModel):
    tipo: Optional[str] = None
    numero: Optional[str] = None
    fecha_expedicion: Optional[date] = None
    fecha_caducidad: Optional[date] = None
    permisos: List[str] = []

class Disponibilidad(BaseModel):
    dias: List[int] = [1, 2, 3, 4, 5]  # 0=Domingo, 1=Lunes...
    hora_inicio: str = "08:00"
    hora_fin: str = "18:00"
    observaciones: Optional[str] = None

class CredencialesConductor(BaseModel):
    usuario: str
    password: Optional[str] = None  # Solo para creación

class ConductorBase(BaseModel):
    codigo: str
    nombre: str
    apellidos: str
    dni: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    
    # Licencia (campos planos para compatibilidad)
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[date] = None
    licencia_fecha_caducidad: Optional[date] = None
    licencia_permisos: List[str] = []
    
    # Tarifas y prioridad
    tarifa_hora: float = 18
    tarifa_servicio: Optional[float] = None
    prioridad: int = 50  # 0-100
    
    # Disponibilidad
    disponibilidad_dias: List[int] = [1, 2, 3, 4, 5]
    disponibilidad_hora_inicio: str = "08:00"
    disponibilidad_hora_fin: str = "18:00"
    disponibilidad_observaciones: Optional[str] = None
    
    # Credenciales y panel
    credenciales: Optional[CredencialesConductor] = None
    panel_activo: bool = True
    
    # Estadísticas
    total_horas_mes: float = 0
    total_servicios_mes: int = 0
    valoracion: Optional[float] = None  # 0-5
    
    estado: EstadoConductor = EstadoConductor.ACTIVO
    notas: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class ConductorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    dni: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[date] = None
    licencia_fecha_caducidad: Optional[date] = None
    licencia_permisos: Optional[List[str]] = None
    
    tarifa_hora: Optional[float] = None
    tarifa_servicio: Optional[float] = None
    prioridad: Optional[int] = None
    
    disponibilidad_dias: Optional[List[int]] = None
    disponibilidad_hora_inicio: Optional[str] = None
    disponibilidad_hora_fin: Optional[str] = None
    disponibilidad_observaciones: Optional[str] = None
    
    credenciales: Optional[CredencialesConductor] = None
    panel_activo: Optional[bool] = None
    
    total_horas_mes: Optional[float] = None
    total_servicios_mes: Optional[int] = None
    valoracion: Optional[float] = None
    
    estado: Optional[EstadoConductor] = None
    notas: Optional[str] = None

class Conductor(ConductorBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        orm_mode = True

# ============== VEHICULO SCHEMAS (ACTUALIZADO) ==============

class ITV(BaseModel):
    fecha_ultima: Optional[date] = None
    fecha_proxima: Optional[date] = None
    resultado: Optional[str] = None
    observaciones: Optional[str] = None

class Seguro(BaseModel):
    compania: Optional[str] = None
    poliza: Optional[str] = None
    tipo_cobertura: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    prima: Optional[float] = None

class Mantenimiento(BaseModel):
    id: str
    fecha: date
    tipo: str
    descripcion: str
    kilometraje: int
    coste: float
    taller: Optional[str] = None
    piezas_cambiadas: List[str] = []
    proximo_mantenimiento: Optional[date] = None
    observaciones: Optional[str] = None

class VehiculoBase(BaseModel):
    codigo: str
    matricula: str
    tipo: TipoVehiculo = TipoVehiculo.AUTOBUS
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anno_fabricacion: Optional[int] = None
    plazas: int = 0
    
    # Kilometraje y consumo
    kilometraje: int = 0
    kilometraje_ultima_revision: Optional[int] = None
    consumo_medio: Optional[float] = None
    combustible: str = "diesel"
    
    # ITV
    itv_fecha_ultima: Optional[date] = None
    itv_fecha_proxima: Optional[date] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    
    # Seguro
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[date] = None
    seguro_fecha_vencimiento: Optional[date] = None
    seguro_prima: Optional[float] = None
    
    # Mantenimientos
    mantenimientos: List[Mantenimiento] = []
    
    estado: EstadoVehiculo = EstadoVehiculo.OPERATIVO
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(BaseModel):
    matricula: Optional[str] = None
    tipo: Optional[TipoVehiculo] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
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
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        orm_mode = True

# ============== SERVICIO SCHEMAS (ACTUALIZADO) ==============

class TareaServicio(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    completada: bool = False
    asignada_a: Optional[str] = None
    fecha_limite: Optional[datetime] = None
    fecha_completada: Optional[datetime] = None
    tipo: Optional[str] = "conductor"  # conductor, sistema, coordinador

class Incidencia(BaseModel):
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
    id: str
    tipo: TipoGasto
    cantidad: Optional[float] = None  # litros para gasoil, horas para parking...
    precio: float
    precio_unitario: Optional[float] = None
    notas: Optional[str] = None
    ticket: Optional[str] = None  # URL de foto
    fecha: datetime
    conductor_id: Optional[int] = None
    aprobado: bool = False

class RevisionVehiculo(BaseModel):
    id: str
    tipo: TipoRevision
    estado: EstadoRevision
    notas: Optional[str] = None
    fotos: List[str] = []
    fecha: datetime
    conductor_id: int
    vehiculo_id: Optional[int] = None

class TrackingRuta(BaseModel):
    km_inicio: Optional[int] = None
    km_fin: Optional[int] = None
    km_total: Optional[int] = None
    ruta_tomada: Optional[str] = None
    duracion_real: Optional[int] = None  # minutos
    incidencias_ruta: Optional[str] = None

class ServicioBase(BaseModel):
    codigo: str
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    tipo: str
    estado: str = "planificando"
    titulo: str
    descripcion: Optional[str] = None
    
    # Fechas
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    
    # Horas reales (fichaje)
    hora_inicio_real: Optional[datetime] = None
    hora_fin_real: Optional[datetime] = None
    horas_reales: Optional[float] = None
    
    # Ubicación
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    
    # Vehículos y conductores
    numero_vehiculos: int = 1
    vehiculos_asignados: List[str] = []  # IDs como strings
    conductores_asignados: List[str] = []  # IDs como strings
    
    # Financiero
    coste_estimado: float = 0
    coste_real: Optional[float] = None
    precio: float = 0
    facturado: bool = False
    factura_id: Optional[int] = None
    
    # Notas
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    
    # Datos estructurados
    rutas: List[dict] = []
    tareas: List[TareaServicio] = []
    incidencias: List[Incidencia] = []
    documentos: List[dict] = []
    
    # NUEVO: Gastos, revisiones y tracking
    gastos: List[GastoServicio] = []
    revisiones: List[RevisionVehiculo] = []
    tracking: TrackingRuta = {}
    
    creado_por: Optional[str] = None

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
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
    
    rutas: Optional[List[dict]] = None
    tareas: Optional[List[TareaServicio]] = None
    incidencias: Optional[List[Incidencia]] = None
    documentos: Optional[List[dict]] = None
    
    gastos: Optional[List[GastoServicio]] = None
    revisiones: Optional[List[RevisionVehiculo]] = None
    tracking: Optional[TrackingRuta] = None

class Servicio(ServicioBase):
    id: int
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None

    class Config:
        orm_mode = True

# ============== FACTURA SCHEMAS (NUEVO) ==============

class ConceptoFactura(BaseModel):
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
    
    estado: str = "pendiente"  # pendiente, enviada, pagada, vencida, anulada
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    
    notas: Optional[str] = None
    condiciones: Optional[str] = None
    pdf_url: Optional[str] = None

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
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
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        orm_mode = True

# ============== DASHBOARD SCHEMAS ==============

class KPIDashboard(BaseModel):
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
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str