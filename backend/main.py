# ============================================
# MILANO - Backend Main (COMPLETO - Pydantic v2)
# ============================================

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional, List
import os
import logging

import models
import schemas
from database import engine, get_db, SessionLocal, check_db_connection
from auth import (
    get_current_user, 
    get_admin_user, 
    get_current_active_user,
    authenticate_user,
    create_access_token,
    get_password_hash,
    verify_password,
    check_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

# ============================================
# FASTAPI APP CONFIGURATION
# ============================================

app = FastAPI(
    title="MILANO Transport Management API",
    version="1.1.0",
    description="API para gestión de transporte MILANO",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================
# CORS CONFIGURATION
# ============================================

origins = [
    "https://milanobus.netlify.app",
    "https://*.netlify.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ============================================
# STARTUP - Crear admin y verificar DB
# ============================================

@app.on_event("startup")
async def startup_event():
    if not check_db_connection():
        logger.error("❌ No se pudo conectar a la base de datos")
        return
    
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            hashed = get_password_hash("admin123")
            admin = models.User(
                username="admin",
                email="admin@milano.com",
                hashed_password=hashed,
                nombre_completo="Administrador Sistema",
                rol=models.UserRole.ADMIN,
                activo=True
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Usuario admin creado: admin / admin123")
        else:
            logger.info("ℹ️ Usuario admin ya existe")
    except Exception as e:
        logger.error(f"⚠️ Error en startup: {e}")
    finally:
        db.close()

# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ============================================
# USER ENDPOINTS
# ============================================

@app.get("/users", response_model=List[schemas.User])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.post("/users", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    # Check username
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check email
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check password strength
    is_strong, error_msg = check_password_strength(user.password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        nombre_completo=user.nombre_completo,
        rol=user.rol
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # FIX: Pydantic v2 - usar model_dump en lugar de dict
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:  # FIX: Solo actualizar si hay valor
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

# ============================================
# CLIENTE ENDPOINTS
# ============================================

@app.get("/clientes", response_model=List[schemas.Cliente])
def get_clientes(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    clientes = db.query(models.Cliente).offset(skip).limit(limit).all()
    return clientes

@app.get("/clientes/{cliente_id}", response_model=schemas.Cliente)
def get_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cliente

@app.post("/clientes", response_model=schemas.Cliente)
def create_cliente(
    cliente: schemas.ClienteCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Check codigo
    if cliente.codigo:
        existing = db.query(models.Cliente).filter(models.Cliente.codigo == cliente.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # FIX: Pydantic v2 - usar model_dump en lugar de dict
    db_cliente = models.Cliente(**cliente.model_dump())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.Cliente)
def update_cliente(
    cliente_id: int, 
    cliente: schemas.ClienteUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    # FIX: Pydantic v2 - usar model_dump en lugar de dict
    update_data = cliente.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_cliente, key, value)
    
    db_cliente.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}")
def delete_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente deleted successfully"}

# ============================================
# CONDUCTOR ENDPOINTS
# ============================================

@app.get("/conductores", response_model=List[schemas.Conductor])
def get_conductores(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    conductores = db.query(models.Conductor).offset(skip).limit(limit).all()
    return conductores

@app.get("/conductores/{conductor_id}", response_model=schemas.Conductor)
def get_conductor(
    conductor_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    return conductor

@app.post("/conductores", response_model=schemas.Conductor)
def create_conductor(
    conductor: schemas.ConductorCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"📥 Creando conductor: {conductor.codigo} - {conductor.nombre} {conductor.apellidos}")
    
    # Check codigo
    if conductor.codigo:
        existing = db.query(models.Conductor).filter(models.Conductor.codigo == conductor.codigo).first()
        if existing:
            logger.warning(f"⚠️ Código duplicado: {conductor.codigo}")
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Check DNI
    existing = db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first()
    if existing:
        logger.warning(f"⚠️ DNI duplicado: {conductor.dni}")
        raise HTTPException(status_code=400, detail="DNI already exists")
    
    try:
        # FIX: Pydantic v2 - usar model_dump
        db_conductor = models.Conductor(**conductor.model_dump())
        db.add(db_conductor)
        db.commit()
        db.refresh(db_conductor)
        logger.info(f"✅ Conductor creado: ID {db_conductor.id}")
        return db_conductor
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creando conductor: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating conductor: {str(e)}")

@app.put("/conductores/{conductor_id}", response_model=schemas.Conductor)
def update_conductor(
    conductor_id: int, 
    conductor: schemas.ConductorUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    # FIX: Pydantic v2 - usar model_dump
    update_data = conductor.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_conductor, key, value)
    
    db_conductor.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(
    conductor_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor deleted successfully"}

# ============================================
# VEHICULO ENDPOINTS
# ============================================

@app.get("/vehiculos", response_model=List[schemas.Vehiculo])
def get_vehiculos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    vehiculos = db.query(models.Vehiculo).offset(skip).limit(limit).all()
    return vehiculos

@app.get("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def get_vehiculo(
    vehiculo_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    return vehiculo

@app.post("/vehiculos", response_model=schemas.Vehiculo)
def create_vehiculo(
    vehiculo: schemas.VehiculoCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    logger.info(f"📥 Creando vehículo: {vehiculo.codigo} - {vehiculo.matricula}")
    
    # Check codigo
    if vehiculo.codigo:
        existing = db.query(models.Vehiculo).filter(models.Vehiculo.codigo == vehiculo.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Check matricula
    existing = db.query(models.Vehiculo).filter(models.Vehiculo.matricula == vehiculo.matricula).first()
    if existing:
        raise HTTPException(status_code=400, detail="Matricula already exists")
    
    try:
        # FIX: Pydantic v2 - usar model_dump
        db_vehiculo = models.Vehiculo(**vehiculo.model_dump())
        db.add(db_vehiculo)
        db.commit()
        db.refresh(db_vehiculo)
        logger.info(f"✅ Vehículo creado: ID {db_vehiculo.id}")
        return db_vehiculo
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creando vehículo: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating vehiculo: {str(e)}")

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def update_vehiculo(
    vehiculo_id: int, 
    vehiculo: schemas.VehiculoUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    # FIX: Pydantic v2 - usar model_dump
    update_data = vehiculo.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_vehiculo, key, value)
    
    db_vehiculo.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(
    vehiculo_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehiculo deleted successfully"}

# ============================================
# SERVICIO ENDPOINTS
# ============================================

@app.get("/servicios", response_model=List[schemas.Servicio])
def get_servicios(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    servicios = db.query(models.Servicio).offset(skip).limit(limit).all()
    return servicios

@app.get("/servicios/{servicio_id}", response_model=schemas.Servicio)
def get_servicio(
    servicio_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    return servicio

@app.post("/servicios", response_model=schemas.Servicio)
def create_servicio(
    servicio: schemas.ServicioCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Check codigo
    if servicio.codigo:
        existing = db.query(models.Servicio).filter(models.Servicio.codigo == servicio.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Get cliente name
    cliente_nombre = None
    if servicio.cliente_id:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == servicio.cliente_id).first()
        if cliente:
            cliente_nombre = cliente.nombre
    
    # FIX: Pydantic v2 - usar model_dump
    servicio_data = servicio.model_dump()
    servicio_data["cliente_nombre"] = cliente_nombre
    
    db_servicio = models.Servicio(**servicio_data)
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.Servicio)
def update_servicio(
    servicio_id: int, 
    servicio: schemas.ServicioUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    # FIX: Pydantic v2 - usar model_dump
    update_data = servicio.model_dump(exclude_unset=True)
    
    # Update cliente_nombre if cliente_id changed
    if "cliente_id" in update_data and update_data["cliente_id"]:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == update_data["cliente_id"]).first()
        if cliente:
            update_data["cliente_nombre"] = cliente.nombre
    
    for key, value in update_data.items():
        if value is not None:
            setattr(db_servicio, key, value)
    
    db_servicio.fecha_modificacion = datetime.utcnow()
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(
    servicio_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    db.delete(db_servicio)
    db.commit()
    return {"message": "Servicio deleted successfully"}

# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Servicios activos
    servicios_activos = db.query(models.Servicio).filter(
        models.Servicio.estado.in_(['en_curso', 'asignado'])
    ).count()
    
    # Servicios de hoy
    hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    servicios_hoy = db.query(models.Servicio).filter(
        models.Servicio.fecha_inicio >= hoy_inicio,
        models.Servicio.fecha_inicio <= hoy_fin
    ).count()
    
    # Servicios del mes
    mes_inicio = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    servicios_mes = db.query(models.Servicio).filter(
        models.Servicio.fecha_creacion >= mes_inicio
    ).count()
    
    # Conductores
    conductores_disponibles = db.query(models.Conductor).filter(
        models.Conductor.estado == 'activo'
    ).count()
    
    conductores_ocupados = db.query(models.Conductor).filter(
        models.Conductor.estado == 'en_ruta'
    ).count()
    
    # Vehículos
    vehiculos_operativos = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == 'operativo'
    ).count()
    
    vehiculos_taller = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == 'taller'
    ).count()
    
    # Facturación
    facturacion_mes = db.query(models.Servicio).filter(
        models.Servicio.estado == 'facturado',
        models.Servicio.fecha_creacion >= mes_inicio
    ).all()
    
    total_facturado = sum([s.precio or 0 for s in facturacion_mes])
    
    pendientes_facturar = db.query(models.Servicio).filter(
        models.Servicio.estado == 'completado',
        models.Servicio.facturado == False
    ).count()
    
    return {
        "serviciosActivos": servicios_activos,
        "serviciosHoy": servicios_hoy,
        "serviciosMes": servicios_mes,
        "conductoresDisponibles": conductores_disponibles,
        "conductoresOcupados": conductores_ocupados,
        "vehiculosOperativos": vehiculos_operativos,
        "vehiculosTaller": vehiculos_taller,
        "facturacionMes": float(total_facturado),
        "facturacionPendiente": 0,
        "serviciosPendientesFacturar": pendientes_facturar
    }

@app.get("/dashboard/servicios-recientes")
def get_servicios_recientes(
    limit: int = 5,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    servicios = db.query(models.Servicio).order_by(
        models.Servicio.fecha_creacion.desc()
    ).limit(limit).all()
    
    return servicios

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
def health_check():
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.utcnow(),
        "version": "1.1.0"
    }

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "1.1.0",
        "docs": "/docs",
        "health": "/health"
    }