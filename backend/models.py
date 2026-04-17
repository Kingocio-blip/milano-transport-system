# ============================================
# MILANO - SQLAlchemy Models (OPTIMIZADO)
# ============================================

from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey, 
    Boolean, Numeric, Date, Enum as SQLEnum, JSON, Float, Index
)
from sqlalchemy.orm import relationship, validates
from database import Base
import datetime
import enum

# ============================================
# ENUMS
# ============================================

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

# ============================================
# NUEVOS ENUMS PARA HISTORIAL VEHICULO
# ============================================

class TipoMantenimiento(str, enum.Enum):
    PREVENTIVO = "preventivo"
    CORRECTIVO = "correctivo"
    ITV = "itv"
    NEUMATICOS = "neumaticos"
    ACEITE = "aceite"
    FRENO = "freno"
    ELECTRICO = "electrico"
    CARROCERIA = "carroceria"
    OTRO = "otro"

class EstadoAveria(str, enum.Enum):
    REPORTADA = "reportada"
    EN_DIAGNOSTICO = "en_diagnostico"
    EN_REPARACION = "en_reparacion"
    RESUELTA = "resuelta"
    CANCELADA = "cancelada"

class GravedadAveria(str, enum.Enum):
    LEVE = "leve"
    MEDIA = "media"
    GRAVE = "grave"
    CRITICA = "critica"

class TipoAnotacion(str, enum.Enum):
    INCIDENCIA = "incidencia"
    OBSERVACION = "observacion"
    DANO = "dano"
    LIMPIEZA = "limpieza"
    COMBUSTIBLE = "combustible"
    REVISION = "revision"
    OTRO = "otro"

class EstadoGeneral(str, enum.Enum):
    BUENO = "bueno"
    REGULAR = "regular"
    MALO = "malo"

# ============================================
# USER MODEL
# ============================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nombre_completo = Column(String(100), nullable=False)
    rol = Column(SQLEnum(UserRole), default=UserRole.OPERADOR)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    ultimo_acceso = Column(DateTime, nullable=True)
    
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    conductor = relationship("Conductor", back_populates="usuario")

