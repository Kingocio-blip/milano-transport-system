"""
MILANO - Backend API
FastAPI application for Transport Management System
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

from database import SessionLocal, engine, Base
from schemas import (
    ClienteCreate, ClienteResponse, ClienteUpdate,
    ConductorCreate, ConductorResponse, ConductorUpdate,
    VehiculoCreate, VehiculoResponse, VehiculoUpdate,
    ServicioCreate, ServicioResponse, ServicioUpdate,
    UsuarioCreate, UsuarioResponse, Token, TokenData
)
import models

# Login schema simple
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MILANO API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(authorization: Optional[str] = None, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    if not authorization:
        raise credentials_exception
    
    # Extraer token de "Bearer <token>"
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.Usuario).filter(models.Usuario.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/auth/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ============================================
# CLIENTES ENDPOINTS
# ============================================

@app.get("/clientes", response_model=List[ClienteResponse])
def get_clientes(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    clientes = db.query(models.Cliente).offset(skip).limit(limit).all()
    return clientes

@app.get("/clientes/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cliente

@app.post("/clientes", response_model=ClienteResponse)
def create_cliente(
    cliente_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    # Extraer contacto del objeto anidado (para compatibilidad)
    contacto = cliente_data.get("contacto", {}) if cliente_data.get("contacto") else {}
    
    # Extraer NIF
    nif = cliente_data.get("nif", "")
    
    db_cliente = models.Cliente(
        nombre=cliente_data.get("nombre", ""),
        tipo=cliente_data.get("tipo", "particular"),
        nif=nif if nif else None,
        
        # Contacto de la empresa (desde objeto contacto o campos planos)
        contacto_email=contacto.get("email") if contacto.get("email") else cliente_data.get("contacto_email"),
        contacto_telefono=contacto.get("telefono") if contacto.get("telefono") else cliente_data.get("contacto_telefono"),
        contacto_direccion=contacto.get("direccion") if contacto.get("direccion") else cliente_data.get("contacto_direccion"),
        contacto_ciudad=contacto.get("ciudad") if contacto.get("ciudad") else cliente_data.get("contacto_ciudad"),
        contacto_codigo_postal=contacto.get("codigoPostal") if contacto.get("codigoPostal") else cliente_data.get("contacto_codigo_postal"),
        
        # Persona de contacto principal (NUEVO - campos planos)
        persona_contacto_nombre=cliente_data.get("persona_contacto_nombre") if cliente_data.get("persona_contacto_nombre") else None,
        persona_contacto_email=cliente_data.get("persona_contacto_email") if cliente_data.get("persona_contacto_email") else None,
        persona_contacto_telefono=cliente_data.get("persona_contacto_telefono") if cliente_data.get("persona_contacto_telefono") else None,
        persona_contacto_cargo=cliente_data.get("persona_contacto_cargo") if cliente_data.get("persona_contacto_cargo") else None,
        
        # Información adicional
        web=cliente_data.get("web") if cliente_data.get("web") else None,
        observaciones=cliente_data.get("observaciones") if cliente_data.get("observaciones") else None,
        forma_pago=cliente_data.get("forma_pago", "transferencia"),
        dias_pago=cliente_data.get("dias_pago", 30),
        condiciones_especiales=cliente_data.get("condiciones_especiales") if cliente_data.get("condiciones_especiales") else None,
        
        estado=cliente_data.get("estado", "activo"),
        fecha_alta=datetime.utcnow(),
        creado_por=current_user.id
    )
    
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: int,
    cliente_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    # Extraer contacto del objeto anidado (para compatibilidad)
    contacto = cliente_data.get("contacto", {}) if cliente_data.get("contacto") else {}
    
    # Actualizar campos si existen en los datos
    if "nombre" in cliente_data:
        cliente.nombre = cliente_data["nombre"]
    if "tipo" in cliente_data:
        cliente.tipo = cliente_data["tipo"]
    if "nif" in cliente_data:
        cliente.nif = cliente_data["nif"] if cliente_data["nif"] else None
    
    # Contacto de la empresa
    if "contacto_email" in cliente_data or contacto.get("email"):
        cliente.contacto_email = contacto.get("email") if contacto.get("email") else cliente_data.get("contacto_email")
    if "contacto_telefono" in cliente_data or contacto.get("telefono"):
        cliente.contacto_telefono = contacto.get("telefono") if contacto.get("telefono") else cliente_data.get("contacto_telefono")
    if "contacto_direccion" in cliente_data or contacto.get("direccion"):
        cliente.contacto_direccion = contacto.get("direccion") if contacto.get("direccion") else cliente_data.get("contacto_direccion")
    if "contacto_ciudad" in cliente_data or contacto.get("ciudad"):
        cliente.contacto_ciudad = contacto.get("ciudad") if contacto.get("ciudad") else cliente_data.get("contacto_ciudad")
    if "contacto_codigo_postal" in cliente_data or contacto.get("codigoPostal"):
        cliente.contacto_codigo_postal = contacto.get("codigoPostal") if contacto.get("codigoPostal") else cliente_data.get("contacto_codigo_postal")
    
    # Persona de contacto principal (NUEVO)
    if "persona_contacto_nombre" in cliente_data:
        cliente.persona_contacto_nombre = cliente_data["persona_contacto_nombre"] if cliente_data["persona_contacto_nombre"] else None
    if "persona_contacto_email" in cliente_data:
        cliente.persona_contacto_email = cliente_data["persona_contacto_email"] if cliente_data["persona_contacto_email"] else None
    if "persona_contacto_telefono" in cliente_data:
        cliente.persona_contacto_telefono = cliente_data["persona_contacto_telefono"] if cliente_data["persona_contacto_telefono"] else None
    if "persona_contacto_cargo" in cliente_data:
        cliente.persona_contacto_cargo = cliente_data["persona_contacto_cargo"] if cliente_data["persona_contacto_cargo"] else None
    
    # Información adicional
    if "web" in cliente_data:
        cliente.web = cliente_data["web"] if cliente_data["web"] else None
    if "observaciones" in cliente_data:
        cliente.observaciones = cliente_data["observaciones"] if cliente_data["observaciones"] else None
    if "forma_pago" in cliente_data:
        cliente.forma_pago = cliente_data["forma_pago"]
    if "dias_pago" in cliente_data:
        cliente.dias_pago = cliente_data["dias_pago"]
    if "condiciones_especiales" in cliente_data:
        cliente.condiciones_especiales = cliente_data["condiciones_especiales"] if cliente_data["condiciones_especiales"] else None
    if "estado" in cliente_data:
        cliente.estado = cliente_data["estado"]
    
    cliente.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(cliente)
    return cliente

@app.delete("/clientes/{cliente_id}")
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    db.delete(cliente)
    db.commit()
    return {"message": "Cliente deleted successfully"}

# ============================================
# CONDUCTORES ENDPOINTS
# ============================================

@app.get("/conductores", response_model=List[ConductorResponse])
def get_conductores(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    conductores = db.query(models.Conductor).offset(skip).limit(limit).all()
    return conductores

@app.get("/conductores/{conductor_id}", response_model=ConductorResponse)
def get_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if conductor is None:
        raise HTTPException(status_code=404, detail="Conductor not found")
    return conductor

@app.post("/conductores", response_model=ConductorResponse)
def create_conductor(
    conductor_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_conductor = models.Conductor(
        nombre=conductor_data.get("nombre", ""),
        apellidos=conductor_data.get("apellidos", ""),
        dni=conductor_data.get("dni", ""),
        fecha_nacimiento=conductor_data.get("fecha_nacimiento"),
        telefono=conductor_data.get("telefono", ""),
        email=conductor_data.get("email", ""),
        direccion=conductor_data.get("direccion"),
        
        # Licencia
        licencia_tipo=conductor_data.get("licencia_tipo", "D"),
        licencia_numero=conductor_data.get("licencia_numero"),
        licencia_fecha_expedicion=conductor_data.get("licencia_fecha_expedicion"),
        licencia_fecha_caducidad=conductor_data.get("licencia_fecha_caducidad"),
        licencia_permisos=conductor_data.get("licencia_permisos"),
        
        # Tarifas
        tarifa_hora=conductor_data.get("tarifa_hora", 18.0),
        tarifa_servicio=conductor_data.get("tarifa_servicio"),
        
        # Disponibilidad
        disponibilidad_dias=conductor_data.get("disponibilidad_dias", [0, 1, 2, 3, 4]),
        disponibilidad_hora_inicio=conductor_data.get("disponibilidad_hora_inicio", "08:00"),
        disponibilidad_hora_fin=conductor_data.get("disponibilidad_hora_fin", "18:00"),
        disponibilidad_observaciones=conductor_data.get("disponibilidad_observaciones"),
        
        estado=conductor_data.get("estado", "activo"),
        notas=conductor_data.get("notas"),
        
        fecha_alta=datetime.utcnow(),
        creado_por=current_user.id
    )
    
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.put("/conductores/{conductor_id}", response_model=ConductorResponse)
def update_conductor(
    conductor_id: int,
    conductor_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if conductor is None:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    # Actualizar campos básicos
    for field in ["nombre", "apellidos", "dni", "fecha_nacimiento", "telefono", "email", "direccion"]:
        if field in conductor_data:
            setattr(conductor, field, conductor_data[field])
    
    # Licencia
    for field in ["licencia_tipo", "licencia_numero", "licencia_fecha_expedicion", "licencia_fecha_caducidad", "licencia_permisos"]:
        if field in conductor_data:
            setattr(conductor, field, conductor_data[field])
    
    # Tarifas
    for field in ["tarifa_hora", "tarifa_servicio"]:
        if field in conductor_data:
            setattr(conductor, field, conductor_data[field])
    
    # Disponibilidad
    for field in ["disponibilidad_dias", "disponibilidad_hora_inicio", "disponibilidad_hora_fin", "disponibilidad_observaciones"]:
        if field in conductor_data:
            setattr(conductor, field, conductor_data[field])
    
    # Otros campos
    for field in ["estado", "notas"]:
        if field in conductor_data:
            setattr(conductor, field, conductor_data[field])
    
    conductor.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(conductor)
    return conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if conductor is None:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    db.delete(conductor)
    db.commit()
    return {"message": "Conductor deleted successfully"}

# ============================================
# VEHICULOS ENDPOINTS
# ============================================

@app.get("/vehiculos", response_model=List[VehiculoResponse])
def get_vehiculos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculos = db.query(models.Vehiculo).offset(skip).limit(limit).all()
    return vehiculos

@app.get("/vehiculos/{vehiculo_id}", response_model=VehiculoResponse)
def get_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    return vehiculo

@app.post("/vehiculos", response_model=VehiculoResponse)
def create_vehiculo(
    vehiculo_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_vehiculo = models.Vehiculo(
        matricula=vehiculo_data.get("matricula", ""),
        bastidor=vehiculo_data.get("bastidor"),
        marca=vehiculo_data.get("marca", ""),
        modelo=vehiculo_data.get("modelo", ""),
        tipo=vehiculo_data.get("tipo", "autobus"),
        plazas=vehiculo_data.get("plazas", 50),
        año_fabricacion=vehiculo_data.get("año_fabricacion"),
        kilometraje=vehiculo_data.get("kilometraje", 0),
        kilometraje_ultima_revision=vehiculo_data.get("kilometraje_ultima_revision"),
        consumo_medio=vehiculo_data.get("consumo_medio"),
        combustible=vehiculo_data.get("combustible", "diesel"),
        estado=vehiculo_data.get("estado", "operativo"),
        ubicacion=vehiculo_data.get("ubicacion"),
        notas=vehiculo_data.get("notas"),
        imagen_url=vehiculo_data.get("imagen_url"),
        
        # ITV
        itv_fecha_ultima=vehiculo_data.get("itv_fecha_ultima"),
        itv_fecha_proxima=vehiculo_data.get("itv_fecha_proxima"),
        itv_resultado=vehiculo_data.get("itv_resultado"),
        itv_observaciones=vehiculo_data.get("itv_observaciones"),
        
        # Seguro
        seguro_compania=vehiculo_data.get("seguro_compania"),
        seguro_poliza=vehiculo_data.get("seguro_poliza"),
        seguro_tipo_cobertura=vehiculo_data.get("seguro_tipo_cobertura"),
        seguro_fecha_inicio=vehiculo_data.get("seguro_fecha_inicio"),
        seguro_fecha_vencimiento=vehiculo_data.get("seguro_fecha_vencimiento"),
        seguro_prima=vehiculo_data.get("seguro_prima"),
        
        fecha_creacion=datetime.utcnow(),
        creado_por=current_user.id
    )
    
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=VehiculoResponse)
def update_vehiculo(
    vehiculo_id: int,
    vehiculo_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    # Campos básicos
    basic_fields = ["matricula", "bastidor", "marca", "modelo", "tipo", "plazas", 
                    "año_fabricacion", "kilometraje", "kilometraje_ultima_revision",
                    "consumo_medio", "combustible", "estado", "ubicacion", "notas", "imagen_url"]
    for field in basic_fields:
        if field in vehiculo_data:
            setattr(vehiculo, field, vehiculo_data[field])
    
    # ITV
    itv_fields = ["itv_fecha_ultima", "itv_fecha_proxima", "itv_resultado", "itv_observaciones"]
    for field in itv_fields:
        if field in vehiculo_data:
            setattr(vehiculo, field, vehiculo_data[field])
    
    # Seguro
    seguro_fields = ["seguro_compania", "seguro_poliza", "seguro_tipo_cobertura",
                     "seguro_fecha_inicio", "seguro_fecha_vencimiento", "seguro_prima"]
    for field in seguro_fields:
        if field in vehiculo_data:
            setattr(vehiculo, field, vehiculo_data[field])
    
    vehiculo.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(vehiculo)
    return vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    db.delete(vehiculo)
    db.commit()
    return {"message": "Vehiculo deleted successfully"}

# ============================================
# SERVICIOS ENDPOINTS
# ============================================

@app.get("/servicios", response_model=List[ServicioResponse])
def get_servicios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicios = db.query(models.Servicio).offset(skip).limit(limit).all()
    return servicios

@app.get("/servicios/{servicio_id}", response_model=ServicioResponse)
def get_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if servicio is None:
        raise HTTPException(status_code=404, detail="Servicio not found")
    return servicio

@app.post("/servicios", response_model=ServicioResponse)
def create_servicio(
    servicio_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    # Generar código único
    last_servicio = db.query(models.Servicio).order_by(models.Servicio.id.desc()).first()
    new_id = (last_servicio.id + 1) if last_servicio else 1
    codigo = f"SRV{new_id:04d}"
    
    db_servicio = models.Servicio(
        codigo=codigo,
        cliente_id=servicio_data.get("cliente_id"),
        tipo=servicio_data.get("tipo", "traslado"),
        estado=servicio_data.get("estado", "planificado"),
        
        fecha_inicio=servicio_data.get("fecha_inicio"),
        fecha_fin=servicio_data.get("fecha_fin"),
        hora_inicio=servicio_data.get("hora_inicio"),
        hora_fin=servicio_data.get("hora_fin"),
        
        titulo=servicio_data.get("titulo", ""),
        descripcion=servicio_data.get("descripcion"),
        
        numero_vehiculos=servicio_data.get("numero_vehiculos", 1),
        vehiculos_asignados=servicio_data.get("vehiculos_asignados", []),
        conductores_asignados=servicio_data.get("conductores_asignados", []),
        
        origen=servicio_data.get("origen"),
        destino=servicio_data.get("destino"),
        ubicacion_evento=servicio_data.get("ubicacion_evento"),
        
        coste_estimado=servicio_data.get("coste_estimado", 0),
        coste_real=servicio_data.get("coste_real"),
        precio=servicio_data.get("precio", 0),
        
        facturado=servicio_data.get("facturado", False),
        factura_id=servicio_data.get("factura_id"),
        
        notas_internas=servicio_data.get("notas_internas"),
        notas_cliente=servicio_data.get("notas_cliente"),
        
        rutas=servicio_data.get("rutas", []),
        tareas=servicio_data.get("tareas", []),
        incidencias=servicio_data.get("incidencias", []),
        documentos=servicio_data.get("documentos", []),
        
        fecha_creacion=datetime.utcnow(),
        creado_por=current_user.id
    )
    
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.put("/servicios/{servicio_id}", response_model=ServicioResponse)
def update_servicio(
    servicio_id: int,
    servicio_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if servicio is None:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    # Lista de campos actualizables
    fields = [
        "cliente_id", "tipo", "estado",
        "fecha_inicio", "fecha_fin", "hora_inicio", "hora_fin",
        "titulo", "descripcion",
        "numero_vehiculos", "vehiculos_asignados", "conductores_asignados",
        "origen", "destino", "ubicacion_evento",
        "coste_estimado", "coste_real", "precio",
        "facturado", "factura_id",
        "notas_internas", "notas_cliente",
        "rutas", "tareas", "incidencias", "documentos"
    ]
    
    for field in fields:
        if field in servicio_data:
            setattr(servicio, field, servicio_data[field])
    
    servicio.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(servicio)
    return servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if servicio is None:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    db.delete(servicio)
    db.commit()
    return {"message": "Servicio deleted successfully"}

# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    hoy = datetime.utcnow()
    treinta_dias = hoy + timedelta(days=30)
    
    # Conteos básicos
    total_clientes = db.query(models.Cliente).count()
    total_conductores = db.query(models.Conductor).count()
    total_vehiculos = db.query(models.Vehiculo).count()
    total_servicios = db.query(models.Servicio).count()
    
    # Servicios por estado
    servicios_pendientes = db.query(models.Servicio).filter(models.Servicio.estado == "pendiente").count()
    servicios_en_curso = db.query(models.Servicio).filter(models.Servicio.estado == "en_curso").count()
    servicios_completados = db.query(models.Servicio).filter(models.Servicio.estado == "completado").count()
    
    # Vehículos por estado
    vehiculos_operativos = db.query(models.Vehiculo).filter(models.Vehiculo.estado == "operativo").count()
    vehiculos_mantenimiento = db.query(models.Vehiculo).filter(models.Vehiculo.estado == "mantenimiento").count()
    
    # Conductores por estado
    conductores_activos = db.query(models.Conductor).filter(models.Conductor.estado == "activo").count()
    conductores_ocupados = db.query(models.Conductor).filter(models.Conductor.estado == "ocupado").count()
    
    # Alertas
    alertas = []
    
    # Alertas de ITV (próximas a vencer)
    vehiculos = db.query(models.Vehiculo).all()
    for v in vehiculos:
        if v.itv_fecha_proxima:
            fecha_itv = datetime.fromisoformat(str(v.itv_fecha_proxima)) if isinstance(v.itv_fecha_proxima, str) else v.itv_fecha_proxima
            if fecha_itv <= treinta_dias and fecha_itv >= hoy:
                alertas.append({
                    "tipo": "itv",
                    "mensaje": f"ITV de {v.matricula} vence el {v.itv_fecha_proxima}",
                    "fecha": v.itv_fecha_proxima,
                    "vehiculo_id": v.id
                })
    
    # Alertas de seguros
    for v in vehiculos:
        if v.seguro_fecha_vencimiento:
            fecha_seguro = datetime.fromisoformat(str(v.seguro_fecha_vencimiento)) if isinstance(v.seguro_fecha_vencimiento, str) else v.seguro_fecha_vencimiento
            if fecha_seguro <= treinta_dias and fecha_seguro >= hoy:
                alertas.append({
                    "tipo": "seguro",
                    "mensaje": f"Seguro de {v.matricula} vence el {v.seguro_fecha_vencimiento}",
                    "fecha": v.seguro_fecha_vencimiento,
                    "vehiculo_id": v.id
                })
    
    # Alertas de licencias
    conductores = db.query(models.Conductor).all()
    for c in conductores:
        if c.licencia_fecha_caducidad:
            fecha_lic = datetime.fromisoformat(str(c.licencia_fecha_caducidad)) if isinstance(c.licencia_fecha_caducidad, str) else c.licencia_fecha_caducidad
            if fecha_lic <= treinta_dias and fecha_lic >= hoy:
                alertas.append({
                    "tipo": "licencia",
                    "mensaje": f"Licencia de {c.nombre} {c.apellidos} vence el {c.licencia_fecha_caducidad}",
                    "fecha": c.licencia_fecha_caducidad,
                    "conductor_id": c.id
                })
    
    return {
        "conteos": {
            "clientes": total_clientes,
            "conductores": total_conductores,
            "vehiculos": total_vehiculos,
            "servicios": total_servicios
        },
        "servicios": {
            "pendientes": servicios_pendientes,
            "en_curso": servicios_en_curso,
            "completados": servicios_completados
        },
        "vehiculos": {
            "operativos": vehiculos_operativos,
            "mantenimiento": vehiculos_mantenimiento
        },
        "conductores": {
            "activos": conductores_activos,
            "ocupados": conductores_ocupados
        },
        "alertas": alertas
    }

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
