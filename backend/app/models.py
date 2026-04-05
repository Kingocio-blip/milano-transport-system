from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(50), default="usuario")  # admin, conductor
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultimo_acceso = Column(DateTime, nullable=True)

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    telefono = Column(String(50))
    direccion = Column(Text)
    ciudad = Column(String(100))
    codigo_postal = Column(String(20))
    nif = Column(String(50), unique=True)
    contacto_nombre = Column(String(255))
    contacto_email = Column(String(255))
    contacto_telefono = Column(String(50))
    tipo_cliente = Column(String(50), default="empresa")
    condiciones_pago = Column(String(50), default="30_dias")
    observaciones = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), unique=True, nullable=False)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    tipo = Column(String(50), nullable=False)
    capacidad = Column(Integer, nullable=False)
    ano = Column(Integer)
    color = Column(String(50))
    numero_chasis = Column(String(100))
    fecha_itv = Column(Date)
    fecha_seguro = Column(Date)
    compania_seguro = Column(String(100))
    poliza_seguro = Column(String(100))
    kilometraje = Column(Integer, default=0)
    consumo_medio = Column(Float)
    estado = Column(String(50), default="disponible")
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

class Conductor(Base):
    __tablename__ = "conductores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True)
    telefono = Column(String(50))
    dni = Column(String(50), unique=True)
    licencia = Column(String(50), nullable=False)
    tipo_licencia = Column(String(20), default="D")
    fecha_nacimiento = Column(Date)
    
    # Datos de usuario para login
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Datos laborales
    fecha_contratacion = Column(Date)
    tipo_contrato = Column(String(50), default="indefinido")
    salario_base_hora = Column(Float, default=12.0)  # €/hora base
    
    # Contacto emergencia
    direccion = Column(Text)
    ciudad = Column(String(100))
    codigo_postal = Column(String(20))
    contacto_emergencia = Column(String(255))
    telefono_emergencia = Column(String(50))
    
    # Estado
    estado = Column(String(50), default="disponible")
    foto_url = Column(String(500))
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

class Servicio(Base):
    __tablename__ = "servicios"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    conductor_id = Column(Integer, ForeignKey("conductores.id"))
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"))
    
    # Datos del servicio
    origen = Column(String(255), nullable=False)
    origen_direccion = Column(Text)
    destino = Column(String(255), nullable=False)
    destino_direccion = Column(Text)
    fecha_salida = Column(DateTime, nullable=False)
    fecha_llegada_estimada = Column(DateTime)
    fecha_llegada_real = Column(DateTime)
    
    # Tipo y detalles
    tipo = Column(String(50), nullable=False)
    pasajeros = Column(Integer, nullable=False)
    equipaje = Column(String(50))
    descripcion = Column(Text)
    
    # Precios y costes
    precio_estimado = Column(Float, default=0)
    precio_final = Column(Float, default=0)
    moneda = Column(String(10), default="EUR")
    
    # Gastos
    gasto_conductor = Column(Float, default=0)
    gasto_auxiliar = Column(Float, default=0)
    gasto_gasoil = Column(Float, default=0)
    gasto_peajes = Column(Float, default=0)
    gasto_otros = Column(Float, default=0)
    
    # Estado y facturacion
    estado = Column(String(50), default="pendiente")
    facturado = Column(Boolean, default=False)
    factura_id = Column(Integer, ForeignKey("facturas.id"), nullable=True)
    
    # Observaciones
    observaciones = Column(Text)
    instrucciones = Column(Text)
    
    # Metadatos
    creado_por = Column(Integer, ForeignKey("usuarios.id"))
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Factura(Base):
    __tablename__ = "facturas"
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    
    # Fechas
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    fecha_pago = Column(Date, nullable=True)
    
    # Importes
    subtotal = Column(Float, default=0)
    descuento = Column(Float, default=0)
    impuesto_porcentaje = Column(Float, default=10)
    impuestos = Column(Float, default=0)
    total = Column(Float, default=0)
    
    # Estado y pago
    estado = Column(String(50), default="pendiente")
    metodo_pago = Column(String(50))
    forma_pago = Column(String(100))
    
    # Datos bancarios
    iban = Column(String(50))
    qr_pago = Column(String(500))
    
    # Notas
    notas = Column(Text)
    notas_cliente = Column(Text)
    terminos = Column(Text)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Fichaje(Base):
    __tablename__ = "fichajes"
    id = Column(Integer, primary_key=True, index=True)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    
    tipo = Column(String(50), nullable=False)  # entrada, salida, inicio_servicio, fin_servicio
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    
    # Ubicacion GPS (opcional)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    
    # Notas
    notas = Column(Text, nullable=True)