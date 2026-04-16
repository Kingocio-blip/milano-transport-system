from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List
import os

import models
import schemas
from database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MILANO Transport Management API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ============== AUTH UTILITIES ==============

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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# ============== AUTH ENDPOINTS ==============

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Update last access
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Update last access
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

# ============== USER ENDPOINTS ==============

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users", response_model=List[schemas.User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if username exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
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

# ============== CLIENTE ENDPOINTS ==============

@app.get("/clientes", response_model=List[schemas.Cliente])
def get_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    clientes = db.query(models.Cliente).offset(skip).limit(limit).all()
    return clientes

@app.get("/clientes/{cliente_id}", response_model=schemas.Cliente)
def get_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cliente

@app.post("/clientes", response_model=schemas.Cliente)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if codigo exists
    existing = db.query(models.Cliente).filter(models.Cliente.codigo == cliente.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Convert Pydantic model to dict and handle nested contacto if present
    cliente_data = cliente.dict()
    
    # Handle nested contacto object (from frontend) - convert to flat fields
    if "contacto" in cliente_data and cliente_data["contacto"]:
        contacto = cliente_data.pop("contacto")
        cliente_data["persona_contacto_nombre"] = contacto.get("nombre")
        cliente_data["persona_contacto_email"] = contacto.get("email")
        cliente_data["persona_contacto_telefono"] = contacto.get("telefono")
        cliente_data["persona_contacto_cargo"] = contacto.get("cargo")
    
    # Create cliente with all fields
    db_cliente = models.Cliente(**cliente_data)
    
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.Cliente)
def update_cliente(cliente_id: int, cliente: schemas.ClienteUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    # Convert Pydantic model to dict
    cliente_data = cliente.dict(exclude_unset=True)
    
    # Handle nested contacto object (from frontend) - convert to flat fields
    if "contacto" in cliente_data and cliente_data["contacto"]:
        contacto = cliente_data.pop("contacto")
        if contacto.get("nombre") is not None:
            cliente_data["persona_contacto_nombre"] = contacto.get("nombre")
        if contacto.get("email") is not None:
            cliente_data["persona_contacto_email"] = contacto.get("email")
        if contacto.get("telefono") is not None:
            cliente_data["persona_contacto_telefono"] = contacto.get("telefono")
        if contacto.get("cargo") is not None:
            cliente_data["persona_contacto_cargo"] = contacto.get("cargo")
    
    # Update fields
    for key, value in cliente_data.items():
        setattr(db_cliente, key, value)
    
    db_cliente.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente deleted successfully"}

# ============== CONDUCTOR ENDPOINTS ==============

@app.get("/conductores", response_model=List[schemas.Conductor])
def get_conductores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    conductores = db.query(models.Conductor).offset(skip).limit(limit).all()
    return conductores

@app.get("/conductores/{conductor_id}", response_model=schemas.Conductor)
def get_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    return conductor

@app.post("/conductores", response_model=schemas.Conductor)
def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if codigo exists
    existing = db.query(models.Conductor).filter(models.Conductor.codigo == conductor.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Check if DNI exists
    existing = db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first()
    if existing:
        raise HTTPException(status_code=400, detail="DNI already exists")
    
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.put("/conductores/{conductor_id}", response_model=schemas.Conductor)
def update_conductor(conductor_id: int, conductor: schemas.ConductorUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    update_data = conductor.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_conductor, key, value)
    
    db_conductor.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor deleted successfully"}

# ============== VEHICULO ENDPOINTS ==============

@app.get("/vehiculos", response_model=List[schemas.Vehiculo])
def get_vehiculos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vehiculos = db.query(models.Vehiculo).offset(skip).limit(limit).all()
    return vehiculos

@app.get("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def get_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    return vehiculo

@app.post("/vehiculos", response_model=schemas.Vehiculo)
def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if codigo exists
    existing = db.query(models.Vehiculo).filter(models.Vehiculo.codigo == vehiculo.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Check if matricula exists
    existing = db.query(models.Vehiculo).filter(models.Vehiculo.matricula == vehiculo.matricula).first()
    if existing:
        raise HTTPException(status_code=400, detail="Matricula already exists")
    
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def update_vehiculo(vehiculo_id: int, vehiculo: schemas.VehiculoUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    update_data = vehiculo.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehiculo, key, value)
    
    db_vehiculo.fecha_actualizacion = datetime.utcnow()
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehiculo deleted successfully"}

# ============== SERVICIO ENDPOINTS ==============

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
    # Check if codigo exists
    existing = db.query(models.Servicio).filter(models.Servicio.codigo == servicio.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codigo already exists")
    
    # Get cliente name if cliente_id is provided
    cliente_nombre = None
    if servicio.cliente_id:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == servicio.cliente_id).first()
        if cliente:
            cliente_nombre = cliente.nombre
    
    # Convert to dict and add cliente_nombre
    servicio_data = servicio.dict()
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
    
    update_data = servicio.dict(exclude_unset=True)
    
    # Update cliente_nombre if cliente_id changed
    if "cliente_id" in update_data and update_data["cliente_id"]:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == update_data["cliente_id"]).first()
        if cliente:
            update_data["cliente_nombre"] = cliente.nombre
    
    for key, value in update_data.items():
        setattr(db_servicio, key, value)
    
    db_servicio.fecha_modificacion = datetime.utcnow()
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(
    servicio_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    db.delete(db_servicio)
    db.commit()
    return {"message": "Servicio deleted successfully"}

# ============== DASHBOARD ENDPOINTS ==============

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Servicios
    servicios_activos = db.query(models.Servicio).filter(
        models.Servicio.estado.in_(['en_curso', 'asignado'])
    ).count()
    
    servicios_hoy = db.query(models.Servicio).filter(
        models.Servicio.fecha_inicio >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
        models.Servicio.fecha_inicio < datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
    ).count()
    
    servicios_mes = db.query(models.Servicio).filter(
        models.Servicio.fecha_creacion >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
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
        models.Vehiculo.estado == models.EstadoVehiculo.ACTIVO
    ).count()
    
    vehiculos_taller = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == models.EstadoVehiculo.EN_MANTENIMIENTO
    ).count()
    
    # Facturación
    facturacion_mes = db.query(models.Servicio).filter(
        models.Servicio.estado == 'facturado',
        models.Servicio.fecha_creacion >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
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
        "facturacionMes": total_facturado,
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

# ============== HEALTH CHECK ==============

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# ============================================
# ENDPOINT TEMPORAL - Crear usuario admin
# ============================================
import bcrypt

@app.post("/setup/create-admin")
def setup_create_admin(db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == "admin").first()
    if existing:
        return {"message": "Usuario admin ya existe"}
    
    # Usar bcrypt directamente
    password = "admin123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
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
    return {
        "message": "✅ Usuario admin creado",
        "credentials": {"username": "admin", "password": "admin123"}
    }
# ============================================