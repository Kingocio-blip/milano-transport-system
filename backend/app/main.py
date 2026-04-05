from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List
import os
import models
import schemas
from database import SessionLocal, engine, get_db

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milano Transport System API")

# Configuración CORS
origins = [
    "http://localhost:3000",
    "https://milano-transport.netlify.app",
    "https://*.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración JWT
SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-muy-segura-123456789")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Helper functions
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

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.rol != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Solo administradores pueden realizar esta acción")
    return current_user

# Auth endpoints
@app.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "rol": user.rol.value}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "rol": user.rol,
        "conductor_id": user.conductor_id
    }

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, 
        hashed_password=hashed_password,
        rol=user.rol,
        conductor_id=user.conductor_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Conductor endpoints
@app.get("/conductores/", response_model=List[schemas.Conductor])
def get_conductores(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Conductor).all()

@app.post("/conductores/", response_model=schemas.Conductor)
def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.get("/conductores/{conductor_id}", response_model=schemas.Conductor)
def get_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if conductor is None:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return conductor

@app.put("/conductores/{conductor_id}", response_model=schemas.Conductor)
def update_conductor(conductor_id: int, conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if db_conductor is None:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    for key, value in conductor.dict().items():
        setattr(db_conductor, key, value)
    
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if db_conductor is None:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor eliminado correctamente"}

# Cliente endpoints
@app.get("/clientes/", response_model=List[schemas.Cliente])
def get_clientes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Cliente).all()

@app.post("/clientes/", response_model=schemas.Cliente)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.get("/clientes/{cliente_id}", response_model=schemas.Cliente)
def get_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.Cliente)
def update_cliente(cliente_id: int, cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if db_cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in cliente.dict().items():
        setattr(db_cliente, key, value)
    
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if db_cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente eliminado correctamente"}

# Servicio endpoints
@app.get("/servicios/", response_model=List[schemas.Servicio])
def get_servicios(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    servicios = db.query(models.Servicio).options(
        joinedload(models.Servicio.cliente),
        joinedload(models.Servicio.conductor)
    ).all()
    return servicios

@app.get("/servicios/mis-servicios", response_model=List[schemas.Servicio])
def get_mis_servicios(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Endpoint para conductores - devuelve solo los servicios asignados al conductor logueado"""
    if current_user.rol != models.UserRole.conductor or not current_user.conductor_id:
        raise HTTPException(status_code=403, detail="Usuario no es conductor o no tiene conductor asignado")
    
    servicios = db.query(models.Servicio).options(
        joinedload(models.Servicio.cliente),
        joinedload(models.Servicio.conductor)
    ).filter(models.Servicio.conductor_id == current_user.conductor_id).all()
    
    return servicios

@app.post("/servicios/", response_model=schemas.Servicio)
def create_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_servicio = models.Servicio(**servicio.dict())
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    
    # Cargar relaciones para la respuesta
    db_servicio = db.query(models.Servicio).options(
        joinedload(models.Servicio.cliente),
        joinedload(models.Servicio.conductor)
    ).filter(models.Servicio.id == db_servicio.id).first()
    
    return db_servicio

@app.get("/servicios/{servicio_id}", response_model=schemas.Servicio)
def get_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    servicio = db.query(models.Servicio).options(
        joinedload(models.Servicio.cliente),
        joinedload(models.Servicio.conductor)
    ).filter(models.Servicio.id == servicio_id).first()
    
    if servicio is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.Servicio)
def update_servicio(servicio_id: int, servicio: schemas.ServicioUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if db_servicio is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Conductores solo pueden cambiar el estado
    if current_user.rol == models.UserRole.conductor:
        if servicio.estado is not None:
            db_servicio.estado = servicio.estado
        db.commit()
        db.refresh(db_servicio)
    else:
        # Admin puede cambiar todo
        update_data = servicio.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_servicio, key, value)
        db.commit()
        db.refresh(db_servicio)
    
    # Recargar con relaciones
    db_servicio = db.query(models.Servicio).options(
        joinedload(models.Servicio.cliente),
        joinedload(models.Servicio.conductor)
    ).filter(models.Servicio.id == servicio_id).first()
    
    return db_servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if db_servicio is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    db.delete(db_servicio)
    db.commit()
    return {"message": "Servicio eliminado correctamente"}

# Vehiculo endpoints
@app.get("/vehiculos/", response_model=List[schemas.Vehiculo])
def get_vehiculos(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Vehiculo).all()

@app.post("/vehiculos/", response_model=schemas.Vehiculo)
def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.get("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def get_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    return vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.Vehiculo)
def update_vehiculo(vehiculo_id: int, vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if db_vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    
    for key, value in vehiculo.dict().items():
        setattr(db_vehiculo, key, value)
    
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if db_vehiculo is None:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehiculo eliminado correctamente"}

# Health check
@app.get("/")
def read_root():
    return {"message": "Milano Transport System API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Endpoint especial para crear primer usuario admin (solo funciona si no hay usuarios)
@app.post("/setup")
def setup_admin(db: Session = Depends(get_db)):
    # Verificar si ya existe algún usuario
    existing_users = db.query(models.User).first()
    if existing_users:
        raise HTTPException(status_code=400, detail="Setup ya completado")
    
    # Crear usuario admin por defecto
    hashed_password = get_password_hash("admin")
    db_user = models.User(
        username="admin",
        hashed_password=hashed_password,
        rol=models.UserRole.admin,
        conductor_id=None
    )
    db.add(db_user)
    db.commit()
    
    return {"message": "Usuario admin creado", "username": "admin", "password": "admin"}