# ============================================
# CLIENTE MODEL
# ============================================

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=True)
    tipo = Column(SQLEnum(TipoCliente), default=TipoCliente.EMPRESA)
    nombre = Column(String(100), nullable=False)
    razon_social = Column(String(100), nullable=True)
    nif_cif = Column(String(20), nullable=True)
    
    direccion = Column(String(200), nullable=True)
    ciudad = Column(String(50), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    pais = Column(String(50), default="España")
    
    email = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    
    persona_contacto_nombre = Column(String(100), nullable=True)
    persona_contacto_email = Column(String(100), nullable=True)
    persona_contacto_telefono = Column(String(20), nullable=True)
    persona_contacto_cargo = Column(String(50), nullable=True)
    
    estado = Column(SQLEnum(EstadoCliente), default=EstadoCliente.ACTIVO)
    condiciones_pago = Column(String(50), nullable=True)
    dias_pago = Column(Integer, nullable=True)
    limite_credito = Column(Numeric(10, 2), nullable=True)
    
    total_servicios = Column(Integer, default=0)
    total_facturado = Column(Numeric(12, 2), default=0)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    
    servicios = relationship("Servicio", back_populates="cliente")
    
    __table_args__ = (
        Index('idx_cliente_estado', 'estado'),
        Index('idx_cliente_tipo', 'tipo'),
    )

# ============================================
# CONDUCTOR MODEL (ACTUALIZADO)
# ============================================

class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=True)
    
    nombre = Column(String(50), nullable=False)
    apellidos = Column(String(100), nullable=False)
    dni = Column(String(20), unique=True, nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    
    telefono = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    
    licencia_tipo = Column(String(20), nullable=True)
    licencia_numero = Column(String(50), nullable=True)
    licencia_fecha_expedicion = Column(Date, nullable=True)
    licencia_fecha_caducidad = Column(Date, nullable=True)
    licencia_permisos = Column(JSON, default=list)
    
    tarifa_hora = Column(Numeric(8, 2), default=18)
    tarifa_servicio = Column(Numeric(10, 2), nullable=True)
    prioridad = Column(Integer, default=50)
    
    disponibilidad_dias = Column(JSON, default=lambda: [1, 2, 3, 4, 5])
    disponibilidad_hora_inicio = Column(String(10), default="08:00")
    disponibilidad_hora_fin = Column(String(10), default="18:00")
    disponibilidad_observaciones = Column(Text, nullable=True)
    
    # FIX: Credenciales como JSON
    credenciales = Column(JSON, nullable=True)
    
    panel_activo = Column(Boolean, default=True)
    
    total_horas_mes = Column(Numeric(8, 2), default=0)
    total_servicios_mes = Column(Integer, default=0)
    valoracion = Column(Numeric(3, 2), nullable=True)
    
    estado = Column(SQLEnum(EstadoConductor), default=EstadoConductor.ACTIVO)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    
    usuario = relationship("User", back_populates="conductor", uselist=False)
    
    __table_args__ = (
        Index('idx_conductor_estado', 'estado'),
        Index('idx_conductor_prioridad', 'prioridad'),
        Index('idx_conductor_panel', 'panel_activo'),
    )
    
    @validates('prioridad')
    def validate_prioridad(self, key, value):
        if value is not None and (value < 0 or value > 100):
            raise ValueError('Prioridad debe estar entre 0 y 100')
        return value

# ============================================
# VEHICULO MODEL (ACTUALIZADO)
# ============================================

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=True)
    
    matricula = Column(String(20), unique=True, nullable=False)
    tipo = Column(SQLEnum(TipoVehiculo), default=TipoVehiculo.AUTOBUS)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    anno_fabricacion = Column(Integer, nullable=True)
    plazas = Column(Integer, default=0)
    
    kilometraje = Column(Integer, default=0)
    kilometraje_ultima_revision = Column(Integer, nullable=True)
    consumo_medio = Column(Numeric(5, 2), nullable=True)
    combustible = Column(String(20), default="diesel")
    
    itv_fecha_ultima = Column(Date, nullable=True)
    itv_fecha_proxima = Column(Date, nullable=True)
    itv_resultado = Column(String(50), nullable=True)
    itv_observaciones = Column(Text, nullable=True)
    
    seguro_compania = Column(String(100), nullable=True)
    seguro_poliza = Column(String(100), nullable=True)
    seguro_tipo_cobertura = Column(String(50), nullable=True)
    seguro_fecha_inicio = Column(Date, nullable=True)
    seguro_fecha_vencimiento = Column(Date, nullable=True)
    seguro_prima = Column(Numeric(10, 2), nullable=True)
    
    estado = Column(SQLEnum(EstadoVehiculo), default=EstadoVehiculo.OPERATIVO)
    ubicacion = Column(String(200), nullable=True)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    imagen_url = Column(String(500), nullable=True)
    
    # NUEVAS RELACIONES
    mantenimientos = relationship("Mantenimiento", back_populates="vehiculo", order_by="desc(Mantenimiento.fecha)")
    averias = relationship("Averia", back_populates="vehiculo", order_by="desc(Averia.fecha_inicio)")
    anotaciones = relationship("AnotacionVehiculo", back_populates="vehiculo", order_by="desc(AnotacionVehiculo.fecha)")
    
    __table_args__ = (
        Index('idx_vehiculo_estado', 'estado'),
        Index('idx_vehiculo_tipo', 'tipo'),
        Index('idx_vehiculo_itv', 'itv_fecha_proxima'),
    )

# ============================================
# NUEVOS MODELOS - HISTORIAL VEHICULO
# ============================================

class Mantenimiento(Base):
    __tablename__ = "mantenimientos"
    
    id = Column(Integer, primary_key=True, index=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=False)
    
    tipo = Column(SQLEnum(TipoMantenimiento), nullable=False)
    fecha = Column(Date, nullable=False)
    kilometraje = Column(Integer, nullable=True)
    
    descripcion = Column(Text, nullable=True)
    taller = Column(String(100), nullable=True)
    coste = Column(Numeric(10, 2), nullable=True)
    
    documento_url = Column(String(500), nullable=True)
    realizado_por = Column(String(100), nullable=True)  # conductor o mecanico
    notas = Column(Text, nullable=True)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    vehiculo = relationship("Vehiculo", back_populates="mantenimientos")
    
    __table_args__ = (
        Index('idx_mantenimiento_vehiculo', 'vehiculo_id'),
        Index('idx_mantenimiento_fecha', 'fecha'),
        Index('idx_mantenimiento_tipo', 'tipo'),
    )

class Averia(Base):
    __tablename__ = "averias"
    
    id = Column(Integer, primary_key=True, index=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=False)
    
    fecha_inicio = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_fin = Column(DateTime, nullable=True)
    
    descripcion = Column(Text, nullable=False)
    gravedad = Column(SQLEnum(GravedadAveria), default=GravedadAveria.MEDIA)
    estado = Column(SQLEnum(EstadoAveria), default=EstadoAveria.REPORTADA)
    
    taller = Column(String(100), nullable=True)
    coste_reparacion = Column(Numeric(10, 2), nullable=True)
    piezas_cambiadas = Column(JSON, default=list)
    
    diagnostico = Column(Text, nullable=True)
    solucion = Column(Text, nullable=True)
    
    reportado_por_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    reportado_por_nombre = Column(String(100), nullable=True)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    vehiculo = relationship("Vehiculo", back_populates="averias")
    
    __table_args__ = (
        Index('idx_averia_vehiculo', 'vehiculo_id'),
        Index('idx_averia_estado', 'estado'),
        Index('idx_averia_gravedad', 'gravedad'),
    )

