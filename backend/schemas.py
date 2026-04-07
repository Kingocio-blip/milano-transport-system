from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
import re

# ==================== AUTH ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    
    class Config:
        from_attributes = True

class TokenWithUser(Token):
    user: dict

# ==================== USER ====================

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    role: str = "conductor"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    conductor_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ==================== CLIENTE ====================

class ClienteBase(BaseModel):
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    cif: Optional[str] = None
    tipo: str = "particular"
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    persona_contacto: Optional[str] = None
    notas: Optional[str] = None

    @validator('dni')
    def validar_dni(cls, v, values):
        if v and values.get('tipo') == 'particular':
            # Validar formato DNI español (8 números + letra)
            if not re.match(r'^\d{8}[A-HJ-NP-TV-Z]$', v.upper()):
                raise ValueError('DNI inválido. Formato: 12345678A')
            # Validar letra
            letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
            numero = int(v[:-1])
            letra_correcta = letras[numero % 23]
            if v[-1].upper() != letra_correcta:
                raise ValueError(f'Letra de DNI incorrecta. Debería ser: {letra_correcta}')
        return v.upper() if v else v

    @validator('cif')
    def validar_cif(cls, v, values):
        if v and values.get('tipo') in ['autonomo', 'empresa']:
            # Validar formato CIF (letra + 7 números + dígito de control)
            if not re.match(r'^[A-HJ-NP-SW]\d{7}[0-9A-J]$', v.upper()):
                raise ValueError('CIF inválido')
        return v.upper() if v else v

    @validator('tipo')
    def validar_tipo_documento(cls, v, values):
        if v == 'particular' and not values.get('dni'):
            raise ValueError('Los particulares deben tener DNI')
        if v in ['autonomo', 'empresa'] and not values.get('cif'):
            raise ValueError('Autónomos y empresas deben tener CIF')
        return v

class ClienteCreate(ClienteBase):
    pass

class ClienteServicio(BaseModel):
    id: int
    fecha_inicio: date
    origen: str
    destino: str
    precio: float
    estado: str
    
    class Config:
        from_attributes = True

class ClienteDetalle(BaseModel):
    id: int
    codigo: str
    nombre: str
    apellidos: str
    dni: Optional[str]
    cif: Optional[str]
    tipo: str
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    ciudad: Optional[str]
    codigo_postal: Optional[str]
    persona_contacto: Optional[str]
    notas: Optional[str]
    fecha_registro: Optional[datetime]
    total_servicios: int = 0
    total_facturado: float = 0.0
    servicios_recientes: List[ClienteServicio] = []
    es_frecuente: bool = False
    es_vip: bool = False
    
    class Config:
        from_attributes = True

class ClienteResponse(ClienteBase):
    id: int
    codigo: str
    fecha_registro: Optional[datetime] = None
    total_servicios: int = 0
    total_facturado: float = 0.0
    es_frecuente: bool = False
    es_vip: bool = False
    
    class Config:
        from_attributes = True

# ==================== CONDUCTOR ====================

class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    dni: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    licencia_conducir: Optional[str] = None
    fecha_vencimiento_licencia: Optional[date] = None
    estado: str = "activo"

class ConductorCreate(ConductorBase):
    pass

class ConductorResponse(ConductorBase):
    id: int
    fecha_contratacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ConductorWithCredentials(ConductorResponse):
    credentials: Optional[dict] = None

# ==================== VEHICULO ====================

class VehiculoBase(BaseModel):
    matricula: str
    marca: str
    modelo: str
    tipo: str = "autobus"
    capacidad_pasajeros: int = 50
    anno_fabricacion: Optional[int] = None
    estado: str = "disponible"

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoResponse(VehiculoBase):
    id: int
    
    class Config:
        from_attributes = True

# ==================== SERVICIO ====================

class ServicioBase(BaseModel):
    cliente_id: int
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    tipo_servicio: str = "transfer"
    origen: str
    destino: str
    fecha_inicio: date
    hora_inicio: str
    fecha_fin: Optional[date] = None
    hora_fin: Optional[str] = None
    numero_pasajeros: int = 1
    precio: float = 0
    gastos_combustible: Optional[float] = 0
    gastos_peaje: Optional[float] = 0
    gastos_otros: Optional[float] = 0
    notas: Optional[str] = None
    estado: str = "pendiente"

class ServicioCreate(ServicioBase):
    pass

class ServicioResponse(ServicioBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ==================== FACTURA ====================

class FacturaBase(BaseModel):
    cliente_id: int
    servicio_id: Optional[int] = None
    fecha_emision: date
    fecha_vencimiento: date
    concepto: Optional[str] = None
    importe_base: float
    tipo_iva: int = 21
    estado: str = "pendiente"

class FacturaCreate(FacturaBase):
    pass

class FacturaResponse(FacturaBase):
    id: int
    importe_iva: float
    importe_total: float
    fecha_creacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True