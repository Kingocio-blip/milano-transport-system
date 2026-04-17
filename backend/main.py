# ============================================
# MILANO - Backend Main (COMPLETO - Pydantic v2)
# ============================================

from permissions import (
    require_permission, 
    has_permission, 
    inicializar_permisos_sistema, 
    inicializar_roles_sistema,
    user_can
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import joinedload
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
    version="1.2.0",
    description="API para gestión de transporte MILANO con permisos granulares",
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
# STARTUP - Crear admin, permisos y verificar DB
# ============================================

@app.on_event("startup")
async def startup_event():
    if not check_db_connection():
        logger.error("❌ No se pudo conectar a la base de datos")
        return
    
    db = SessionLocal()
    try:
        # Inicializar permisos y roles del sistema
        inicializar_permisos_sistema(db)
        inicializar_roles_sistema(db)
        
        # Crear admin si no existe
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
# USER ENDPOINTS (PERMISOS GRANULARES)
# ============================================

@app.get("/users", response_model=List[schemas.User])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_permission("usuarios.ver"))
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.post("/users", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_permission("usuarios.crear"))
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
    current_user: models.User = Depends(require_permission("usuarios.editar"))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # No permitir editar a uno mismo (evitar bloqueos)
    if db_user.id == current_user.id:
        # Solo permitir cambiar ciertos campos
        allowed_fields = ['nombre_completo', 'email']
        update_data = user_update.model_dump(exclude_unset=True)
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        filtered_data = user_update.model_dump(exclude_unset=True)
    
    for key, value in filtered_data.items():
        if value is not None:
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("usuarios.eliminar"))
):
    # No permitir eliminarse a sí mismo
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

# ============================================
# CLIENTE ENDPOINTS (PERMISOS GRANULARES)
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
    current_user: models.User = Depends(require_permission("clientes.crear"))
):
    # Check codigo
    if cliente.codigo:
        existing = db.query(models.Cliente).filter(models.Cliente.codigo == cliente.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
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
    current_user: models.User = Depends(require_permission("clientes.editar"))
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
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
    current_user: models.User = Depends(require_permission("clientes.eliminar"))
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente deleted successfully"}

# ============================================
# CONDUCTOR ENDPOINTS (PERMISOS GRANULARES)
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
    current_user: models.User = Depends(require_permission("conductores.crear"))
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
    current_user: models.User = Depends(require_permission("conductores.editar"))
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
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
    current_user: models.User = Depends(require_permission("conductores.eliminar"))
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor deleted successfully"}

# ============================================
# VEHICULO ENDPOINTS (PERMISOS GRANULARES)
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
    current_user: models.User = Depends(require_permission("vehiculos.crear"))
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
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
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
    current_user: models.User = Depends(require_permission("vehiculos.eliminar"))
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehiculo deleted successfully"}

# ============================================
# VEHICULO HISTORIAL ENDPOINTS (PERMISOS GRANULARES)
# ============================================

@app.get("/vehiculos/{vehiculo_id}/historial")
def get_vehiculo_historial(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.historial"))
):
    """Obtener historial completo de un vehículo (mantenimientos, averías, anotaciones)"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    # Obtener mantenimientos
    mantenimientos = db.query(models.Mantenimiento).filter(
        models.Mantenimiento.vehiculo_id == vehiculo_id
    ).order_by(models.Mantenimiento.fecha.desc()).all()
    
    # Obtener averías
    averias = db.query(models.Averia).filter(
        models.Averia.vehiculo_id == vehiculo_id
    ).order_by(models.Averia.fecha_inicio.desc()).all()
    
    # Obtener anotaciones
    anotaciones = db.query(models.AnotacionVehiculo).filter(
        models.AnotacionVehiculo.vehiculo_id == vehiculo_id
    ).order_by(models.AnotacionVehiculo.fecha.desc()).all()
    
    return {
        "vehiculo_id": vehiculo_id,
        "matricula": vehiculo.matricula,
        "codigo": vehiculo.codigo,
        "mantenimientos": [
            {
                "id": m.id,
                "tipo": m.tipo.value if m.tipo else None,
                "fecha": m.fecha.isoformat() if m.fecha else None,
                "kilometraje": m.kilometraje,
                "descripcion": m.descripcion,
                "taller": m.taller,
                "coste": float(m.coste) if m.coste else None,
                "factura_numero": getattr(m, 'factura_numero', None),
                "realizado_por": m.realizado_por,
                "proxima_fecha": getattr(m, 'proxima_fecha', None).isoformat() if getattr(m, 'proxima_fecha', None) else None,
                "proximo_kilometraje": getattr(m, 'proximo_kilometraje', None),
                "estado": getattr(m, 'estado', None),
            } for m in mantenimientos
        ],
        "averias": [
            {
                "id": a.id,
                "descripcion": a.descripcion,
                "fecha_inicio": a.fecha_inicio.isoformat() if a.fecha_inicio else None,
                "fecha_fin": a.fecha_fin.isoformat() if a.fecha_fin else None,
                "gravedad": a.gravedad.value if a.gravedad else None,
                "estado": a.estado.value if a.estado else None,
                "taller": a.taller,
                "coste_reparacion": float(a.coste_reparacion) if a.coste_reparacion else None,
                "diagnostico": a.diagnostico,
                "solucion": a.solucion,
                "reportado_por": a.reportado_por,
            } for a in averias
        ],
        "anotaciones": [
            {
                "id": an.id,
                "tipo": an.tipo.value if an.tipo else None,
                "fecha": an.fecha.isoformat() if an.fecha else None,
                "contenido": an.descripcion,
                "conductor_id": an.conductor_id,
                "conductor_nombre": an.conductor_nombre,
                "servicio_id": an.servicio_id,
                "kilometraje": an.kilometraje,
            } for an in anotaciones
        ]
    }

@app.get("/vehiculos/{vehiculo_id}/mantenimientos")
def get_mantenimientos(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Listar mantenimientos de un vehículo"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    mantenimientos = db.query(models.Mantenimiento).filter(
        models.Mantenimiento.vehiculo_id == vehiculo_id
    ).order_by(models.Mantenimiento.fecha.desc()).all()
    
    return mantenimientos

@app.post("/vehiculos/{vehiculo_id}/mantenimientos", status_code=status.HTTP_201_CREATED)
def create_mantenimiento(
    vehiculo_id: int,
    mantenimiento: schemas.MantenimientoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    """Registrar nuevo mantenimiento"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db_mantenimiento = models.Mantenimiento(
        vehiculo_id=vehiculo_id,
        **mantenimiento.model_dump()
    )
    db.add(db_mantenimiento)
    
    # Actualizar kilometraje si es mayor
    if mantenimiento.kilometraje and mantenimiento.kilometraje > vehiculo.kilometraje:
        vehiculo.kilometraje = mantenimiento.kilometraje
    
    db.commit()
    db.refresh(db_mantenimiento)
    
    logger.info(f"✅ Mantenimiento registrado para vehículo {vehiculo.matricula}")
    return db_mantenimiento

