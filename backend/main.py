# ============================================
# MILANO - Backend Main (JWT ROBUSTO v1.4.0)
# ============================================

from permissions import (
    require_permission, 
    has_permission, 
    inicializar_permisos_sistema, 
    inicializar_roles_sistema,
    user_can,
    get_permisos_usuario
)
from fastapi import FastAPI, Depends, HTTPException, status, Query, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
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
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    get_password_hash,
    verify_password,
    check_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
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
    version="1.4.0",
    description="API con JWT robusto (access + refresh tokens) y permisos granulares",
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
# EXCEPTION HANDLER - CORS en errores
# ============================================

@app.exception_handler(HTTPException)
async def cors_aware_exception_handler(request, exc: HTTPException):
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in origins else "https://milanobus.netlify.app"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in origins else "https://milanobus.netlify.app"
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Credentials": "true",
        }
    )

# ============================================
# PYDANTIC SCHEMAS ADICIONALES PARA AUTH
# ============================================

from pydantic import BaseModel, Field

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int # segundos

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None # Si no se envía, revoca todos

# ============================================
# HELPERS
# ============================================

def documentacion_completa(v: models.Vehiculo) -> bool:
    """Verifica si la documentación obligatoria está completa"""
    return bool(
        v.tarjeta_transportes_numero and v.tarjeta_transportes_fecha_renovacion and
        v.itv_fecha_proxima and v.seguro_compania and v.seguro_poliza and v.seguro_fecha_vencimiento and
        v.tacografo_fecha_calibracion and v.extintores_fecha_vencimiento
    )

def auto_generar_tareas_documentacion(db: Session, vehiculo: models.Vehiculo):
    """Genera tareas automáticas desde fechas de documentación"""
    docs = [
        ("itv", vehiculo.itv_fecha_proxima, "ITV programada"),
        ("tarjeta_transportes", vehiculo.tarjeta_transportes_fecha_renovacion, "Renovación tarjeta transportes"),
        ("seguro", vehiculo.seguro_fecha_vencimiento, "Renovación seguro"),
        ("calibracion", vehiculo.tacografo_fecha_calibracion, "Calibración tacógrafo"),
        ("extintores", vehiculo.extintores_fecha_vencimiento, "Revisión extintores"),
    ]
    
    for tipo_str, fecha, concepto in docs:
        if not fecha:
            continue
            
        # Verificar si ya existe una tarea pendiente de este tipo para esta fecha
        existing = db.query(models.VehiculoTarea).filter(
            models.VehiculoTarea.vehiculo_id == vehiculo.id,
            models.VehiculoTarea.tipo == tipo_str,
            models.VehiculoTarea.estado.in_(["pendiente", "en_proceso"]),
            models.VehiculoTarea.fecha == datetime.combine(fecha, datetime.min.time())
        ).first()
        
        if existing:
            continue
            
        tarea = models.VehiculoTarea(
            vehiculo_id=vehiculo.id,
            tipo=getattr(models.TipoTareaVehiculo, tipo_str.upper(), models.TipoTareaVehiculo.OTRO),
            estado=models.EstadoTareaVehiculo.PENDIENTE,
            fecha=datetime.combine(fecha, datetime.min.time()),
            concepto=concepto,
            auto_generada=True
        )
        db.add(tarea)
        logger.info(f"📝 Tarea auto-generada: {concepto} para vehículo {vehiculo.matricula}")

def verificar_servicios_reservados(db: Session, vehiculo_id: int):
    """Verifica si hay servicios futuros asignados a este vehículo"""
    ahora = datetime.utcnow()
    servicios = db.query(models.Servicio).filter(
        models.Servicio.vehiculos_asignados.contains([vehiculo_id]),
        models.Servicio.fecha_inicio >= ahora,
        models.Servicio.estado.in_(["planificando", "asignado", "en_curso"])
    ).all()
    return servicios

def crear_notificacion_flota(
    db: Session,
    tipo: models.TipoNotificacion,
    titulo: str,
    mensaje: str,
    vehiculo_id: Optional[int] = None,
    servicio_id: Optional[int] = None,
    permiso_requerido: str = "vehiculos.ver",
    rol_destino: Optional[str] = None,
    user_id: Optional[int] = None,
    fecha_referencia: Optional[datetime] = None,
    dias_antelacion: Optional[int] = None,
    creado_por: Optional[int] = None,
):
    """Crear notificacion dirigida a rol, permiso o usuario especifico."""
    notif = models.Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        vehiculo_id=vehiculo_id,
        servicio_id=servicio_id,
        user_id=user_id,
        rol_destino=rol_destino,
        permiso_requerido=permiso_requerido,
        fecha_referencia=fecha_referencia,
        dias_antelacion=dias_antelacion,
        creado_por=creado_por,
    )
    db.add(notif)
    db.commit()
    return notif


def crear_notificacion_individual(
    db: Session,
    tipo: models.TipoNotificacion,
    titulo: str,
    mensaje: str,
    user_id: int,
    servicio_id: Optional[int] = None,
    vehiculo_id: Optional[int] = None,
    creado_por: Optional[int] = None,
):
    """Notificacion dirigida a un usuario especifico (ej: conductor asignado)."""
    notif = models.Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        user_id=user_id,
        servicio_id=servicio_id,
        vehiculo_id=vehiculo_id,
        creado_por=creado_por,
    )
    db.add(notif)
    db.commit()
    return notif


def crear_notificacion_broadcast(
    db: Session,
    tipo: models.TipoNotificacion,
    titulo: str,
    mensaje: str,
    rol_destino: Optional[str] = None,
    permiso_requerido: Optional[str] = None,
    servicio_id: Optional[int] = None,
    creado_por: Optional[int] = None,
):
    """Notificacion broadcast (manual) para un rol o permiso especifico."""
    notif = models.Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        rol_destino=rol_destino,
        permiso_requerido=permiso_requerido,
        servicio_id=servicio_id,
        creado_por=creado_por,
    )
    db.add(notif)
    db.commit()
    return notif


