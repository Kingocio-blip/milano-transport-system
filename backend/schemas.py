from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

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
    dni: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    notas: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    fecha_registro: Optional[datetime] = None
    
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