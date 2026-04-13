"""
MILANO - Database Models
SQLAlchemy models for the Transport Management System
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    tipo = Column(String(50), default="empresa")  # empresa, particular
    nif = Column(String(50), unique=True, nullable=True)
    
    # Contacto de la empresa
    contacto_email = Column(String(255), nullable=True)
    contacto_telefono = Column(String(50), nullable=True)
    contacto_direccion = Column(String(255), nullable=True)
    contacto_ciudad = Column(String(100), nullable=True)
    contacto_codigo_postal = Column(String(20), nullable=True)
    
    # Persona de contacto principal (NUEVO)
    persona_contacto_nombre = Column(String(255), nullable=True)
    persona_contacto_email = Column(String(255), nullable=True)
    persona_contacto_telefono = Column(String(50), nullable=True)
    persona_contacto_cargo = Column(String(100), nullable=True)
    
    # Información adicional
    web = Column(String(255), nullable=True)
    observaciones = Column(Text, nullable=True)
    forma_pago = Column(String(50), default="transferencia")
    dias_pago = Column(Integer, default=30)
    condiciones_especiales = Column(Text, nullable=True)
    
    # Estado
    estado = Column(String(50), default="activo")  # activo, inactivo, bloqueado
    
    # Metadatos
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Relaciones
    servicios = relationship("Servicio", back_populates="cliente")

class Conductor(Base):
    __tablename__ = "conductores"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=True)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    dni = Column(String(50), unique=True, nullable=True)
    fecha_nacimiento = Column(DateTime, nullable=True)
    telefono = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    direccion = Column(String(255), nullable=True)
    
    # Licencia
    licencia_tipo = Column(String(10), default="D")
    licencia_numero = Column(String(50), nullable=True)
    licencia_fecha_expedicion = Column(DateTime, nullable=True)
    licencia_fecha_caducidad = Column(DateTime, nullable=True)
    licencia_permisos = Column(JSON, nullable=True)
    
    # Tarifas
    tarifa_hora = Column(Float, default=18.0)
    tarifa_servicio = Column(Float, nullable=True)
    
    # Disponibilidad
    disponibilidad_dias = Column(JSON, default=list)  # [0,1,2,3,4] = Lunes a Viernes
    disponibilidad_hora_inicio = Column(String(10), default="08:00")
    disponibilidad_hora_fin = Column(String(10), default="18:00")
    disponibilidad_observaciones = Column(Text, nullable=True)
    
    # Estadísticas
    total_horas_mes = Column(Float, default=0)
    total_servicios_mes = Column(Integer, default=0)
    
    # Estado
    estado = Column(String(50), default="activo")  # activo, inactivo, ocupado, baja
    
    # Notas
    notas = Column(Text, nullable=True)
    
    # Metadatos
    fecha_alta = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), unique=True, nullable=False)
    bastidor = Column(String(50), unique=True, nullable=True)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    tipo = Column(String(50), default="autobus")  # autobus, minibus, furgoneta, coche
    plazas = Column(Integer, default=50)
    año_fabricacion = Column(Integer, nullable=True)
    
    # Kilometraje
    kilometraje = Column(Integer, default=0)
    kilometraje_ultima_revision = Column(Integer, nullable=True)
    
    # Consumo
    consumo_medio = Column(Float, nullable=True)
    combustible = Column(String(50), default="diesel")  # diesel, gasolina, electrico, hibrido
    
    # Estado
    estado = Column(String(50), default="operativo")  # operativo, taller, baja, reserva
    ubicacion = Column(String(255), nullable=True)
    
    # Notas
    notas = Column(Text, nullable=True)
    imagen_url = Column(String(500), nullable=True)
    
    # ITV
    itv_fecha_ultima = Column(DateTime, nullable=True)
    itv_fecha_proxima = Column(DateTime, nullable=True)
    itv_resultado = Column(String(50), nullable=True)  # favorable, desfavorable, negativo
    itv_observaciones = Column(Text, nullable=True)
    
    # Seguro
    seguro_compania = Column(String(100), nullable=True)
    seguro_poliza = Column(String(100), nullable=True)
    seguro_tipo_cobertura = Column(String(50), nullable=True)  # todo_riesgo, terceros, etc.
    seguro_fecha_inicio = Column(DateTime, nullable=True)
    seguro_fecha_vencimiento = Column(DateTime, nullable=True)
    seguro_prima = Column(Float, nullable=True)
    
    # Mantenimientos (JSON)
    mantenimientos = Column(JSON, default=list)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    
    # Cliente
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    cliente = relationship("Cliente", back_populates="servicios")
    
    # Tipo y estado
    tipo = Column(String(50), default="traslado")  # traslado, evento, tour, escolar, etc.
    estado = Column(String(50), default="planificado")  # planificado, confirmado, en_curso, completado, cancelado
    
    # Fechas y horas
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    
    # Descripción
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    # Recursos asignados
    numero_vehiculos = Column(Integer, default=1)
    vehiculos_asignados = Column(JSON, default=list)  # Lista de IDs de vehículos
    conductores_asignados = Column(JSON, default=list)  # Lista de IDs de conductores
    
    # Ubicación
    origen = Column(String(255), nullable=True)
    destino = Column(String(255), nullable=True)
    ubicacion_evento = Column(String(255), nullable=True)
    
    # Costes y precios
    coste_estimado = Column(Float, default=0)
    coste_real = Column(Float, nullable=True)
    precio = Column(Float, default=0)
    
    # Facturación
    facturado = Column(Boolean, default=False)
    factura_id = Column(Integer, nullable=True)
    
    # Notas
    notas_internas = Column(Text, nullable=True)
    notas_cliente = Column(Text, nullable=True)
    
    # Datos adicionales (JSON)
    rutas = Column(JSON, default=list)
    tareas = Column(JSON, default=list)
    incidencias = Column(JSON, default=list)
    documentos = Column(JSON, default=list)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=True)
    apellidos = Column(String(100), nullable=True)
    
    # Rol
    rol = Column(String(50), default="admin")  # admin, gestor, conductor, solo_lectura
    
    # Estado
    activo = Column(Boolean, default=True)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultimo_acceso = Column(DateTime, nullable=True)

class Factura(Base):
    __tablename__ = "facturas"
    
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False)
    
    # Cliente
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    
    # Fechas
    fecha_emision = Column(DateTime, default=datetime.utcnow)
    fecha_vencimiento = Column(DateTime, nullable=True)
    
    # Importes
    subtotal = Column(Float, default=0)
    impuestos = Column(Float, default=0)
    total = Column(Float, default=0)
    
    # Estado
    estado = Column(String(50), default="pendiente")  # pendiente, enviada, pagada, cancelada, vencida
    
    # Servicios incluidos
    servicios_ids = Column(JSON, default=list)
    
    # Notas
    notas = Column(Text, nullable=True)
    
    # Metadatos
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