def generar_notificaciones_documentacion_vehiculo(db: Session, vehiculo: models.Vehiculo):
    """Generar notificaciones de documentacion proxima a vencer para un vehiculo."""
    ahora = datetime.utcnow()
    alertas = [
        (vehiculo.tarjeta_transportes_fecha_renovacion, 'Tarjeta de transportes', 30),
        (vehiculo.itv_fecha_proxima, 'ITV', 20),
        (vehiculo.seguro_fecha_vencimiento, 'Seguro', 20),
        (vehiculo.tacografo_fecha_calibracion, 'Tacografo', 10),
        (vehiculo.extintores_fecha_vencimiento, 'Extintores', 10),
    ]
    for fecha, nombre, dias_alerta in alertas:
        if not fecha:
            continue
        try:
            fecha_date = fecha.date() if hasattr(fecha, 'date') else fecha
            dias_restantes = (fecha_date - ahora.date()).days
            if dias_restantes <= dias_alerta:
                if dias_restantes < 0:
                    titulo = f"{nombre} vencido - {vehiculo.matricula}"
                    mensaje = f"El documento '{nombre}' del vehiculo {vehiculo.matricula} vencio hace {abs(dias_restantes)} dias."
                else:
                    titulo = f"{nombre} proximo a vencer - {vehiculo.matricula}"
                    mensaje = f"El documento '{nombre}' del vehiculo {vehiculo.matricula} vence en {dias_restantes} dias."
                crear_notificacion_flota(
                    db=db,
                    tipo=models.TipoNotificacion.DOCUMENTACION,
                    titulo=titulo,
                    mensaje=mensaje,
                    vehiculo_id=vehiculo.id,
                    permiso_requerido="vehiculos.ver",
                    fecha_referencia=fecha if hasattr(fecha, 'hour') else datetime.combine(fecha, datetime.min.time()),
                    dias_antelacion=dias_restantes,
                )
        except Exception:
            continue

# ============================================
# STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    if not check_db_connection():
        logger.error("❌ No se pudo conectar a la base de datos")
        return
    
    db = SessionLocal()
    try:
        inicializar_permisos_sistema(db)
        inicializar_roles_sistema(db)
        
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

@app.post("/token", response_model=TokenResponse)
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
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(user.id, db, device_info="Web")
    
    logger.info(f"🔐 Login exitoso: {user.username}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(user.id, db, device_info="Web")
    
    logger.info(f"🔐 Login JSON exitoso: {user.username}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshRequest, db: Session = Depends(get_db)):
    user = verify_refresh_token(request.refresh_token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado"
        )
    
    new_access_token = create_access_token(data={"sub": user.username})
    new_refresh_token = create_refresh_token(user.id, db, device_info="Web")
    revoke_refresh_token(request.refresh_token, db)
    
    logger.info(f"🔄 Tokens renovados para usuario: {user.username}")
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/auth/logout")
def logout(
    request: LogoutRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.refresh_token:
        success = revoke_refresh_token(request.refresh_token, db)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token no encontrado o ya revocado"
            )
        logger.info(f"👋 Logout dispositivo específico: {current_user.username}")
        return {"message": "Sesión cerrada correctamente"}
    else:
        count = revoke_all_user_tokens(current_user.id, db)
        logger.info(f"👋 Logout global: {current_user.username} ({count} sesiones cerradas)")
        return {"message": f"Cerradas {count} sesiones activas"}

@app.post("/auth/logout-all")
def logout_all(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = revoke_all_user_tokens(current_user.id, db)
    logger.info(f"👋 Logout forzado global: {current_user.username} ({count} sesiones)")
    return {"message": f"Se cerraron {count} sesiones activas en todos los dispositivos"}

@app.get("/auth/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/auth/permissions")
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    permisos = get_permisos_usuario(current_user, db)
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "rol": current_user.rol.value if current_user.rol else None,
        "rol_custom": current_user.rol_custom_obj.nombre if current_user.rol_custom_obj else None,
        "permisos": permisos
    }

# ============================================
# USER ENDPOINTS
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

@app.get("/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("usuarios.ver"))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/users", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_permission("usuarios.crear"))
):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    is_strong, error_msg = check_password_strength(user.password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=error_msg)
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        nombre_completo=user.nombre_completo,
        rol=user.rol,
        activo=True,
        conductor_id=getattr(user, 'conductor_id', None)
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
    
    if db_user.id == current_user.id:
        allowed_fields = ['nombre_completo', 'email', 'password']
        update_data = user_update.model_dump(exclude_unset=True)
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        filtered_data = user_update.model_dump(exclude_unset=True)
    
    if 'password' in filtered_data and filtered_data['password']:
        is_strong, error_msg = check_password_strength(filtered_data['password'])
        if not is_strong:
            raise HTTPException(status_code=400, detail=error_msg)
        filtered_data['hashed_password'] = get_password_hash(filtered_data.pop('password'))
    
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
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    
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
    current_user: models.User = Depends(require_permission("clientes.crear"))
):
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
    current_user: models.User = Depends(require_permission("conductores.crear"))
):
    logger.info(f"📥 Creando conductor: {conductor.codigo} - {conductor.nombre} {conductor.apellidos}")
    
    if conductor.codigo:
        existing = db.query(models.Conductor).filter(models.Conductor.codigo == conductor.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    existing = db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first()
    if existing:
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
# FACTURA ENDPOINTS
# ============================================

@app.get("/facturas", response_model=List[schemas.Factura])
def get_facturas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("facturacion.ver"))
):
    facturas = db.query(models.Factura).order_by(models.Factura.fecha_emision.desc()).offset(skip).limit(limit).all()
    return facturas

@app.get("/facturas/{factura_id}", response_model=schemas.Factura)
def get_factura(
    factura_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("facturacion.ver"))
):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    return factura

