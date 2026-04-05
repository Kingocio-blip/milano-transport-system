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

class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    activo: bool
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

# ========== CONDUCTOR ==========
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

# ========== SERVICIO (AMPLIADO) ==========
class ServicioBase(BaseModel):
    cliente_id: int
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    
    # Datos del servicio
    origen: str
    origen_direccion: Optional[str] = None
    destino: str
    destino_direccion: Optional[str] = None
    fecha_salida: datetime
    fecha_llegada_estimada: Optional[datetime] = None
    
    # Tipo y detalles
    tipo: str
    pasajeros: int
    equipaje: Optional[str] = None
    descripcion: Optional[str] = None
    
    # Precios
    precio_estimado: Optional[float] = 0
    precio_final: Optional[float] = 0
    moneda: str = "EUR"
    
    # Gastos (para rentabilidad)
    gasto_conductor: Optional[float] = 0
    gasto_auxiliar: Optional[float] = 0
    gasto_gasoil: Optional[float] = 0
    gasto_peajes: Optional[float] = 0
    gasto_otros: Optional[float] = 0
    
    # Estado
    estado: str = "pendiente"
    observaciones: Optional[str] = None
    instrucciones: Optional[str] = None

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    # Para actualizar solo ciertos campos
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

# ========== FACTURA (AMPLIADO) ==========
class FacturaBase(BaseModel):
    cliente_id: int
    servicio_id: Optional[int] = None
    
    # Fechas
    fecha_emision: date
    fecha_vencimiento: date
    
    # Importes
    subtotal: float = 0
    descuento: float = 0
    impuesto_porcentaje: float = 10  # 10% por defecto para transporte
    
    # Pago
    metodo_pago: Optional[str] = None  # transferencia, tarjeta, efectivo, bizum
    forma_pago: Optional[str] = None   # "Transferencia - 30 días"
    
    # Datos bancarios
    iban: Optional[str] = None
    qr_pago: Optional[str] = None
    
    # Notas
    notas: Optional[str] = None
    notas_cliente: Optional[str] = None
    terminos: Optional[str] = None

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
    # Para actualizar estado de pago
    estado: Optional[str] = None  # pendiente, pagada, vencida, anulada
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