from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Numeric, Date, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

# Enums
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

# User model
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
    
    # Relación con conductor (para panel de control)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    conductor = relationship("Conductor", back_populates="usuario")

# Cliente model
class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)
    tipo = Column(SQLEnum(TipoCliente), default=TipoCliente.EMPRESA)
    nombre = Column(String(100), nullable=False)
    razon_social = Column(String(100), nullable=True)
    nif_cif = Column(String(20), nullable=True)
    
    # Direccion
    direccion = Column(String(200), nullable=True)
    ciudad = Column(String(50), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    pais = Column(String(50), default="España")
    
    # Contacto principal
    email = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    
    # Persona de contacto (campos planos)
    persona_contacto_nombre = Column(String(100), nullable=True)
    persona_contacto_email = Column(String(100), nullable=True)
    persona_contacto_telefono = Column(String(20), nullable=True)
    persona_contacto_cargo = Column(String(50), nullable=True)
    
    # Informacion comercial
    estado = Column(SQLEnum(EstadoCliente), default=EstadoCliente.ACTIVO)
    condiciones_pago = Column(String(50), nullable=True)
    dias_pago = Column(Integer, nullable=True)
    limite_credito = Column(Numeric(10, 2), nullable=True)
    
    # Estadísticas
    total_servicios = Column(Integer, default=0)
    total_facturado = Column(Numeric(12, 2), default=0)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    
    # Relaciones
    servicios = relationship("Servicio", back_populates="cliente")

# Conductor model (ACTUALIZADO)
class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)
    
    # Datos personales
    nombre = Column(String(50), nullable=False)
    apellidos = Column(String(100), nullable=False)
    dni = Column(String(20), unique=True, nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    
    # Contacto
    telefono = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    
    # Licencia (estructura JSON flexible)
    licencia_tipo = Column(String(20), nullable=True)
    licencia_numero = Column(String(50), nullable=True)
    licencia_fecha_expedicion = Column(Date, nullable=True)
    licencia_fecha_caducidad = Column(Date, nullable=True)
    licencia_permisos = Column(JSON, default=list)
    
    # Tarifas y prioridad
    tarifa_hora = Column(Numeric(8, 2), default=18)
    tarifa_servicio = Column(Numeric(10, 2), nullable=True)
    prioridad = Column(Integer, default=50)  # 0-100 para orden de asignación
    
    # Disponibilidad horaria
    disponibilidad_dias = Column(JSON, default=list)  # [1,2,3,4,5] = Lunes-Viernes
    disponibilidad_hora_inicio = Column(String(10), default="08:00")
    disponibilidad_hora_fin = Column(String(10), default="18:00")
    disponibilidad_observaciones = Column(Text, nullable=True)
    
    # Credenciales para panel de control
    credenciales_usuario = Column(String(50), nullable=True)
    credenciales_password_hash = Column(String(255), nullable=True)
    panel_activo = Column(Boolean, default=True)
    
    # Estadísticas
    total_horas_mes = Column(Numeric(8, 2), default=0)
    total_servicios_mes = Column(Integer, default=0)
    valoracion = Column(Numeric(3, 2), nullable=True)  # 0-5
    
    # Estado
    estado = Column(SQLEnum(EstadoConductor), default=EstadoConductor.ACTIVO)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    
    # Relaciones
    usuario = relationship("User", back_populates="conductor", uselist=False)

# Vehiculo model (ACTUALIZADO)
class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)
    
    # Informacion del vehiculo
    matricula = Column(String(20), unique=True, nullable=False)
    tipo = Column(SQLEnum(TipoVehiculo), default=TipoVehiculo.AUTOBUS)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    anno_fabricacion = Column(Integer, nullable=True)
    plazas = Column(Integer, default=0)
    
    # Kilometraje y consumo
    kilometraje = Column(Integer, default=0)
    kilometraje_ultima_revision = Column(Integer, nullable=True)
    consumo_medio = Column(Numeric(5, 2), nullable=True)  # L/100km
    combustible = Column(String(20), default="diesel")
    
    # ITV (estructura plana para compatibilidad)
    itv_fecha_ultima = Column(Date, nullable=True)
    itv_fecha_proxima = Column(Date, nullable=True)
    itv_resultado = Column(String(50), nullable=True)
    itv_observaciones = Column(Text, nullable=True)
    
    # Seguro (estructura plana)
    seguro_compania = Column(String(100), nullable=True)
    seguro_poliza = Column(String(100), nullable=True)
    seguro_tipo_cobertura = Column(String(50), nullable=True)
    seguro_fecha_inicio = Column(Date, nullable=True)
    seguro_fecha_vencimiento = Column(Date, nullable=True)
    seguro_prima = Column(Numeric(10, 2), nullable=True)
    
    # Mantenimientos
    mantenimientos = Column(JSON, default=list)
    
    # Estado
    estado = Column(SQLEnum(EstadoVehiculo), default=EstadoVehiculo.OPERATIVO)
    ubicacion = Column(String(200), nullable=True)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    notas = Column(Text, nullable=True)
    imagen_url = Column(String(500), nullable=True)

