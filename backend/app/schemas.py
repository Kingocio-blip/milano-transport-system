from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    activo: bool
    class Config:
        from_attributes = True

class ClienteBase(BaseModel):
    nombre: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    nif: Optional[str] = None
    tipo_cliente: str = "empresa"
    condiciones_pago: str = "30_dias"
    observaciones: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    class Config:
        from_attributes = True

class VehiculoBase(BaseModel):
    matricula: str
    marca: str
    modelo: str
    tipo: str
    capacidad: int
    ano: Optional[int] = None
    color: Optional[str] = None
    estado: str = "disponible"
    kilometraje: int = 0
    observaciones: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoResponse(VehiculoBase):
    id: int
    fecha_registro: datetime
    class Config:
        from_attributes = True

class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    dni: Optional[str] = None
    licencia: str
    tipo_licencia: str = "D"
    estado: str = "disponible"
    observaciones: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class ConductorResponse(ConductorBase):
    id: int
    fecha_registro: datetime
    class Config:
        from_attributes = True

class ServicioBase(BaseModel):
    cliente_id: int
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    origen: str
    destino: str
    fecha_salida: datetime
    tipo: str
    pasajeros: int
    precio_estimado: Optional[float] = None
    precio_final: Optional[float] = None

class ServicioCreate(ServicioBase):
    pass

class ServicioResponse(ServicioBase):
    id: int
    codigo: str
    estado: str
    fecha_creacion: datetime
    class Config:
        from_attributes = True

class FacturaBase(BaseModel):
    cliente_id: int
    servicio_id: Optional[int] = None
    fecha_emision: date
    fecha_vencimiento: date
    subtotal: float = 0
    descuento: float = 0
    impuesto_porcentaje: float = 21

class FacturaCreate(FacturaBase):
    pass

class FacturaResponse(FacturaBase):
    id: int
    numero: str
    impuestos: float
    total: float
    estado: str
    class Config:
        from_attributes = True