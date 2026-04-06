from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String, default="conductor")  # admin, conductor
    is_active = Column(Boolean, default=True)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    ciudad = Column(String, nullable=True)
    codigo_postal = Column(String, nullable=True)
    notas = Column(Text, nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    licencia_conducir = Column(String, nullable=True)
    fecha_vencimiento_licencia = Column(Date, nullable=True)
    estado = Column(String, default="activo")  # activo, inactivo, vacaciones, baja
    fecha_contratacion = Column(DateTime, default=datetime.utcnow)

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String, unique=True, index=True)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    tipo = Column(String, default="autobus")
    capacidad_pasajeros = Column(Integer, default=50)
    anno_fabricacion = Column(Integer, nullable=True)
    estado = Column(String, default="disponible")  # disponible, en_uso, mantenimiento, fuera_servicio

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=True)
    tipo_servicio = Column(String, default="transfer")
    origen = Column(String, nullable=False)
    destino = Column(String, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    hora_inicio = Column(String, nullable=False)
    fecha_fin = Column(Date, nullable=True)
    hora_fin = Column(String, nullable=True)
    numero_pasajeros = Column(Integer, default=1)
    precio = Column(Float, default=0)
    gastos_combustible = Column(Float, default=0)
    gastos_peaje = Column(Float, default=0)
    gastos_otros = Column(Float, default=0)
    notas = Column(Text, nullable=True)
    estado = Column(String, default="pendiente")  # pendiente, en_curso, completado, cancelado
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    concepto = Column(String, nullable=True)
    importe_base = Column(Float, default=0)
    tipo_iva = Column(Integer, default=21)
    importe_iva = Column(Float, default=0)
    importe_total = Column(Float, default=0)
    estado = Column(String, default="pendiente")  # pendiente, pagada, vencida, anulada
    fecha_creacion = Column(DateTime, default=datetime.utcnow)