@app.get("/vehiculos/{vehiculo_id}/averias")
def get_averias(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Listar averías de un vehículo"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    averias = db.query(models.Averia).filter(
        models.Averia.vehiculo_id == vehiculo_id
    ).order_by(models.Averia.fecha_inicio.desc()).all()
    
    return averias

@app.post("/vehiculos/{vehiculo_id}/averias", status_code=status.HTTP_201_CREATED)
def create_averia(
    vehiculo_id: int,
    averia: schemas.AveriaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    """Reportar nueva avería"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    # Si la gravedad es crítica, cambiar estado del vehículo
    if averia.gravedad == models.GravedadAveria.CRITICA:
        vehiculo.estado = models.EstadoVehiculo.TALLER
    
    db_averia = models.Averia(
        vehiculo_id=vehiculo_id,
        **averia.model_dump()
    )
    db.add(db_averia)
    db.commit()
    db.refresh(db_averia)
    
    logger.warning(f"⚠️ Avería reportada en vehículo {vehiculo.matricula}: {averia.gravedad.value}")
    return db_averia

@app.put("/vehiculos/{vehiculo_id}/averias/{averia_id}")
def update_averia(
    vehiculo_id: int,
    averia_id: int,
    averia_update: schemas.AveriaUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    """Actualizar avería (resolver, etc.)"""
    db_averia = db.query(models.Averia).filter(
        models.Averia.id == averia_id,
        models.Averia.vehiculo_id == vehiculo_id
    ).first()
    
    if not db_averia:
        raise HTTPException(status_code=404, detail="Avería no encontrada")
    
    update_data = averia_update.model_dump(exclude_unset=True)
    
    # Si se marca como resuelta
    if update_data.get('estado') == models.EstadoAveria.RESUELTA and not db_averia.fecha_fin:
        update_data['fecha_fin'] = datetime.utcnow()
        
        # Verificar si hay más averías abiertas
        averias_abiertas = db.query(models.Averia).filter(
            models.Averia.vehiculo_id == vehiculo_id,
            models.Averia.estado.in_([
                models.EstadoAveria.REPORTADA,
                models.EstadoAveria.EN_DIAGNOSTICO,
                models.EstadoAveria.EN_REPARACION
            ])
        ).count()
        
        # Si no hay más, poner vehículo como operativo
        if averias_abiertas == 0:
            vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
            vehiculo.estado = models.EstadoVehiculo.OPERATIVO
    
    for key, value in update_data.items():
        setattr(db_averia, key, value)
    
    db.commit()
    db.refresh(db_averia)
    return db_averia

@app.get("/vehiculos/{vehiculo_id}/anotaciones")
def get_anotaciones(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Listar anotaciones de conductores sobre un vehículo"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    anotaciones = db.query(models.AnotacionVehiculo).filter(
        models.AnotacionVehiculo.vehiculo_id == vehiculo_id
    ).order_by(models.AnotacionVehiculo.fecha.desc()).all()
    
    return anotaciones

@app.post("/vehiculos/{vehiculo_id}/anotaciones", status_code=status.HTTP_201_CREATED)
def create_anotacion(
    vehiculo_id: int,
    anotacion: schemas.AnotacionVehiculoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crear anotación de conductor sobre vehículo"""
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    # Obtener nombre del conductor si hay conductor_id
    conductor_nombre = None
    if anotacion.conductor_id:
        conductor = db.query(models.Conductor).filter(
            models.Conductor.id == anotacion.conductor_id
        ).first()
        if conductor:
            conductor_nombre = f"{conductor.nombre} {conductor.apellidos}"
    
    db_anotacion = models.AnotacionVehiculo(
        vehiculo_id=vehiculo_id,
        conductor_nombre=conductor_nombre,
        **anotacion.model_dump()
    )
    db.add(db_anotacion)
    
    # Actualizar kilometraje si es mayor
    if anotacion.kilometraje and anotacion.kilometraje > vehiculo.kilometraje:
        vehiculo.kilometraje = anotacion.kilometraje
    
    db.commit()
    db.refresh(db_anotacion)
    
    return db_anotacion

@app.get("/vehiculos/alertas/pendientes")
def get_alertas_vehiculos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Alertas de mantenimiento y averías pendientes"""
    from datetime import timedelta
    
    alertas = []
    fecha_limite = datetime.utcnow() + timedelta(days=30)
    
    # ITV próxima a vencer
    vehiculos_itv = db.query(models.Vehiculo).filter(
        models.Vehiculo.itv_fecha_proxima <= fecha_limite.date(),
        models.Vehiculo.estado != models.EstadoVehiculo.BAJA
    ).all()
    
    for v in vehiculos_itv:
        dias_restantes = (v.itv_fecha_proxima - datetime.utcnow().date()).days
        alertas.append({
            "tipo": "itv",
            "gravedad": "alta" if dias_restantes <= 7 else "media",
            "vehiculo_id": v.id,
            "vehiculo_matricula": v.matricula,
            "mensaje": f"ITV vence en {dias_restantes} días",
            "fecha_limite": v.itv_fecha_proxima.isoformat()
        })
    
    # Averías no resueltas
    averias = db.query(models.Averia).filter(
        models.Averia.estado.in_([
            models.EstadoAveria.REPORTADA,
            models.EstadoAveria.EN_DIAGNOSTICO,
            models.EstadoAveria.EN_REPARACION
        ])
    ).all()
    
    for a in averias:
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == a.vehiculo_id).first()
        alertas.append({
            "tipo": "averia",
            "gravedad": a.gravedad.value,
            "vehiculo_id": a.vehiculo_id,
            "vehiculo_matricula": vehiculo.matricula if vehiculo else None,
            "mensaje": f"Avería {a.estado.value}: {a.descripcion[:50]}...",
            "fecha_inicio": a.fecha_inicio.isoformat()
        })
    
    # Ordenar por gravedad
    gravedad_orden = {"critica": 0, "grave": 1, "alta": 2, "media": 3, "leve": 4}
    alertas.sort(key=lambda x: gravedad_orden.get(x["gravedad"], 5))
    
    return alertas

# ============================================
# SERVICIO ENDPOINTS (PERMISOS GRANULARES)
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
    current_user: models.User = Depends(require_permission("servicios.crear"))
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
    current_user: models.User = Depends(require_permission("servicios.editar"))
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
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
    current_user: models.User = Depends(require_permission("servicios.eliminar"))
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
    current_user: models.User = Depends(require_permission("dashboard.ver"))
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
        models.Conductor.estado == models.EstadoConductor.ACTIVO
    ).count()
    
    conductores_ocupados = db.query(models.Conductor).filter(
        models.Conductor.estado == models.EstadoConductor.EN_RUTA
    ).count()
    
    # Vehículos
    vehiculos_operativos = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == models.EstadoVehiculo.OPERATIVO
    ).count()
    
    vehiculos_taller = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == models.EstadoVehiculo.TALLER
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
    current_user: models.User = Depends(require_permission("dashboard.ver"))
):
    servicios = db.query(models.Servicio).order_by(
        models.Servicio.fecha_creacion.desc()
    ).limit(limit).all()
    
    return servicios

# ============================================
# PERMISSIONS INFO ENDPOINT (NUEVO)
# ============================================

@app.get("/auth/permissions")
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtener lista de permisos del usuario actual (para frontend)"""
    from permissions import get_permisos_usuario
    
    permisos = get_permisos_usuario(current_user, db)
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "rol": current_user.rol.value,
        "rol_custom": current_user.rol_custom_obj.nombre if current_user.rol_custom_obj else None,
        "permisos": permisos
    }

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
        "version": "1.2.0"
    }

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "1.2.0",
        "docs": "/docs",
        "health": "/health"
    }

