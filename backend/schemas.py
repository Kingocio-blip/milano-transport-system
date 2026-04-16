from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import enum

# Enums
class TipoCliente(str, enum.Enum):
    EMPRESA = "empresa"
    PARTICULAR = "particular"

class EstadoCliente(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    PROSPECTO = "prospecto"

class EstadoConductor(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    EN_RUTA = "en_ruta"
    DESCANSO = "descanso"

class EstadoVehiculo(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    EN_MANTENIMIENTO = "en_mantenimiento"
    EN_RUTA = "en_ruta"

class TipoVehiculo(str, enum.Enum):
    CAMION = "camion"
    FURGONETA = "furgoneta"
    TRAILER = "trailer"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"
    CONDUCTOR = "conductor"

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

class User(UserBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None

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

    class Config:
        orm_mode = True

# ============== CONDUCTOR SCHEMAS ==============

class ConductorBase(BaseModel):
    codigo: str
    nombre: str
    apellidos: str
    dni: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    num_licencia: Optional[str] = None
    categoria_licencia: Optional[str] = None
    fecha_vencimiento_licencia: Optional[date] = None
    fecha_vencimiento_adr: Optional[date] = None
    fecha_vencimiento_medico: Optional[date] = None
    estado: EstadoConductor = EstadoConductor.ACTIVO
    fecha_contratacion: Optional[date] = None
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
    num_licencia: Optional[str] = None
    categoria_licencia: Optional[str] = None
    fecha_vencimiento_licencia: Optional[date] = None
    fecha_vencimiento_adr: Optional[date] = None
    fecha_vencimiento_medico: Optional[date] = None
    estado: Optional[EstadoConductor] = None
    fecha_contratacion: Optional[date] = None
    notas: Optional[str] = None

class Conductor(ConductorBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        orm_mode = True

# ============== VEHICULO SCHEMAS ==============

class VehiculoBase(BaseModel):
    codigo: str
    matricula: str
    tipo: TipoVehiculo = TipoVehiculo.CAMION
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anno_fabricacion: Optional[int] = None
    capacidad_kg: Optional[Decimal] = None
    volumen_m3: Optional[Decimal] = None
    longitud_m: Optional[Decimal] = None
    fecha_vencimiento_itv: Optional[date] = None
    fecha_vencimiento_seguro: Optional[date] = None
    num_poliza_seguro: Optional[str] = None
    estado: EstadoVehiculo = EstadoVehiculo.ACTIVO
    fecha_adquisicion: Optional[date] = None
    notas: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(BaseModel):
    matricula: Optional[str] = None
    tipo: Optional[TipoVehiculo] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anno_fabricacion: Optional[int] = None
    capacidad_kg: Optional[Decimal] = None
    volumen_m3: Optional[Decimal] = None
    longitud_m: Optional[Decimal] = None
    fecha_vencimiento_itv: Optional[date] = None
    fecha_vencimiento_seguro: Optional[date] = None
    num_poliza_seguro: Optional[str] = None
    estado: Optional[EstadoVehiculo] = None
    fecha_adquisicion: Optional[date] = None
    notas: Optional[str] = None

class Vehiculo(VehiculoBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        orm_mode = True

# ============== SERVICIO SCHEMAS (NUEVO) ==============

class ServicioBase(BaseModel):
    codigo: str
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
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    numero_vehiculos: int = 1
    vehiculos_asignados: List[int] = []
    conductores_asignados: List[int] = []
    coste_estimado: float = 0
    coste_real: Optional[float] = None
    precio: float = 0
    facturado: bool = False
    factura_id: Optional[int] = None
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    rutas: List[dict] = []
    tareas: List[dict] = []
    incidencias: List[dict] = []
    documentos: List[dict] = []
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
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    numero_vehiculos: Optional[int] = None
    vehiculos_asignados: Optional[List[int]] = None
    conductores_asignados: Optional[List[int]] = None
    coste_estimado: Optional[float] = None
    coste_real: Optional[float] = None
    precio: Optional[float] = None
    facturado: Optional[bool] = None
    factura_id: Optional[int] = None
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    rutas: Optional[List[dict]] = None
    tareas: Optional[List[dict]] = None
    incidencias: Optional[List[dict]] = None
    documentos: Optional[List[dict]] = None

class Servicio(ServicioBase):
    id: int
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None

    class Config:
        orm_mode = True

# ============== AUTH SCHEMAS ==============

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str