class AnotacionVehiculo(Base):
    __tablename__ = "anotaciones_vehiculo"
    
    id = Column(Integer, primary_key=True, index=True)
    
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    tipo = Column(SQLEnum(TipoAnotacion), default=TipoAnotacion.OBSERVACION)
    
    descripcion = Column(Text, nullable=False)
    kilometraje = Column(Integer, nullable=True)
    nivel_combustible = Column(Integer, nullable=True)  # porcentaje 0-100
    estado_general = Column(SQLEnum(EstadoGeneral), default=EstadoGeneral.BUENO)
    
    fotos = Column(JSON, default=list)  # URLs de fotos
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    vehiculo = relationship("Vehiculo", back_populates="anotaciones")
    
    __table_args__ = (
        Index('idx_anotacion_vehiculo', 'vehiculo_id'),
        Index('idx_anotacion_servicio', 'servicio_id'),
        Index('idx_anotacion_conductor', 'conductor_id'),
        Index('idx_anotacion_fecha', 'fecha'),
    )

# ============================================
# SERVICIO MODEL
# ============================================

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=True)
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    cliente_nombre = Column(String(100), nullable=True)
    
    tipo = Column(String(50), nullable=False)
    estado = Column(String(50), default="planificando")
    
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    
    hora_inicio_real = Column(DateTime, nullable=True)
    hora_fin_real = Column(DateTime, nullable=True)
    horas_reales = Column(Float, nullable=True)
    
    origen = Column(String(200), nullable=True)
    destino = Column(String(200), nullable=True)
    ubicacion_evento = Column(String(200), nullable=True)
    
    numero_vehiculos = Column(Integer, default=1)
    vehiculos_asignados = Column(JSON, default=list)
    conductores_asignados = Column(JSON, default=list)
    
    coste_estimado = Column(Numeric(10, 2), default=0)
    coste_real = Column(Numeric(10, 2), nullable=True)
    precio = Column(Numeric(10, 2), default=0)
    facturado = Column(Boolean, default=False)
    factura_id = Column(Integer, nullable=True)
    
    notas_internas = Column(Text, nullable=True)
    notas_cliente = Column(Text, nullable=True)
    
    rutas = Column(JSON, default=list)
    tareas = Column(JSON, default=list)
    incidencias = Column(JSON, default=list)
    documentos = Column(JSON, default=list)
    
    gastos = Column(JSON, default=list)
    revisiones = Column(JSON, default=list)
    tracking = Column(JSON, default=dict)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_modificacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    creado_por = Column(String(50), nullable=True)
    
    cliente = relationship("Cliente", back_populates="servicios")
    
    __table_args__ = (
        Index('idx_servicio_estado', 'estado'),
        Index('idx_servicio_fecha', 'fecha_inicio'),
        Index('idx_servicio_cliente', 'cliente_id'),
        Index('idx_servicio_facturado', 'facturado', 'estado'),
    )

# ============================================
# FACTURA MODEL
# ============================================

class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(20), unique=True, nullable=False)
    serie = Column(String(10), default="A")
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    cliente_nombre = Column(String(100), nullable=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    servicio_codigo = Column(String(20), nullable=True)
    
    fecha_emision = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_vencimiento = Column(DateTime, nullable=False)
    fecha_pago = Column(DateTime, nullable=True)
    
    subtotal = Column(Numeric(10, 2), default=0)
    descuento_total = Column(Numeric(10, 2), default=0)
    base_imponible = Column(Numeric(10, 2), default=0)
    impuestos = Column(Numeric(10, 2), default=0)
    iva = Column(Numeric(5, 2), default=21)
    total = Column(Numeric(10, 2), default=0)
    
    estado = Column(String(20), default="pendiente")
    metodo_pago = Column(String(50), nullable=True)
    referencia_pago = Column(String(100), nullable=True)
    
    notas = Column(Text, nullable=True)
    condiciones = Column(Text, nullable=True)
    
    pdf_url = Column(String(500), nullable=True)
    
    conceptos = Column(JSON, default=list)
    
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    __table_args__ = (
        Index('idx_factura_estado', 'estado'),
        Index('idx_factura_fecha', 'fecha_emision'),
        Index('idx_factura_cliente', 'cliente_id'),
        Index('idx_factura_vencimiento', 'fecha_vencimiento', 'estado'),
    )
