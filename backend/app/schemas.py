from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# ========== USUARIO ==========
class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UsuarioBase(BaseModel):
    email: EmailStr
    nombre: str
    rol: str = "conductor"  # admin, conductor

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    class Config:
        from_attributes = True

# ========== CLIENTE ==========
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

# ========== VEHICULO ==========
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

# ========== CONDUCTOR (AMPLIADO) ==========
class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    dni: Optional[str] = None
    licencia: str
    tipo_licencia: str = "D"
    fecha_nacimiento: Optional[date] = None
    
    # Datos laborales
    fecha_contratacion: Optional[date] = None
    tipo_contrato: str = "indefinido"
    salario_base_hora: float = 12.0
    
    # Contacto
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    
    estado: str = "disponible"
    observaciones: Optional[str] = None

class ConductorCreate(ConductorBase):
    usuario_id: Optional[int] = None  # Para vincular con usuario de login

class ConductorResponse(ConductorBase):
    id: int
    usuario_id: Optional[int] = None
    fecha_registro: datetime
    class Config:
        from_attributes = True

# ========== FICHAJE (NUEVO) ==========
class FichajeBase(BaseModel):
    conductor_id: int
    servicio_id: Optional[int] = None
    tipo: str  # entrada, salida, inicio_servicio, fin_servicio
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    notas: Optional[str] = None

class FichajeCreate(FichajeBase):
    pass

class FichajeResponse(FichajeBase):
    id: int
    fecha_hora: datetime
    class Config:
        from_attributes = True

# ========== SERVICIO ==========
class ServicioBase(BaseModel):
    cliente_id: int
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    
    origen: str
    origen_direccion: Optional[str] = None
    destino: str
    destino_direccion: Optional[str] = None
    fecha_salida: datetime
    fecha_llegada_estimada: Optional[datetime] = None
    
    tipo: str
    pasajeros: int
    equipaje: Optional[str] = None
    descripcion: Optional[str] = None
    
    precio_estimado: Optional[float] = 0
    precio_final: Optional[float] = 0
    moneda: str = "EUR"
    
    gasto_conductor: Optional[float] = 0
    gasto_auxiliar: Optional[float] = 0
    gasto_gasoil: Optional[float] = 0
    gasto_peajes: Optional[float] = 0
    gasto_otros: Optional[float] = 0
    
    estado: str = "pendiente"
    observaciones: Optional[str] = None
    instrucciones: Optional[str] = None

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    fecha_llegada_real: Optional[datetime] = None
    precio_final: Optional[float] = None
    gasto_conductor: Optional[float] = None
    gasto_auxiliar: Optional[float] = None
    gasto_gasoil: Optional[float] = None
    gasto_peajes: Optional[float] = None
    gasto_otros: Optional[float] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None

class ServicioResponse(ServicioBase):
    id: int
    codigo: str
    facturado: bool
    factura_id: Optional[int] = None
    fecha_creacion: datetime
    class Config:
        from_attributes = True

# ========== FACTURA ==========
class FacturaBase(BaseModel):
    cliente_id: int
    servicio_id: Optional[int] = None
    
    fecha_emision: date
    fecha_vencimiento: date
    
    subtotal: float = 0
    descuento: float = 0
    impuesto_porcentaje: float = 10
    
    metodo_pago: Optional[str] = None
    forma_pago: Optional[str] = None
    
    iban: Optional[str] = None
    notas: Optional[str] = None
    notas_cliente: Optional[str] = None
    terminos: Optional[str] = None

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_pago: Optional[date] = None
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None

class FacturaResponse(FacturaBase):
    id: int
    numero: str
    impuestos: float
    total: float
    estado: str
    fecha_pago: Optional[date] = None
    fecha_creacion: datetime
    class Config:
        from_attributes = True

# ========== DASHBOARD STATS ==========
class DashboardStats(BaseModel):
    total_clientes: int
    total_vehiculos: int
    total_conductores: int
    servicios_pendientes: int
    servicios_completados: int
    servicios_facturados: int
    facturas_pendientes: int
    facturas_pagadas: int
    ingresos_mes: float
    gastos_mes: float
    beneficio_mes: float