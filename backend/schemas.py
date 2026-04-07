from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==================== USUARIOS ====================

class UsuarioBase(BaseModel):
    username: str
    nombre: str
    rol: str = "conductor"
    activo: bool = True

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_creacion: datetime
    ultimo_acceso: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UsuarioResponse

# ==================== CONTACTO ====================

class Contacto(BaseModel):
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    codigoPostal: Optional[str] = None

# ==================== CONDUCTORES ====================

class ConductorBase(BaseModel):
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    licencia_tipo: Optional[str] = None
    licencia_numero: Optional[str] = None
    licencia_caducidad: Optional[datetime] = None
    fecha_nacimiento: Optional[datetime] = None
    tarifa_hora: float = 0.0
    estado: str = "activo"
    notas: Optional[str] = None

class ConductorCreate(ConductorBase):
    pass

class ConductorUpdate(ConductorBase):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None

class ConductorResponse(ConductorBase):
    id: int
    codigo: Optional[str] = None
    fecha_alta: datetime
    
    class Config:
        from_attributes = True

# ==================== VEHICULOS ====================

class VehiculoBase(BaseModel):
    matricula: str
    bastidor: Optional[str] = None
    marca: str
    modelo: str
    tipo: Optional[str] = None
    plazas: Optional[int] = None
    anno_fabricacion: Optional[int] = None
    combustible: Optional[str] = None
    kilometraje: int = 0
    itv_fecha_ultima: Optional[datetime] = None
    itv_fecha_proxima: Optional[datetime] = None
    itv_resultado: Optional[str] = None
    seguro_compania: Optional[str] = None
    seguro_poliza: Optional[str] = None
    seguro_fecha_vencimiento: Optional[datetime] = None
    estado: str = "operativo"
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen_url: Optional[str] = None

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(VehiculoBase):
    matricula: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None

class VehiculoResponse(VehiculoBase):
    id: int
    
    class Config:
        from_attributes = True

# ==================== CLIENTES ====================

class ClienteBase(BaseModel):
    nombre: str
    tipo: str = "particular"  # festival, promotor, colegio, empresa, particular
    nif: Optional[str] = None
    condiciones_especiales: Optional[str] = None
    forma_pago: Optional[str] = None
    dias_pago: int = 30
    estado: str = "activo"
    notas: Optional[str] = None

class ClienteCreate(ClienteBase):
    contacto: Optional[Contacto] = None

class ClienteUpdate(ClienteBase):
    nombre: Optional[str] = None
    contacto: Optional[Contacto] = None

class ClienteResponse(ClienteBase):
    id: int
    codigo: Optional[str] = None
    fecha_alta: datetime
    # Contacto como campos individuales que se mapean al objeto
    contacto_email: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_direccion: Optional[str] = None
    contacto_ciudad: Optional[str] = None
    contacto_codigo_postal: Optional[str] = None
    
    class Config:
        from_attributes = True
    
    # Propiedad para compatibilidad con frontend
    @property
    def contacto(self) -> Contacto:
        return Contacto(
            email=self.contacto_email,
            telefono=self.contacto_telefono,
            direccion=self.contacto_direccion,
            ciudad=self.contacto_ciudad,
            codigoPostal=self.contacto_codigo_postal
        )

class ClienteWithStats(ClienteResponse):
    total_servicios: int = 0
    total_facturado: float = 0.0
    ultimo_servicio: Optional[datetime] = None

# ==================== SERVICIOS ====================

class ServicioBase(BaseModel):
    cliente_id: int
    tipo: str = "lanzadera"
    estado: str = "solicitud"
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    numero_vehiculos: int = 1
    origen: Optional[str] = None
    destino: Optional[str] = None
    ubicacion_evento: Optional[str] = None
    coste_estimado: float = 0.0
    precio: float = 0.0
    notas_internas: Optional[str] = None
    notas_cliente: Optional[str] = None

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    cliente_id: Optional[int] = None
    conductor_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    estado: Optional[str] = None
    precio: Optional[float] = None
    coste_real: Optional[float] = None

class ServicioResponse(ServicioBase):
    id: int
    codigo: Optional[str] = None
    coste_real: float = 0.0
    margen: float = 0.0
    facturado: bool = False
    factura_id: Optional[int] = None
    fecha_creacion: datetime
    creado_por: Optional[str] = None
    
    cliente: Optional[ClienteResponse] = None
    conductor: Optional[ConductorResponse] = None
    vehiculo: Optional[VehiculoResponse] = None
    
    class Config:
        from_attributes = True

# ==================== FACTURAS ====================

class ConceptoFactura(BaseModel):
    id: str
    concepto: str
    descripcion: Optional[str] = None
    cantidad: float
    unidad: Optional[str] = None
    precio_unitario: float
    descuento: float = 0.0
    impuesto: float
    total: float

class FacturaBase(BaseModel):
    cliente_id: int
    servicio_id: Optional[int] = None
    serie: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None
    subtotal: float = 0.0
    descuento_total: float = 0.0
    base_imponible: float = 0.0
    impuestos: float = 0.0
    total: float = 0.0
    estado: str = "pendiente"
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    notas: Optional[str] = None
    condiciones: Optional[str] = None
    pdf_url: Optional[str] = None

class FacturaCreate(FacturaBase):
    conceptos: List[ConceptoFactura] = []

class FacturaUpdate(BaseModel):
    estado: Optional[str] = None
    metodo_pago: Optional[str] = None
    fecha_pago: Optional[datetime] = None

class FacturaResponse(FacturaBase):
    id: int
    numero: Optional[str] = None
    fecha_emision: datetime
    fecha_pago: Optional[datetime] = None
    
    cliente: Optional[ClienteResponse] = None
    servicio: Optional[ServicioResponse] = None
    conceptos: List[ConceptoFactura] = []
    
    class Config:
        from_attributes = True

# ==================== ESTADISTICAS ====================

class DashboardStats(BaseModel):
    total_servicios_hoy: int
    total_servicios_mes: int
    servicios_pendientes: int
    total_facturado_mes: float
    total_pendiente_cobro: float
    conductores_activos: int
    vehiculos_disponibles: int
    total_clientes: int

class ServicioReciente(BaseModel):
    id: int
    codigo: str
    cliente_nombre: str
    origen: str
    destino: str
    fecha_servicio: datetime
    estado: str
    total: float

class KPIDashboard(BaseModel):
    serviciosActivos: int
    serviciosHoy: int
    serviciosMes: int
    conductoresDisponibles: int
    conductoresOcupados: int
    vehiculosOperativos: int
    vehiculosTaller: int
    facturacionMes: float
    facturacionPendiente: float
    serviciosPendientesFacturar: int