@app.post("/facturas", response_model=schemas.Factura)
def create_factura(
    factura: schemas.FacturaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("facturacion.crear"))
):
    db_factura = models.Factura(**factura.model_dump())
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.put("/facturas/{factura_id}", response_model=schemas.Factura)
def update_factura(
    factura_id: int,
    factura: schemas.FacturaUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("facturacion.editar"))
):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    update_data = factura.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_factura, key, value)
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.delete("/facturas/{factura_id}")
def delete_factura(
    factura_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("facturacion.eliminar"))
):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    db.delete(db_factura)
    db.commit()
    return {"message": "Factura deleted successfully"}

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
    current_user: models.User = Depends(require_permission("vehiculos.crear"))
):
    logger.info(f"📥 Creando vehículo: {vehiculo.codigo} - {vehiculo.matricula}")
    
    if vehiculo.codigo:
        existing = db.query(models.Vehiculo).filter(models.Vehiculo.codigo == vehiculo.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
    existing = db.query(models.Vehiculo).filter(models.Vehiculo.matricula == vehiculo.matricula).first()
    if existing:
        raise HTTPException(status_code=400, detail="Matricula already exists")
    
    # Forzar estado baja si falta documentación
    if not documentacion_completa_from_data(vehiculo):
        vehiculo.estado = "baja"
        logger.info(f"⚠️ Vehículo {vehiculo.matricula} creado en BAJA: falta documentación")
    
    try:
        db_vehiculo = models.Vehiculo(**vehiculo.model_dump())
        db.add(db_vehiculo)
        db.commit()
        db.refresh(db_vehiculo)
        
        # Auto-generar tareas desde documentación
        auto_generar_tareas_documentacion(db, db_vehiculo)
        db.commit()
        
        logger.info(f"✅ Vehículo creado: ID {db_vehiculo.id}")
        return db_vehiculo
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creando vehículo: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating vehiculo: {str(e)}")

def documentacion_completa_from_data(v: schemas.VehiculoCreate) -> bool:
    """Versión para schemas (datos aún no en modelo)"""
    return bool(
        v.tarjeta_transportes_numero and v.tarjeta_transportes_fecha_renovacion and
        v.itv_fecha_proxima and v.seguro_compania and v.seguro_poliza and v.seguro_fecha_vencimiento and
        v.tacografo_fecha_calibracion and v.extintores_fecha_vencimiento
    )

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
    
    # Si se actualiza documentación, recalcular estado automáticamente
    doc_fields = [
        'tarjeta_transportes_numero', 'tarjeta_transportes_fecha_renovacion',
        'itv_fecha_proxima', 'seguro_compania', 'seguro_poliza', 'seguro_fecha_vencimiento',
        'tacografo_fecha_calibracion', 'extintores_fecha_vencimiento'
    ]
    doc_updated = any(f in update_data for f in doc_fields)
    
    # Si intentan poner operativo, verificar documentación
    if update_data.get('estado') == 'operativo' and not documentacion_completa(db_vehiculo):
        # Pero si en esta misma petición están completando docs...
        # Aplicar primero los cambios para poder verificar
        for key, value in update_data.items():
            if value is not None:
                setattr(db_vehiculo, key, value)
        
        if not documentacion_completa(db_vehiculo):
            raise HTTPException(status_code=400, detail="Documentación incompleta. No se puede poner operativo.")
    else:
        for key, value in update_data.items():
            if value is not None:
                setattr(db_vehiculo, key, value)
    
    # Auto-ajustar estado si se actualizó documentación y no se especificó estado manualmente
    if doc_updated and 'estado' not in update_data:
        if documentacion_completa(db_vehiculo) and db_vehiculo.estado.value == 'baja':
            db_vehiculo.estado = models.EstadoVehiculo.OPERATIVO
            logger.info(f"✅ Vehículo {db_vehiculo.matricula} auto-puesto operativo: documentación completa")
        elif not documentacion_completa(db_vehiculo) and db_vehiculo.estado.value == 'operativo':
            db_vehiculo.estado = models.EstadoVehiculo.BAJA
            logger.warning(f"⚠️ Vehículo {db_vehiculo.matricula} auto-puesto en BAJA: falta documentación")
    
    db_vehiculo.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_vehiculo)
    
    # Re-generar tareas y notificaciones si cambiaron fechas de documentación
    if doc_updated:
        auto_generar_tareas_documentacion(db, db_vehiculo)
        generar_notificaciones_documentacion_vehiculo(db, db_vehiculo)
        db.commit()
    
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
# REVISION MANUAL DE DOCUMENTACION
# ============================================

@app.post("/cron/revisar-documentacion")
def revisar_documentacion(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.ver"))
):
    """Revisar documentacion de todos los vehiculos y generar notificaciones. Puede llamarse manualmente o desde cron."""
    vehiculos = db.query(models.Vehiculo).all()
    notificaciones_generadas = 0
    for v in vehiculos:
        count_before = db.query(models.Notificacion).filter(
            models.Notificacion.vehiculo_id == v.id,
            models.Notificacion.tipo == models.TipoNotificacion.DOCUMENTACION
        ).count()
        generar_notificaciones_documentacion_vehiculo(db, v)
        count_after = db.query(models.Notificacion).filter(
            models.Notificacion.vehiculo_id == v.id,
            models.Notificacion.tipo == models.TipoNotificacion.DOCUMENTACION
        ).count()
        notificaciones_generadas += (count_after - count_before)
    db.commit()
    return {
        "message": f"Revision completada. {notificaciones_generadas} notificaciones generadas.",
        "vehiculos_revisados": len(vehiculos),
        "notificaciones_generadas": notificaciones_generadas
    }

# ============================================
# VEHICULO ESTADO ENDPOINT (CORREGIDO - body JSON)
# ============================================

