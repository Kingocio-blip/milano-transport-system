from sqlalchemy import Column, Integer, String, Float, Date, Time, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    admin = "admin"
    conductor = "conductor"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    rol = Column(Enum(UserRole), default=UserRole.conductor)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    
    conductor = relationship("Conductor", back_populates="user")

class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellidos = Column(String)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String)
    email = Column(String)
    direccion = Column(String)
    fecha_contratacion = Column(Date)
    licencia_conducir = Column(String)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="conductor", uselist=False)
    servicios = relationship("Servicio", back_populates="conductor")

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellidos = Column(String)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String)
    email = Column(String)
    direccion = Column(String)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    servicios = relationship("Servicio", back_populates="cliente")

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    origen = Column(String)
    destino = Column(String)
    fecha = Column(Date)
    hora = Column(Time)
    precio = Column(Float)
    estado = Column(String, default="pendiente")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    cliente = relationship("Cliente", back_populates="servicios")
    conductor = relationship("Conductor", back_populates="servicios")

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String, unique=True, index=True)
    marca = Column(String)
    modelo = Column(String)
    anno_fabricacion = Column(Integer)
    tipo = Column(String)
    capacidad_pasajeros = Column(Integer)
    fecha_adquisicion = Column(Date)
    estado = Column(String, default="activo")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)