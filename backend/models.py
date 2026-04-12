from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, create_engine, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os

Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    rol = Column(String, default="conductor")  # admin, conductor
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultimo_acceso = Column(DateTime, nullable=True)

class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nombre = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String)
    email = Column(String)
    direccion = Column(String)
    
    # Carnet de conducir
    licencia_tipo = Column(String)
    licencia_numero = Column(String)
    licencia_caducidad = Column(DateTime)
    
    # CAP (Certificado de Aptitud Profesional)
    tiene_cap = Column(Boolean, default=False)
    cap_caducidad = Column(DateTime)
    
    # Datos laborales
    numero_seguridad_social = Column(String)
    tipo_contrato = Column(String, default="indefinido")  # indefinido, temporal, practicas, eventual
    
    fecha_nacimiento = Column(DateTime)
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    tarifa_hora = Column(Float, default=0.0)
    estado = Column(String, default="activo")  # activo, baja, vacaciones, descanso
    notas = Column(Text)
    
    servicios = relationship("Servicio", back_populates="conductor")

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String, unique=True, index=True, nullable=False)
    bastidor = Column(String, unique=True)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    tipo = Column(String)  # autobus, minibus, furgoneta, coche
    plazas = Column(Integer)
    anno_fabricacion = Column(Integer)
    combustible = Column(String)  # diesel, gasolina, electric, hibrido
    kilometraje = Column(Integer, default=0)
    
    # ITV
    itv_fecha_ultima = Column(DateTime)
    itv_fecha_proxima = Column(DateTime)
    itv_resultado = Column(String)
    
    # Seguro
    seguro_compania = Column(String)
    seguro_poliza = Column(String)
    seguro_fecha_vencimiento = Column(DateTime)
    
    estado = Column(String, default="operativo")  # operativo, taller, baja, reservado
    ubicacion = Column(String)
    notas = Column(Text)
    imagen_url = Column(String)
    
    servicios = relationship("Servicio", back_populates="vehiculo")

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nombre = Column(String, nullable=False)
    
    # Tipo expandido: festival, promotor, colegio, empresa, particular
    tipo = Column(String, default="particular")
    
    # Contacto como JSON para mantener estructura anidada del frontend
    contacto_email = Column(String)
    contacto_telefono = Column(String)
    contacto_direccion = Column(String)
    contacto_ciudad = Column(String)
    contacto_codigo_postal = Column(String)
    
    # NIF/CIF
    nif = Column(String, index=True)
    
    # Condiciones comerciales
    condiciones_especiales = Column(Text)
    forma_pago = Column(String)
    dias_pago = Column(Integer, default=30)
    
    # Estado
    estado = Column(String, default="activo")  # activo, inactivo
    
    notas = Column(Text)
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    
    servicios = relationship("Servicio", back_populates="cliente")

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    
    # Cliente
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    
    # Tipo y estado expandidos
    tipo = Column(String, default="lanzadera")  # lanzadera, discrecional, staff, ruta_programada
    estado = Column(String, default="solicitud")  # solicitud, presupuesto, negociacion, confirmado, planificando, asignado, en_curso, completado, facturado, cancelado
    
    # Fechas
    fecha_inicio = Column(DateTime)
    fecha_fin = Column(DateTime)
    hora_inicio = Column(String)
    hora_fin = Column(String)
    
    # Descripción
    titulo = Column(String)
    descripcion = Column(Text)
    
    # Asignaciones
    conductor_id = Column(Integer, ForeignKey("conductores.id"))
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"))
    numero_vehiculos = Column(Integer, default=1)
    
    # Ubicación
    origen = Column(String)
    destino = Column(String)
    ubicacion_evento = Column(String)
    
    # Financiero
    coste_estimado = Column(Float, default=0.0)
    coste_real = Column(Float, default=0.0)
    precio = Column(Float, default=0.0)
    margen = Column(Float, default=0.0)
    
    # Facturación
    facturado = Column(Boolean, default=False)
    factura_id = Column(Integer, ForeignKey("facturas.id"), nullable=True)
    
    # Notas
    notas_internas = Column(Text)
    notas_cliente = Column(Text)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    creado_por = Column(String)
    
    cliente = relationship("Cliente", back_populates="servicios")
    conductor = relationship("Conductor", back_populates="servicios")
    vehiculo = relationship("Vehiculo", back_populates="servicios")
    # RELACIÓN CORREGIDA: Solo un lado tiene back_populates
    factura = relationship("Factura", back_populates="servicios")

class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, index=True)
    serie = Column(String)
    
    # Relaciones
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    # ELIMINADO: servicio_id - ya no es necesario, usamos la relación inversa
    
    # Fechas
    fecha_emision = Column(DateTime, default=datetime.utcnow)
    fecha_vencimiento = Column(DateTime)
    fecha_pago = Column(DateTime)
    
    # Totales
    subtotal = Column(Float, default=0.0)
    descuento_total = Column(Float, default=0.0)
    base_imponible = Column(Float, default=0.0)
    impuestos = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    # Estado
    estado = Column(String, default="pendiente")  # pendiente, enviada, pagada, vencida, anulada
    metodo_pago = Column(String)
    referencia_pago = Column(String)
    
    # Notas
    notas = Column(Text)
    condiciones = Column(Text)
    pdf_url = Column(String)
    
    cliente = relationship("Cliente")
    # RELACIÓN CORREGIDA: Una factura puede tener muchos servicios
    servicios = relationship("Servicio", back_populates="factura")

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/milano")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)