@app.put("/vehiculos/{vehiculo_id}/estado")
def update_vehiculo_estado(
    vehiculo_id: int,
    data: schemas.VehiculoEstadoUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    
    estado = data.estado
    
    # Validaciones según estado
    if estado == "operativo":
        if not documentacion_completa(vehiculo):
            raise HTTPException(status_code=400, detail="Documentación incompleta. No se puede poner operativo.")
        vehiculo.estado = models.EstadoVehiculo.OPERATIVO
        vehiculo.taller_fecha_inicio = None
        vehiculo.taller_fecha_fin = None
        vehiculo.taller_motivo = None
        vehiculo.baja_fecha = None
        vehiculo.baja_motivo = None
        
    elif estado == "taller":
        vehiculo.estado = models.EstadoVehiculo.TALLER
        vehiculo.taller_fecha_inicio = data.taller_fecha_inicio or datetime.utcnow()
        vehiculo.taller_fecha_fin = data.taller_fecha_fin
        vehiculo.taller_motivo = data.motivo
        vehiculo.baja_fecha = None
        vehiculo.baja_motivo = None
        
        # Verificar servicios reservados
        servicios = verificar_servicios_reservados(db, vehiculo_id)
        if servicios:
            # Crear alerta/notificación
            fechas = ", ".join([s.fecha_inicio.strftime("%d/%m/%Y") for s in servicios[:3]])
            crear_notificacion_flota(
                db, models.TipoNotificacion.TALLER,
                f"⚠️ Vehículo {vehiculo.matricula} en taller con servicios reservados",
                f"Tiene servicios planificados para: {fechas}. Buscar vehículo operativo de reemplazo.",
                vehiculo_id=vehiculo.id,
                fecha_referencia=servicios[0].fecha_inicio if servicios else None
            )
            db.commit()
            
            return {
                "message": f"Estado actualizado a taller. ⚠️ ATENCIÓN: Tiene {len(servicios)} servicio(s) reservado(s).",
                "servicios_afectados": [{"id": s.id, "fecha": s.fecha_inicio.isoformat(), "titulo": s.titulo} for s in servicios],
                "estado": estado
            }
        
    elif estado == "baja":
        vehiculo.estado = models.EstadoVehiculo.BAJA
        vehiculo.baja_fecha = datetime.utcnow()
        vehiculo.baja_motivo = data.motivo or data.baja_motivo
        vehiculo.taller_fecha_inicio = None
        vehiculo.taller_fecha_fin = None
        vehiculo.taller_motivo = None
        
        # Verificar servicios reservados
        servicios = verificar_servicios_reservados(db, vehiculo_id)
        if servicios:
            fechas = ", ".join([s.fecha_inicio.strftime("%d/%m/%Y") for s in servicios[:3]])
            crear_notificacion_flota(
                db, models.TipoNotificacion.SERVICIO,
                f"🚫 Vehículo {vehiculo.matricula} dado de baja con servicios pendientes",
                f"Servicios afectados: {fechas}",
                vehiculo_id=vehiculo.id
            )
    else:
        raise HTTPException(status_code=400, detail=f"Estado no válido: {estado}")
    
    db.commit()
    return {"message": f"Estado actualizado a {estado}", "estado": estado}

# ============================================
# VEHICULO HISTORIAL ENDPOINTS
# ============================================

@app.get("/vehiculos/{vehiculo_id}/historial")
def get_vehiculo_historial(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.historial"))
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    mantenimientos = db.query(models.Mantenimiento).filter(
        models.Mantenimiento.vehiculo_id == vehiculo_id
    ).order_by(models.Mantenimiento.fecha.desc()).all()
    
    averias = db.query(models.Averia).filter(
        models.Averia.vehiculo_id == vehiculo_id
    ).order_by(models.Averia.fecha_inicio.desc()).all()
    
    anotaciones = db.query(models.AnotacionVehiculo).filter(
        models.AnotacionVehiculo.vehiculo_id == vehiculo_id
    ).order_by(models.AnotacionVehiculo.fecha.desc()).all()
    
    tareas = db.query(models.VehiculoTarea).filter(
        models.VehiculoTarea.vehiculo_id == vehiculo_id
    ).order_by(models.VehiculoTarea.fecha.asc()).all()
    
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
        ],
        "tareas": [
            {
                "id": t.id,
                "tipo": t.tipo.value if t.tipo else str(t.tipo),
                "estado": t.estado.value if t.estado else str(t.estado),
                "fecha": t.fecha.isoformat() if t.fecha else None,
                "fecha_completada": t.fecha_completada.isoformat() if t.fecha_completada else None,
                "concepto": t.concepto,
                "gasto": float(t.gasto) if t.gasto else None,
                "anotaciones": t.anotaciones,
                "factura_url": t.factura_url,
                "documento_url": t.documento_url,
                "auto_generada": t.auto_generada,
                "creado_por": t.creado_por,
            } for t in tareas
        ]
    }

