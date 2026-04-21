# ============================================
# MILANO - Backend Main (JWT ROBUSTO v1.3.0)
# ============================================

from permissions import (
    require_permission, 
    has_permission, 
    inicializar_permisos_sistema, 
    inicializar_roles_sistema,
    user_can,
    get_permisos_usuario
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
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
    version="1.3.0",
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
# Asegura que TODAS las respuestas incluyan headers CORS
# ============================================

@app.exception_handler(HTTPException)
async def cors_aware_exception_handler(request, exc: HTTPException):
    """Añade headers CORS a las respuestas de error para que el navegador pueda leerlas"""
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
    """Manejo generico de excepciones con CORS headers"""
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
    expires_in: int  # segundos

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None  # Si no se envía, revoca todos

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
# AUTH ENDPOINTS (JWT ROBUSTO - NUEVOS)
# ============================================

@app.post("/token", response_model=TokenResponse)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Login con OAuth2. Devuelve access token (15 min) + refresh token (7 días).
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear access token (corto: 15 min)
    access_token = create_access_token(data={"sub": user.username})
    
    # Crear refresh token (largo: 7 días, guardado en BD)
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
    """
    Login alternativo con JSON. Devuelve access token + refresh token.
    """
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
    """
    Renueva el access token usando un refresh token válido.
    Implementa rotación de tokens: el refresh anterior se revoca y se genera uno nuevo.
    """
    user = verify_refresh_token(request.refresh_token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado"
        )
    
    # Crear nuevos tokens
    new_access_token = create_access_token(data={"sub": user.username})
    new_refresh_token = create_refresh_token(user.id, db, device_info="Web")
    
    # Revocar el refresh token anterior (rotación de tokens)
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
    """
    Logout: revoca el refresh token específico (logout de un dispositivo).
    Si no se envía refresh_token, revoca TODOS los tokens del usuario (logout global).
    """
    if request.refresh_token:
        # Logout de un dispositivo específico
        success = revoke_refresh_token(request.refresh_token, db)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token no encontrado o ya revocado"
            )
        logger.info(f"👋 Logout dispositivo específico: {current_user.username}")
        return {"message": "Sesión cerrada correctamente"}
    else:
        # Logout global (todos los dispositivos)
        count = revoke_all_user_tokens(current_user.id, db)
        logger.info(f"👋 Logout global: {current_user.username} ({count} sesiones cerradas)")
        return {"message": f"Cerradas {count} sesiones activas"}

@app.post("/auth/logout-all")
def logout_all(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fuerza el cierre de todas las sesiones del usuario en todos los dispositivos.
    Útil si sospecha que su cuenta fue comprometida.
    """
    count = revoke_all_user_tokens(current_user.id, db)
    logger.info(f"👋 Logout forzado global: {current_user.username} ({count} sesiones)")
    return {"message": f"Se cerraron {count} sesiones activas en todos los dispositivos"}

@app.get("/auth/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """
    Obtiene los datos del usuario autenticado.
    """
    return current_user

@app.get("/auth/permissions")
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtener lista de permisos del usuario actual (para frontend)"""
    permisos = get_permisos_usuario(current_user, db)
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "rol": current_user.rol.value if current_user.rol else None,
        "rol_custom": current_user.rol_custom_obj.nombre if current_user.rol_custom_obj else None,
        "permisos": permisos
    }

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
        rol=user.rol,
        activo=True,
        conductor_id=user.conductor_id
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
    
    # No permitir editar a uno mismo ciertos campos críticos (evitar bloqueos)
    if db_user.id == current_user.id:
        allowed_fields = ['nombre_completo', 'email', 'password']
        update_data = user_update.model_dump(exclude_unset=True)
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        filtered_data = user_update.model_dump(exclude_unset=True)
    
    # Si se actualiza password, hashearla
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
# ROLES Y PERMISOS ENDPOINTS (CONFIGURACIÓN)
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

# ============================================
# MENSAJES (Chat por servicio)
# ============================================

@app.get("/servicios/{servicio_id}/mensajes", response_model=List[schemas.Mensaje])
def get_mensajes(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.ver"))
):
    """Obtener todos los mensajes de un servicio"""
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
    """Crear un mensaje en el chat del servicio"""
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
    """Marcar un mensaje como leido"""
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
    """Listar rutas, opcionalmente filtradas por servicio o estado"""
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
    """Obtener una ruta por ID"""
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
    """Obtener la ruta de un servicio"""
    db_ruta = db.query(models.Ruta).filter(models.Ruta.servicio_id == servicio_id).first()
    return db_ruta

@app.post("/rutas", response_model=schemas.Ruta)
def create_ruta(
    ruta: schemas.RutaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("servicios.editar"))
):
    """Crear una nueva ruta"""
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
    """Actualizar una ruta"""
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
    """Eliminar una ruta"""
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
        "version": "1.3.0"
    }

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "1.3.0",
        "features": ["JWT robusto (access + refresh tokens)", "Permisos granulares", "Roles custom"],
        "docs": "/docs",
        "health": "/health"
    }