# Servicio model (ACTUALIZADO)
class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)
    
    # Cliente
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    cliente_nombre = Column(String(100), nullable=True)
    
    # Tipo y estado
    tipo = Column(String(50), nullable=False)  # lanzadera, discrecional, staff, ruta_programada
    estado = Column(String(50), default="planificando")
    
    # Descripcion
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    # Fechas y horas
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    
    # Horas reales (fichaje conductor)
    hora_inicio_real = Column(DateTime, nullable=True)
    hora_fin_real = Column(DateTime, nullable=True)
    horas_reales = Column(Float, nullable=True)
    
    # Ubicacion
    origen = Column(String(200), nullable=True)
    destino = Column(String(200), nullable=True)
    ubicacion_evento = Column(String(200), nullable=True)
    
    # Vehiculos y conductores
    numero_vehiculos = Column(Integer, default=1)
    vehiculos_asignados = Column(JSON, default=list)
    conductores_asignados = Column(JSON, default=list)
    
    # Financiero
    coste_estimado = Column(Numeric(10, 2), default=0)
    coste_real = Column(Numeric(10, 2), nullable=True)
    precio = Column(Numeric(10, 2), default=0)
    facturado = Column(Boolean, default=False)
    factura_id = Column(Integer, nullable=True)
    
    # Notas
    notas_internas = Column(Text, nullable=True)
    notas_cliente = Column(Text, nullable=True)
    
    # Datos estructurados (JSON)
    rutas = Column(JSON, default=list)
    tareas = Column(JSON, default=list)
    incidencias = Column(JSON, default=list)
    documentos = Column(JSON, default=list)
    
    # NUEVO: Gastos registrados por conductor
    gastos = Column(JSON, default=list)  # [{id, tipo, cantidad, precio, notas, fecha, conductor_id}]
    
    # NUEVO: Revisiones del vehiculo
    revisiones = Column(JSON, default=list)  # [{id, tipo, estado, notas, fecha, conductor_id, vehiculo_id}]
    
    # NUEVO: Tracking de ruta
    tracking = Column(JSON, default=dict)  # {kmInicio, kmFin, kmTotal, rutaTomada, duracionReal}
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_modificacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    creado_por = Column(String(50), nullable=True)
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="servicios")

# Factura model (NUEVO)
class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(20), unique=True, nullable=False)
    serie = Column(String(10), default="A")
    
    # Relaciones
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    cliente_nombre = Column(String(100), nullable=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    servicio_codigo = Column(String(20), nullable=True)
    
    # Fechas
    fecha_emision = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_vencimiento = Column(DateTime, nullable=False)
    fecha_pago = Column(DateTime, nullable=True)
    
    # Totales
    subtotal = Column(Numeric(10, 2), default=0)
    descuento_total = Column(Numeric(10, 2), default=0)
    base_imponible = Column(Numeric(10, 2), default=0)
    impuestos = Column(Numeric(10, 2), default=0)
    iva = Column(Numeric(5, 2), default=21)
    total = Column(Numeric(10, 2), default=0)
    
    # Estado
    estado = Column(String(20), default="pendiente")  # pendiente, enviada, pagada, vencida, anulada
    metodo_pago = Column(String(50), nullable=True)
    referencia_pago = Column(String(100), nullable=True)
    
    # Notas
    notas = Column(Text, nullable=True)
    condiciones = Column(Text, nullable=True)
    
    # Documentos
    pdf_url = Column(String(500), nullable=True)
    
    # Conceptos (JSON)
    conceptos = Column(JSON, default=list)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)