from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Numeric, Date, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

# Enums
class TipoCliente(str, enum.Enum):
EMPRESA = "empresa"
PARTICULAR = "particular"

class EstadoCliente(str, enum.Enum):
ACTIVO = "activo"
INACTIVO = "inactivo"
PROSPECTO = "prospecto"

class EstadoConductor(str, enum.Enum):
ACTIVO = "activo"
INACTIVO = "inactivo"
EN_RUTA = "en_ruta"
DESCANSO = "descanso"

class EstadoVehiculo(str, enum.Enum):
ACTIVO = "activo"
INACTIVO = "inactivo"
EN_MANTENIMIENTO = "en_mantenimiento"
EN_RUTA = "en_ruta"

class TipoVehiculo(str, enum.Enum):
CAMION = "camion"
FURGONETA = "furgoneta"
TRAILER = "trailer"

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

# Metadatos
fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
notas = Column(Text, nullable=True)

# Relaciones
servicios = relationship("Servicio", back_populates="cliente")

# Conductor model
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

# Licencia
num_licencia = Column(String(50), nullable=True)
categoria_licencia = Column(String(20), nullable=True)
fecha_vencimiento_licencia = Column(Date, nullable=True)

# Documentacion
fecha_vencimiento_adr = Column(Date, nullable=True)
fecha_vencimiento_medico = Column(Date, nullable=True)

# Estado
estado = Column(SQLEnum(EstadoConductor), default=EstadoConductor.ACTIVO)

# Metadatos
fecha_contratacion = Column(Date, nullable=True)
fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
notas = Column(Text, nullable=True)

# Vehiculo model
class Vehiculo(Base):
__tablename__ = "vehiculos"

id = Column(Integer, primary_key=True, index=True)
codigo = Column(String(20), unique=True, index=True, nullable=False)

# Informacion del vehiculo
matricula = Column(String(20), unique=True, nullable=False)
tipo = Column(SQLEnum(TipoVehiculo), default=TipoVehiculo.CAMION)
marca = Column(String(50), nullable=True)
modelo = Column(String(50), nullable=True)
anno_fabricacion = Column(Integer, nullable=True)

# Especificaciones tecnicas
capacidad_kg = Column(Numeric(10, 2), nullable=True)
volumen_m3 = Column(Numeric(8, 2), nullable=True)
longitud_m = Column(Numeric(5, 2), nullable=True)

# Documentacion
fecha_vencimiento_itv = Column(Date, nullable=True)
fecha_vencimiento_seguro = Column(Date, nullable=True)
num_poliza_seguro = Column(String(50), nullable=True)

# Estado
estado = Column(SQLEnum(EstadoVehiculo), default=EstadoVehiculo.ACTIVO)

# Metadatos
fecha_adquisicion = Column(Date, nullable=True)
fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
fecha_actualizacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
notas = Column(Text, nullable=True)

# Servicio model (NUEVO)
class Servicio(Base):
__tablename__ = "servicios"

id = Column(Integer, primary_key=True, index=True)
codigo = Column(String(20), unique=True, index=True, nullable=False)

# Cliente
cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
cliente_nombre = Column(String(100), nullable=True)

# Tipo y estado
tipo = Column(String(50), nullable=False) # lanzadera, discrecional, staff, ruta_programada
estado = Column(String(50), default="planificando")

# Descripcion
titulo = Column(String(200), nullable=False)
descripcion = Column(Text, nullable=True)

# Fechas
fecha_inicio = Column(DateTime, nullable=False)
fecha_fin = Column(DateTime, nullable=True)
hora_inicio = Column(String(10), nullable=True)
hora_fin = Column(String(10), nullable=True)

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

# Metadatos
fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
fecha_modificacion = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
creado_por = Column(String(50), nullable=True)

# Relaciones
cliente = relationship("Cliente", back_populates="servicios")