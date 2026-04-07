from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, create_engine, text
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
    rol = Column(String, default="conductor")
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
    licencia_tipo = Column(String)
    licencia_numero = Column(String)
    licencia_caducidad = Column(DateTime)
    fecha_nacimiento = Column(DateTime)
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    tarifa_hora = Column(Float, default=0.0)
    estado = Column(String, default="activo")
    notas = Column(Text)
    
    servicios = relationship("Servicio", back_populates="conductor")

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String, unique=True, index=True, nullable=False)
    bastidor = Column(String, unique=True)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    tipo = Column(String)
    plazas = Column(Integer)
    anno_fabricacion = Column(Integer)
    combustible = Column(String)
    kilometraje = Column(Integer, default=0)
    
    itv_fecha_ultima = Column(DateTime)
    itv_fecha_proxima = Column(DateTime)
    itv_resultado = Column(String)
    
    seguro_compania = Column(String)
    seguro_poliza = Column(String)
    seguro_fecha_vencimiento = Column(DateTime)
    
    estado = Column(String, default="operativo")
    ubicacion = Column(String)
    notas = Column(Text)
    imagen_url = Column(String)
    
    servicios = relationship("Servicio", back_populates="vehiculo")

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nombre = Column(String, nullable=False)
    tipo = Column(String, default="particular")
    
    contacto_email = Column(String)
    contacto_telefono = Column(String)
    contacto_direccion = Column(String)
    contacto_ciudad = Column(String)
    contacto_codigo_postal = Column(String)
    
    nif = Column(String, index=True)
    condiciones_especiales = Column(Text)
    forma_pago = Column(String)
    dias_pago = Column(Integer, default=30)
    estado = Column(String, default="activo")
    notas = Column(Text)
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    
    servicios = relationship("Servicio", back_populates="cliente")

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo = Column(String, default="lanzadera")
    estado = Column(String, default="solicitud")
    fecha_inicio = Column(DateTime)
    fecha_fin = Column(DateTime)
    hora_inicio = Column(String)
    hora_fin = Column(String)
    titulo = Column(String)
    descripcion = Column(Text)
    conductor_id = Column(Integer, ForeignKey("conductores.id"))
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"))
    numero_vehiculos = Column(Integer, default=1)
    origen = Column(String)
    destino = Column(String)
    ubicacion_evento = Column(String)
    coste_estimado = Column(Float, default=0.0)
    coste_real = Column(Float, default=0.0)
    precio = Column(Float, default=0.0)
    margen = Column(Float, default=0.0)
    facturado = Column(Boolean, default=False)
    notas_internas = Column(Text)
    notas_cliente = Column(Text)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    creado_por = Column(String)
    
    cliente = relationship("Cliente", back_populates="servicios")
    conductor = relationship("Conductor", back_populates="servicios")
    vehiculo = relationship("Vehiculo", back_populates="servicios")
    factura = relationship("Factura", back_populates="servicio", uselist=False)

class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, index=True)
    serie = Column(String)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    fecha_emision = Column(DateTime, default=datetime.utcnow)
    fecha_vencimiento = Column(DateTime)
    fecha_pago = Column(DateTime)
    subtotal = Column(Float, default=0.0)
    descuento_total = Column(Float, default=0.0)
    base_imponible = Column(Float, default=0.0)
    impuestos = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    estado = Column(String, default="pendiente")
    metodo_pago = Column(String)
    referencia_pago = Column(String)
    notas = Column(Text)
    condiciones = Column(Text)
    pdf_url = Column(String)
    
    cliente = relationship("Cliente")
    servicio = relationship("Servicio", back_populates="factura")

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
    # Borrar todo el esquema y recrearlo (limpia completa)
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("✅ Base de datos recreada correctamente")