@app.get("/vehiculos/{vehiculo_id}/mantenimientos")
def get_mantenimientos(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db_mantenimiento = models.Mantenimiento(
        vehiculo_id=vehiculo_id,
        **mantenimiento.model_dump()
    )
    db.add(db_mantenimiento)
    
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
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
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
    db_averia = db.query(models.Averia).filter(
        models.Averia.id == averia_id,
        models.Averia.vehiculo_id == vehiculo_id
    ).first()
    
    if not db_averia:
        raise HTTPException(status_code=404, detail="Avería no encontrada")
    
    update_data = averia_update.model_dump(exclude_unset=True)
    
    if update_data.get('estado') == models.EstadoAveria.RESUELTA and not db_averia.fecha_fin:
        update_data['fecha_fin'] = datetime.utcnow()
    
    averias_abiertas = db.query(models.Averia).filter(
        models.Averia.vehiculo_id == vehiculo_id,
        models.Averia.estado.in_([
            models.EstadoAveria.REPORTADA,
            models.EstadoAveria.EN_DIAGNOSTICO,
            models.EstadoAveria.EN_REPARACION
        ])
    ).count()
    
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
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
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
    from datetime import timedelta
    
    alertas = []
    hoy = date.today()
    fecha_limite = hoy + timedelta(days=30)
    
    # ITV próxima a vencer
    vehiculos_itv = db.query(models.Vehiculo).filter(
        models.Vehiculo.itv_fecha_proxima <= fecha_limite,
        models.Vehiculo.estado != models.EstadoVehiculo.BAJA
    ).all()
    
    for v in vehiculos_itv:
        dias_restantes = (v.itv_fecha_proxima - hoy).days if v.itv_fecha_proxima else -999
        alertas.append({
            "tipo": "itv",
            "gravedad": "alta" if dias_restantes <= 7 else "media",
            "vehiculo_id": v.id,
            "vehiculo_matricula": v.matricula,
            "mensaje": f"ITV vence en {dias_restantes} días" if dias_restantes >= 0 else f"ITV vencida hace {abs(dias_restantes)} días",
            "fecha_limite": v.itv_fecha_proxima.isoformat() if v.itv_fecha_proxima else None
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
    
    gravedad_orden = {"critica": 0, "grave": 1, "alta": 2, "media": 3, "leve": 4}
    alertas.sort(key=lambda x: gravedad_orden.get(x["gravedad"], 5))
    
    return alertas

# ============================================
# VEHICULO TAREAS ENDPOINTS
# ============================================

@app.get("/vehiculos/{vehiculo_id}/tareas", response_model=List[schemas.VehiculoTarea])
def get_vehiculo_tareas(
    vehiculo_id: int,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.ver"))
):
    query = db.query(models.VehiculoTarea).filter(models.VehiculoTarea.vehiculo_id == vehiculo_id)
    if tipo:
        query = query.filter(models.VehiculoTarea.tipo == tipo)
    if estado:
        query = query.filter(models.VehiculoTarea.estado == estado)
    return query.order_by(models.VehiculoTarea.fecha.asc()).all()

@app.post("/vehiculos/{vehiculo_id}/tareas", response_model=schemas.VehiculoTarea)
def create_vehiculo_tarea(
    vehiculo_id: int,
    tarea: schemas.VehiculoTareaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.crear"))
):
    db_tarea = models.VehiculoTarea(
        vehiculo_id=vehiculo_id,
        tipo=tarea.tipo,
        estado=tarea.estado or "pendiente",
        fecha=tarea.fecha,
        concepto=tarea.concepto,
        gasto=tarea.gasto,
        anotaciones=tarea.anotaciones,
        factura_url=tarea.factura_url,
        factura_file=tarea.factura_file,
        documento_url=tarea.documento_url,
        documento_file=tarea.documento_file,
        auto_generada=tarea.auto_generada or False,
        creado_por=current_user.id
    )
    db.add(db_tarea)
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

@app.put("/vehiculo-tareas/{tarea_id}", response_model=schemas.VehiculoTarea)
def update_vehiculo_tarea(
    tarea_id: int,
    tarea: schemas.VehiculoTareaUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.editar"))
):
    db_tarea = db.query(models.VehiculoTarea).filter(models.VehiculoTarea.id == tarea_id).first()
    if not db_tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    update_data = tarea.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_tarea, field, value)
    
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

@app.delete("/vehiculo-tareas/{tarea_id}")
def delete_vehiculo_tarea(
    tarea_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("vehiculos.eliminar"))
):
    db_tarea = db.query(models.VehiculoTarea).filter(models.VehiculoTarea.id == tarea_id).first()
    if not db_tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    db.delete(db_tarea)
    db.commit()
    return {"message": "Tarea eliminada"}

# ============================================
# NOTIFICACIONES ENDPOINTS (NUEVO)
# ============================================

def _notificaciones_visibles_para_usuario(query, current_user: models.User):
    """Filtrar notificaciones visibles para el usuario.
    Una notificacion es visible si:
      1. Es individual para este usuario (user_id)
      2. Es para su rol (rol_destino)
      3. Es global (sin destinatario especifico)
      4. Admin ve tambien las que tienen permiso_requerido
    """
    user_rol = current_user.rol.value if hasattr(current_user.rol, 'value') else str(current_user.rol)
    es_admin = user_rol == 'admin'
    
    # Base: notificaciones individuales, por rol, o globales
    base_filter = (
        (models.Notificacion.user_id == current_user.id) |
        (models.Notificacion.rol_destino == user_rol) |
        (
            (models.Notificacion.user_id == None) &
            (models.Notificacion.rol_destino == None) &
            (models.Notificacion.permiso_requerido == None)
        )
    )
    
    # Admin tambien ve notificaciones con permiso_requerido
    if es_admin:
        base_filter = base_filter | (models.Notificacion.permiso_requerido != None)
    
    return query.filter(base_filter)

@app.get("/notificaciones", response_model=List[schemas.Notificacion])
def get_notificaciones(
    solo_no_leidas: bool = False,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtener notificaciones visibles para el usuario actual segun su rol."""
    query = db.query(models.Notificacion)
    query = _notificaciones_visibles_para_usuario(query, current_user)
    
    if solo_no_leidas:
        query = query.filter(models.Notificacion.leida == False)
    if tipo:
        query = query.filter(models.Notificacion.tipo == tipo)
    
    return query.order_by(models.Notificacion.fecha_creacion.desc()).limit(50).all()

@app.get("/notificaciones/resumen", response_model=schemas.NotificacionResumen)
def get_notificaciones_resumen(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Resumen de notificaciones pendientes visibles para el usuario."""
    query = db.query(models.Notificacion)
    query = _notificaciones_visibles_para_usuario(query, current_user)
    
    total = query.count()
    no_leidas = query.filter(models.Notificacion.leida == False).count()
    
    alertas_criticas = query.filter(
        models.Notificacion.leida == False,
        models.Notificacion.tipo.in_(["taller", "averia"])
    ).count()
    
    alertas_aviso = query.filter(
        models.Notificacion.leida == False,
        models.Notificacion.tipo == "documentacion"
    ).count()
    
    return {
        "total": total,
        "no_leidas": no_leidas,
        "alertas_criticas": alertas_criticas,
        "alertas_aviso": alertas_aviso
    }

@app.post("/notificaciones", response_model=schemas.Notificacion)
def create_notificacion(
    notif: schemas.NotificacionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crear notificacion manual (broadcast a rol o permiso, o individual)."""
    db_notif = models.Notificacion(
        tipo=models.TipoNotificacion(notif.tipo),
        titulo=notif.titulo,
        mensaje=notif.mensaje,
        vehiculo_id=notif.vehiculo_id,
        servicio_id=notif.servicio_id,
        user_id=notif.user_id,
        rol_destino=notif.rol_destino,
        permiso_requerido=notif.permiso_requerido,
        fecha_referencia=notif.fecha_referencia,
        dias_antelacion=notif.dias_antelacion,
        creado_por=current_user.id,
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif

@app.patch("/notificaciones/{notificacion_id}/leida")
def marcar_notificacion_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notif = db.query(models.Notificacion).filter(models.Notificacion.id == notificacion_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    notif.leida = True
    notif.fecha_leida = datetime.utcnow()
    db.commit()
    
    return {"message": "Notificación marcada como leída"}

# ============================================
# USER TASKS ENDPOINTS (con etiquetas, asignados, dependencias, chatter)
# ============================================

def _crear_relaciones_tarea(db: Session, db_task: models.UserTask, task: schemas.UserTaskCreate):
    """Crear etiquetas, asignados y dependencias de una tarea."""
    # Etiquetas
    if task.etiquetas:
        for tag in task.etiquetas:
            color = "#ef4444" if tag.lower() in ["urgente", "critico", "bloqueo"] else "#6b7280"
            db.add(models.UserTaskTag(tarea_id=db_task.id, etiqueta=tag, color=color))
    # Asignados
    if task.asignados:
        for idx, uid in enumerate(task.asignados):
            db.add(models.UserTaskAssignee(tarea_id=db_task.id, user_id=uid, es_responsable=(idx == 0)))
    # Dependencias
    if task.dependencias:
        for dep_id in task.dependencias:
            db.add(models.UserTaskDependency(tarea_id=db_task.id, depende_de_id=dep_id))
    db.commit()

@app.post("/user-tasks", response_model=schemas.UserTask)
def create_user_task(
    task: schemas.UserTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_task = models.UserTask(
        titulo=task.titulo,
        descripcion=task.descripcion,
        estado=models.EstadoUserTask(task.estado) if task.estado else models.EstadoUserTask.PENDIENTE,
        prioridad=models.PrioridadUserTask(task.prioridad) if task.prioridad else models.PrioridadUserTask.MEDIA,
        fecha_limite=task.fecha_limite,
        categoria=task.categoria,
        referencia_id=task.referencia_id,
        referencia_tipo=task.referencia_tipo,
        parent_id=task.parent_id,
        user_id=current_user.id,
        creado_por=current_user.id,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    _crear_relaciones_tarea(db, db_task, task)
    # Chatter de creacion
    db.add(models.UserTaskChatter(tarea_id=db_task.id, user_id=current_user.id, tipo="actividad", contenido=f"Tarea creada por {current_user.username}"))
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/user-tasks", response_model=List[schemas.UserTask])
def get_user_tasks(
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    categoria: Optional[str] = None,
    asignado_a_mi: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.UserTask)
    if asignado_a_mi:
        # Tareas donde el usuario es asignado o es el creador
        query = query.join(models.UserTaskAssignee, models.UserTask.id == models.UserTaskAssignee.tarea_id, isouter=True).filter(
            (models.UserTaskAssignee.user_id == current_user.id) | (models.UserTask.user_id == current_user.id)
        ).distinct()
    else:
        query = query.filter(models.UserTask.user_id == current_user.id)
    if estado:
        query = query.filter(models.UserTask.estado == estado)
    if prioridad:
        query = query.filter(models.UserTask.prioridad == prioridad)
    if categoria:
        query = query.filter(models.UserTask.categoria == categoria)
    return query.options(
        joinedload(models.UserTask.etiquetas_rel),
        joinedload(models.UserTask.asignados_rel),
        joinedload(models.UserTask.dependencias_rel),
    ).order_by(models.UserTask.fecha_limite.asc().nullslast(), models.UserTask.fecha_creacion.desc()).all()

@app.get("/user-tasks/resumen", response_model=schemas.UserTaskResumen)
def get_user_tasks_resumen(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Incluir tareas asignadas al usuario
    query = db.query(models.UserTask).join(
        models.UserTaskAssignee, models.UserTask.id == models.UserTaskAssignee.tarea_id, isouter=True
    ).filter(
        (models.UserTaskAssignee.user_id == current_user.id) | (models.UserTask.user_id == current_user.id)
    ).distinct()
    total = query.count()
    pendientes = query.filter(models.UserTask.estado == models.EstadoUserTask.PENDIENTE).count()
    en_progreso = query.filter(models.UserTask.estado == models.EstadoUserTask.EN_PROGRESO).count()
    completadas = query.filter(models.UserTask.estado == models.EstadoUserTask.COMPLETADA).count()
    urgentes = query.filter(
        models.UserTask.prioridad == models.PrioridadUserTask.URGENTE,
        models.UserTask.estado != models.EstadoUserTask.COMPLETADA
    ).count()
    ahora = datetime.utcnow()
    vencidas = query.filter(
        models.UserTask.fecha_limite < ahora,
        models.UserTask.estado.notin_([models.EstadoUserTask.COMPLETADA, models.EstadoUserTask.CANCELADA])
    ).count()
    return {
        "total": total,
        "pendientes": pendientes,
        "en_progreso": en_progreso,
        "completadas": completadas,
        "urgentes": urgentes,
        "vencidas": vencidas
    }

@app.get("/user-tasks/{task_id}", response_model=schemas.UserTask)
def get_user_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.UserTask).filter(
        models.UserTask.id == task_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    # Verificar que el usuario puede verla
    es_asignado = db.query(models.UserTaskAssignee).filter(
        models.UserTaskAssignee.tarea_id == task_id,
        models.UserTaskAssignee.user_id == current_user.id
    ).first()
    if task.user_id != current_user.id and not es_asignado:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta tarea")
    return db.query(models.UserTask).options(
        joinedload(models.UserTask.etiquetas_rel),
        joinedload(models.UserTask.asignados_rel),
        joinedload(models.UserTask.seguidores_rel),
        joinedload(models.UserTask.dependencias_rel),
        joinedload(models.UserTask.chatter_rel),
    ).filter(models.UserTask.id == task_id).first()

@app.patch("/user-tasks/{task_id}", response_model=schemas.UserTask)
def update_user_task(
    task_id: int,
    task_update: schemas.UserTaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.UserTask).filter(models.UserTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    update_data = task_update.model_dump(exclude_unset=True)
    estado_anterior = task.estado.value if hasattr(task.estado, 'value') else str(task.estado)
    
    for field, value in update_data.items():
        if field in ["etiquetas", "asignados"]:
            continue
        if field == "estado" and value:
            setattr(task, field, models.EstadoUserTask(value))
        elif field == "prioridad" and value:
            setattr(task, field, models.PrioridadUserTask(value))
        else:
            setattr(task, field, value)
    
    # Auto-completar fecha
    if update_data.get("estado") == "completada" and not task.fecha_completada:
        task.fecha_completada = datetime.utcnow()
        db.add(models.UserTaskChatter(tarea_id=task.id, user_id=current_user.id, tipo="cambio_estado", contenido=f"Tarea completada por {current_user.username}"))
    
    # Actualizar etiquetas
    if "etiquetas" in update_data and update_data["etiquetas"] is not None:
        db.query(models.UserTaskTag).filter(models.UserTaskTag.tarea_id == task_id).delete()
        for tag in update_data["etiquetas"]:
            color = "#ef4444" if tag.lower() in ["urgente", "critico", "bloqueo"] else "#6b7280"
            db.add(models.UserTaskTag(tarea_id=task_id, etiqueta=tag, color=color))
    
    # Actualizar asignados
    if "asignados" in update_data and update_data["asignados"] is not None:
        db.query(models.UserTaskAssignee).filter(models.UserTaskAssignee.tarea_id == task_id).delete()
        for idx, uid in enumerate(update_data["asignados"]):
            db.add(models.UserTaskAssignee(tarea_id=task_id, user_id=uid, es_responsable=(idx == 0)))
    
    # Chatter de cambio de estado
    if "estado" in update_data and update_data["estado"] != estado_anterior:
        db.add(models.UserTaskChatter(tarea_id=task.id, user_id=current_user.id, tipo="cambio_estado", contenido=f"Estado cambiado de '{estado_anterior}' a '{update_data['estado']}'"))
    
    db.commit()
    db.refresh(task)
    return task

@app.delete("/user-tasks/{task_id}")
def delete_user_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.UserTask).filter(models.UserTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if task.user_id != current_user.id and task.creado_por != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta tarea")
    db.delete(task)
    db.commit()
    return {"message": "Tarea eliminada"}

# ============================================
# USER TASK CHATTER ENDPOINTS
# ============================================

@app.post("/user-tasks/{task_id}/chatter", response_model=schemas.UserTaskChatter)
def create_chatter(
    task_id: int,
    contenido: str = Body(..., embed=True),
    tipo: str = Body("mensaje", embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.UserTask).filter(models.UserTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    chatter = models.UserTaskChatter(tarea_id=task_id, user_id=current_user.id, tipo=tipo, contenido=contenido)
    db.add(chatter)
    db.commit()
    db.refresh(chatter)
    return chatter

@app.get("/user-tasks/{task_id}/chatter", response_model=List[schemas.UserTaskChatter])
def get_chatter(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.UserTaskChatter).filter(models.UserTaskChatter.tarea_id == task_id).order_by(models.UserTaskChatter.fecha_creacion.desc()).all()

# ============================================
# USER TASK FOLLOWERS
# ============================================

@app.post("/user-tasks/{task_id}/seguir")
def seguir_tarea(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.UserTaskFollower).filter(
        models.UserTaskFollower.tarea_id == task_id,
        models.UserTaskFollower.user_id == current_user.id
    ).first()
    if existing:
        return {"message": "Ya sigues esta tarea"}
    db.add(models.UserTaskFollower(tarea_id=task_id, user_id=current_user.id))
    db.commit()
    return {"message": "Ahora sigues esta tarea"}

@app.delete("/user-tasks/{task_id}/seguir")
def dejar_seguir_tarea(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.UserTaskFollower).filter(
        models.UserTaskFollower.tarea_id == task_id,
        models.UserTaskFollower.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "Dejaste de seguir esta tarea"}

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
    if servicio.codigo:
        existing = db.query(models.Servicio).filter(models.Servicio.codigo == servicio.codigo).first()
        if existing:
            raise HTTPException(status_code=400, detail="Codigo already exists")
    
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
    servicios_activos = db.query(models.Servicio).filter(
        models.Servicio.estado.in_(['en_curso', 'asignado'])
    ).count()
    
    hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    servicios_hoy = db.query(models.Servicio).filter(
        models.Servicio.fecha_inicio >= hoy_inicio,
        models.Servicio.fecha_inicio <= hoy_fin
    ).count()
    
    mes_inicio = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    servicios_mes = db.query(models.Servicio).filter(
        models.Servicio.fecha_creacion >= mes_inicio
    ).count()
    
    conductores_disponibles = db.query(models.Conductor).filter(
        models.Conductor.estado == models.EstadoConductor.ACTIVO
    ).count()
    
    conductores_ocupados = db.query(models.Conductor).filter(
        models.Conductor.estado == models.EstadoConductor.EN_RUTA
    ).count()
    
    vehiculos_operativos = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == models.EstadoVehiculo.OPERATIVO
    ).count()
    
    vehiculos_taller = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == models.EstadoVehiculo.TALLER
    ).count()
    
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
# ROLES Y PERMISOS ENDPOINTS
# ============================================

@app.get("/permissions", response_model=List[schemas.Permission])
def get_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    permisos = db.query(models.Permission).filter(
        models.Permission.activo == True
    ).order_by(models.Permission.categoria, models.Permission.nombre).all()
    return permisos

@app.get("/roles", response_model=List[schemas.Role])
def get_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
    existing = db.query(models.Role).filter(
        models.Role.codigo == role_data.codigo,
        models.Role.empresa_id == current_user.empresa_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Código de rol ya existe")
    
    rol = models.Role(
        codigo=role_data.codigo,
        nombre=role_data.nombre,
        descripcion=role_data.descripcion,
        es_sistema=False,
        empresa_id=current_user.empresa_id,
        activo=True
    )
    db.add(rol)
    db.flush()
    
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
    rol = db.query(models.Role).filter(models.Role.id == role_id).first()
    
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol.es_sistema:
        raise HTTPException(status_code=403, detail="No se pueden editar roles del sistema")
    
    rol.nombre = role_data.nombre
    rol.descripcion = role_data.descripcion
    
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
    rol = db.query(models.Role).filter(models.Role.id == role_id).first()
    
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    if rol.es_sistema:
        raise HTTPException(status_code=403, detail="No se pueden eliminar roles del sistema")
    
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

# ============================================
# MENSAJES (Chat por servicio)
# ============================================

@app.get("/servicios/{servicio_id}/mensajes", response_model=List[schemas.Mensaje])
def get_mensajes(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    mensajes = db.query(models.Mensaje).filter(
        models.Mensaje.servicio_id == servicio_id
    ).order_by(models.Mensaje.created_at.asc()).all()
    return mensajes

@app.post("/servicios/{servicio_id}/mensajes", response_model=schemas.Mensaje)
def create_mensaje(
    servicio_id: int,
    mensaje: schemas.MensajeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    db_mensaje = models.Mensaje(
        servicio_id=servicio_id,
        autor_id=current_user.id,
        autor_nombre=current_user.nombre_completo or current_user.username,
        autor_tipo=mensaje.autor_tipo,
        texto=mensaje.texto
    )
    db.add(db_mensaje)
    db.commit()
    db.refresh(db_mensaje)
    return db_mensaje

@app.patch("/mensajes/{mensaje_id}/leido")
def marcar_mensaje_leido(
    mensaje_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    db_mensaje = db.query(models.Mensaje).filter(models.Mensaje.id == mensaje_id).first()
    if not db_mensaje:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    db_mensaje.leido = True
    db.commit()
    return {"message": "Mensaje marcado como leido"}

# ============================================
# RUTAS (Hojas de ruta)
# ============================================

@app.get("/rutas", response_model=List[schemas.Ruta])
def get_rutas(
    servicio_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    query = db.query(models.Ruta)
    if servicio_id:
        query = query.filter(models.Ruta.servicio_id == servicio_id)
    if estado:
        query = query.filter(models.Ruta.estado == estado)
    return query.order_by(models.Ruta.fecha_creacion.desc()).all()

@app.get("/rutas/{ruta_id}", response_model=schemas.Ruta)
def get_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    db_ruta = db.query(models.Ruta).filter(models.Ruta.id == ruta_id).first()
    if not db_ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return db_ruta

@app.get("/servicios/{servicio_id}/ruta", response_model=Optional[schemas.Ruta])
def get_ruta_by_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    db_ruta = db.query(models.Ruta).filter(models.Ruta.servicio_id == servicio_id).first()
    return db_ruta

@app.post("/rutas", response_model=schemas.Ruta)
def create_ruta(
    ruta: schemas.RutaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.editar"))
):
    codigo = f"RT-{datetime.utcnow().strftime('%Y%m%d')}-{str(ruta.servicio_id).zfill(4)}"
    db_ruta = models.Ruta(
        servicio_id=ruta.servicio_id,
        codigo=codigo,
        titulo=ruta.titulo,
        descripcion=ruta.descripcion,
        estado=ruta.estado or "planificada",
        origen=ruta.origen,
        destino=ruta.destino,
        origen_lat=ruta.origen_lat,
        origen_lng=ruta.origen_lng,
        destino_lat=ruta.destino_lat,
        destino_lng=ruta.destino_lng,
        paradas=[p.model_dump() for p in ruta.paradas] if ruta.paradas else [],
        distancia_km=ruta.distancia_km,
        duracion_minutos=ruta.duracion_minutos,
        google_maps_url=ruta.google_maps_url,
        polyline=ruta.polyline,
        requiere_pernocta=ruta.requiere_pernocta or False,
        conductores_necesarios=ruta.conductores_necesarios or 1,
        observaciones_normativa=ruta.observaciones_normativa,
        tracking_activo=False
    )
    db.add(db_ruta)
    db.commit()
    db.refresh(db_ruta)
    return db_ruta

@app.put("/rutas/{ruta_id}", response_model=schemas.Ruta)
def update_ruta(
    ruta_id: int,
    ruta: schemas.RutaUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.editar"))
):
    db_ruta = db.query(models.Ruta).filter(models.Ruta.id == ruta_id).first()
    if not db_ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    if ruta.estado is not None:
        db_ruta.estado = ruta.estado
    if ruta.tracking_activo is not None:
        db_ruta.tracking_activo = ruta.tracking_activo
    if ruta.ultima_posicion_lat is not None:
        db_ruta.ultima_posicion_lat = ruta.ultima_posicion_lat
    if ruta.ultima_posicion_lng is not None:
        db_ruta.ultima_posicion_lng = ruta.ultima_posicion_lng
        db_ruta.ultima_posicion_fecha = datetime.utcnow()
    db.commit()
    db.refresh(db_ruta)
    return db_ruta

@app.delete("/rutas/{ruta_id}")
def delete_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.eliminar"))
):
    db_ruta = db.query(models.Ruta).filter(models.Ruta.id == ruta_id).first()
    if not db_ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(db_ruta)
    db.commit()
    return {"message": "Ruta eliminada"}

# ============================================
# HEALTH CHECK Y ROOT
# ============================================

@app.get("/health")
def health_check():
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.utcnow(),
        "version": "1.4.0"
    }

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "1.4.0",
        "features": ["JWT robusto (access + refresh tokens)", "Permisos granulares", "Roles custom", "Notificaciones", "Auto-tareas documentación"],
        "docs": "/docs",
        "health": "/health"
    }