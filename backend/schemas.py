"""
MILANO - Pydantic Schemas
Request and response models for API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============================================
# AUTH SCHEMAS
# ============================================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ============================================
# CLIENTE SCHEMAS
# ============================================

class ClienteBase(BaseModel):
    nombre: str
    tipo: str = "empresa"
    nif: Optional[str] = None
    
    # Contacto de la empresa
    contacto_email: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_direccion: Optional[str] = None
    contacto_ciudad: Optional[str] = None
    contacto_codigo_postal: Optional[str] = None
    
    # Persona de contacto principal
    persona_contacto_nombre: Optional[str] = None
    persona_contacto_email: Optional[str] = None
    persona_contacto_telefono: Optional[str] = None
    persona_contacto_cargo: Optional[str] = None
    
    # Información adicional
    web: Optional[str] = None
    observaciones: Optional[str] = None
    forma_pago: str = "transferencia"
    dias_pago: int = 30
    condiciones_especiales: Optional[str] = None
    estado: str = "activo"

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    nif: Optional[str] = None
    
    contacto_email: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_direccion: Optional[str] = None
    contacto_ciudad: Optional[str] = None
    contacto_codigo_postal: Optional[str] = None
    
    persona_contacto_nombre: Optional[str] = None
    persona_contacto_email: Optional[str] = None
    persona_contacto_telefono: Optional[str] = None
    persona_contacto_cargo: Optional[str] = None
    
    web: Optional[str] = None
    observaciones: Optional[str] = None
    forma_pago: Optional[str] = None
    dias_pago: Optional[int] = None
    condiciones_especiales: Optional[str] = None
    estado: Optional[str] = None

class ClienteResponse(ClienteBase):
    id: int
    fecha_alta: datetime
    fecha_modificacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# CONDUCTOR SCHEMAS
# ============================================

class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    
    # Licencia
    licencia_tipo: str = "D"
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[datetime] = None
    licencia_fecha_caducidad: Optional[datetime] = None
    licencia_permisos: Optional[List[str]] = None
    
    # Tarifas
    tarifa_hora: float = 18.0
    tarifa_servicio: Optional[float] = None
    
    # Disponibilidad
    disponibilidad_dias: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    disponibilidad_hora_inicio: str = "08:00"
    disponibilidad_hora_fin: str = "18:00"
    disponibilidad_observaciones: Optional[str] = None
    
    # Estadísticas
    total_horas_mes: float = 0
    total_servicios_mes: int = 0
    
    estado: str = "activo"
    notas: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class ConductorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    dni: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_fecha_expedicion: Optional[datetime] = None
    licencia_fecha_caducidad: Optional[datetime] = None
    licencia_permisos: Optional[List[str]] = None
    
    tarifa_hora: Optional[float] = None
    tarifa_servicio: Optional[float] = None
    
    disponibilidad_dias: Optional[List[int]] = None
    disponibilidad_hora_inicio: Optional[str] = None
    disponibilidad_hora_fin: Optional[str] = None
    disponibilidad_observaciones: Optional[str] = None
    
    estado: Optional[str] = None
    notas: Optional[str] = None

class ConductorResponse(ConductorBase):
    id: int
    codigo: Optional[str] = None
    fecha_alta: datetime
    fecha_modificacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# VEHICULO SCHEMAS
# ============================================

class VehiculoBase(BaseModel):
    matricula: str
    bastidor: Optional[str] = None
    marca: str
    modelo: str
    tipo: str = "autobus"
    plazas: int = 50
    año_fabricacion: Optional[int] = None
    
    kilometraje: int = 0
    kilometraje_ultima_revision: Optional[int] = None
    
    consumo_medio: Optional[float] = None
    combustible: str = "diesel"
    
    estado: str = "operativo"
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None
    
    # ITV
    itv_fecha_ultima: Optional[datetime] = None
    itv_fecha_proxima: Optional[datetime] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    
    # Seguro
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[datetime] = None
    seguro_fecha_vencimiento: Optional[datetime] = None
    seguro_prima: Optional[float] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(BaseModel):
    matricula: Optional[str] = None
    bastidor: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    tipo: Optional[str] = None
    plazas: Optional[int] = None
    año_fabricacion: Optional[int] = None
    
    kilometraje: Optional[int] = None
    kilometraje_ultima_revision: Optional[int] = None
    
    consumo_medio: Optional[float] = None
    combustible: Optional[str] = None
    
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None
    
    itv_fecha_ultima: Optional[datetime] = None
    itv_fecha_proxima: Optional[datetime] = None
    itv_resultado: Optional[str] = None
    itv_observaciones: Optional[str] = None
    
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_tipo_cobertura: Optional[str] = None
    seguro_fecha_inicio: Optional[datetime] = None
    seguro_fecha_vencimiento: Optional[datetime] = None
    seguro_prima: Optional[float] = None

class VehiculoResponse(VehiculoBase):
    id: int
    mantenimientos: List[Dict[str, Any]] = Field(default_factory=list)
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SERVICIO SCHEMAS
# ============================================

class ServicioBase(BaseModel):
    cliente_id: Optional[int] = None
    tipo: str = "traslado"
    estado: str = "planificado"
    
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    
    titulo: str
    descripcion: Optional[str] = None
    
    numero_vehiculos: int = 1
    vehiculos_asignados: List[int] = Field(default_factory=list)
    conductores_asignados: List[int] = Field(default_factory=list)
    
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    
    coste_estimado: float = 0
    coste_real: Optional[float] = None
    precio: float = 0
    
    facturado: bool = False
    factura_id: Optional[int] = None
    
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    
    rutas: List[Dict[str, Any]] = Field(default_factory=list)
    tareas: List[Dict[str, Any]] = Field(default_factory=list)
    incidencias: List[Dict[str, Any]] = Field(default_factory=list)
    documentos: List[Dict[str, Any]] = Field(default_factory=list)

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    cliente_id: Optional[int] = None
    tipo: Optional[str] = None
    estado: Optional[str] = None
    
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    
    numero_vehiculos: Optional[int] = None
    vehiculos_asignados: Optional[List[int]] = None
    conductores_asignados: Optional[List[int]] = None
    
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    
    coste_estimado: Optional[float] = None
    coste_real: Optional[float] = None
    precio: Optional[float] = None
    
    facturado: Optional[bool] = None
    factura_id: Optional[int] = None
    
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None
    
    rutas: Optional[List[Dict[str, Any]]] = None
    tareas: Optional[List[Dict[str, Any]]] = None
    incidencias: Optional[List[Dict[str, Any]]] = None
    documentos: Optional[List[Dict[str, Any]]] = None

class ServicioResponse(ServicioBase):
    id: int
    codigo: str
    cliente_nombre: Optional[str] = None
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None
    creado_por: Optional[int] = None
    
    class Config:
        from_attributes = True

# ============================================
# USUARIO SCHEMAS
# ============================================

class UsuarioBase(BaseModel):
    username: str
    email: str
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    rol: str = "admin"
    activo: bool = True

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# FACTURA SCHEMAS
# ============================================

class FacturaBase(BaseModel):
    cliente_id: Optional[int] = None
    fecha_vencimiento: Optional[datetime] = None
    subtotal: float = 0
    impuestos: float = 0
    total: float = 0
    estado: str = "pendiente"
    servicios_ids: List[int] = Field(default_factory=list)
    notas: Optional[str] = None

class FacturaCreate(FacturaBase):
    pass

class FacturaUpdate(BaseModel):
    cliente_id: Optional[int] = None
    fecha_vencimiento: Optional[datetime] = None
    subtotal: Optional[float] = None
    impuestos: Optional[float] = None
    total: Optional[float] = None
    estado: Optional[str] = None
    servicios_ids: Optional[List[int]] = None
    notas: Optional[str] = None

class FacturaResponse(FacturaBase):
    id: int
    numero: str
    fecha_emision: datetime
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None
    creado_por: Optional[int] = None
    
    class Config:
        from_attributes = True