# ============================================
# ROLES Y PERMISOS ENDPOINTS (para frontend)
# ============================================

@app.get("/permissions", response_model=List[schemas.Permission])
def get_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lista todos los permisos disponibles (para crear roles)"""
    permisos = db.query(models.Permission).filter(
        models.Permission.activo == True
    ).order_by(models.Permission.categoria, models.Permission.nombre).all()
    return permisos

@app.get("/roles", response_model=List[schemas.Role])
def get_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lista todos los roles (sistema + custom de la empresa del usuario)"""
    # TODO: Filtrar por empresa_id cuando implementemos multi-tenant
    roles = db.query(models.Role).options(
        joinedload(models.Role.permissions).joinedload(models.RolePermission.permission)
    ).all()
    return roles

@app.get("/roles/{role_id}", response_model=schemas.Role)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtener un rol específico con sus permisos"""
    rol = db.query(models.Role).options(
        joinedload(models.Role.permissions).joinedload(models.RolePermission.permission)
    ).filter(models.Role.id == role_id).first()
    
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    return rol

@app.post("/roles", response_model=schemas.Role)
def create_role(
    role_data: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("configuracion.roles"))
):
    """Crear un nuevo rol custom"""
    # Verificar código único
    existing = db.query(models.Role).filter(
        models.Role.codigo == role_data.codigo,
        models.Role.empresa_id == current_user.empresa_id  # o None si no hay multi-tenant
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Código de rol ya existe")
    
    # Crear rol
    rol = models.Role(
        codigo=role_data.codigo,
        nombre=role_data.nombre,
        descripcion=role_data.descripcion,
        es_sistema=False,
        empresa_id=current_user.empresa_id,  # Asociar a empresa del creador
        activo=True
    )
    db.add(rol)
    db.flush()  # Obtener ID
    
    # Asignar permisos
    for permiso_id in role_data.permisos_ids:
        rp = models.RolePermission(role_id=rol.id, permission_id=permiso_id)
        db.add(rp)
    
    db.commit()
    db.refresh(rol)
    return rol

@app.put("/roles/{role_id}", response_model=schemas.Role)
def update_role(
    role_id: int,
    role_data: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("configuracion.roles"))
):
    """Actualizar un rol custom (no se pueden editar roles del sistema)"""
    rol = db.query(models.Role).filter(models.Role.id == role_id).first()
    
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol.es_sistema:
        raise HTTPException(status_code=403, detail="No se pueden editar roles del sistema")
    
    # Actualizar datos básicos
    rol.nombre = role_data.nombre
    rol.descripcion = role_data.descripcion
    
    # Eliminar permisos actuales y agregar nuevos (más simple que diff)
    db.query(models.RolePermission).filter(
        models.RolePermission.role_id == role_id
    ).delete()
    
    for permiso_id in role_data.permisos_ids:
        rp = models.RolePermission(role_id=rol.id, permission_id=permiso_id)
        db.add(rp)
    
    db.commit()
    db.refresh(rol)
    return rol

@app.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("configuracion.roles"))
):
    """Eliminar un rol custom"""
    rol = db.query(models.Role).filter(models.Role.id == role_id).first()
    
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol.es_sistema:
        raise HTTPException(status_code=403, detail="No se pueden eliminar roles del sistema")
    
    # Verificar si hay usuarios con este rol
    usuarios_con_rol = db.query(models.User).filter(
        models.User.rol_custom_id == role_id
    ).count()
    
    if usuarios_con_rol > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar: {usuarios_con_rol} usuarios tienen este rol"
        )
    
    db.delete(rol)
    db.commit()
    return {"message": "Rol eliminado"}