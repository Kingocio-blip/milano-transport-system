from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    conductor = "conductor"

# User schemas
class UserBase(BaseModel):
    username: str
    rol: UserRole = UserRole.conductor

class UserCreate(UserBase):
    password: str
    conductor_id: Optional[int] = None

class User(UserBase):
    id: int
    conductor_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    rol: UserRole
    conductor_id: Optional[int] = None

# Conductor schemas
class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    dni: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    fecha_contratacion: Optional[date] = None
    licencia_conducir: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class Conductor(ConductorBase):
    id: int
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True

class ConductorSimple(BaseModel):
    id: int
    nombre: str
    apellidos: str
    
    class Config:
        from_attributes = True

# Cliente schemas
class ClienteBase(BaseModel):
    nombre: str
    apellidos: str
    dni: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    id: int
    fecha_registro: datetime
    
    class Config:
        from_attributes = True

class ClienteSimple(BaseModel):
    id: int
    nombre: str
    apellidos: str
    telefono: Optional[str] = None
    
    class Config:
        from_attributes = True

# Servicio schemas
class ServicioBase(BaseModel):
    cliente_id: int
    conductor_id: Optional[int] = None
    origen: str
    destino: str
    fecha: date
    hora: time
    precio: float
    estado: str = "pendiente"

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    cliente_id: Optional[int] = None
    conductor_id: Optional[int] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    fecha: Optional[date] = None
    hora: Optional[time] = None
    precio: Optional[float] = None
    estado: Optional[str] = None

class Servicio(ServicioBase):
    id: int
    fecha_creacion: datetime
    cliente: Optional[ClienteSimple] = None
    conductor: Optional[ConductorSimple] = None
    
    class Config:
        from_attributes = True

# Vehiculo schemas
class VehiculoBase(BaseModel):
    matricula: str
    marca: str
    modelo: str
    anno_fabricacion: Optional[int] = None
    tipo: Optional[str] = None
    capacidad_pasajeros: Optional[int] = None
    fecha_adquisicion: Optional[date] = None
    estado: str = "activo"

class VehiculoCreate(VehiculoBase):
    pass

class Vehiculo(VehiculoBase):
    id: int
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True