from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
import models
import schemas
import auth
from database import SessionLocal, engine
import secrets
import string

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milano Transport API")

# Configuración CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://milano-transport.netlify.app",
    "https://milanobus.netlify.app",
    "https://*.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth dependencies
def get_current_user(token: str = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except auth.JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== INIT ADMIN USER ====================

def create_initial_admin():
    """Crea o actualiza usuario admin"""
    db = SessionLocal()
    try:
        # Buscar usuario admin existente
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        
        if admin_user:
            # Actualizar contraseña del admin existente
            admin_user.hashed_password = auth.get_password_hash("admin123")
            admin_user.is_active = True
            db.commit()
            print("=" * 50)
            print("✓ CONTRASEÑA ADMIN ACTUALIZADA")
            print("=" * 50)
        else:
            # Crear usuario admin nuevo
            admin_user = models.User(
                username="admin",
                email="admin@milano.com",
                hashed_password=auth.get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("=" * 50)
            print("✓ USUARIO ADMIN CREADO")
            print("=" * 50)
        
        print("Usuario: admin")
        print("Contraseña: admin123")
        print("=" * 50)
        
        # Mostrar todos los usuarios para debug
        all_users = db.query(models.User).all()
        print(f"Total usuarios en BD: {len(all_users)}")
        for u in all_users:
            print(f"  - {u.username} ({u.role})")
            
    except Exception as e:
        print(f"Error con admin: {e}")
    finally:
        db.close()

# Crear admin al iniciar
create_initial_admin()

# ==================== AUTH ROUTES ====================

@app.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "conductor_id": user.conductor_id
        }
    }

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==================== CLIENTES ====================

@app.get("/clientes/", response_model=List[schemas.ClienteResponse])
def get_clientes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Cliente).all()

@app.post("/clientes/", response_model=schemas.ClienteResponse)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def update_cliente(cliente_id: int, cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    for key, value in cliente.dict().items():
        setattr(db_cliente, key, value)
    
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente deleted"}

# ==================== CONDUCTORES ====================

@app.get("/conductores/", response_model=List[schemas.ConductorResponse])
def get_conductores(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Conductor).all()

@app.post("/conductores/", response_model=dict)
def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    # Verificar si ya existe
    db_conductor = db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first()
    if db_conductor:
        raise HTTPException(status_code=400, detail="Ya existe un conductor con ese DNI")
    
    # Crear conductor
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    
    # Generar credenciales automáticamente
    username = f"conductor{db_conductor.id}"
    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    
    # Crear usuario asociado
    hashed_password = auth.get_password_hash(password)
    db_user = models.User(
        username=username,
        email=conductor.email or f"{username}@milano.temp",
        hashed_password=hashed_password,
        role="conductor",
        conductor_id=db_conductor.id,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    
    # Devolver todo incluyendo credentials
    return {
        "id": db_conductor.id,
        "nombre": db_conductor.nombre,
        "apellidos": db_conductor.apellidos,
        "dni": db_conductor.dni,
        "telefono": db_conductor.telefono,
        "email": db_conductor.email,
        "licencia_conducir": db_conductor.licencia_conducir,
        "fecha_vencimiento_licencia": db_conductor.fecha_vencimiento_licencia,
        "estado": db_conductor.estado,
        "credentials": {
            "username": username,
            "password": password
        }
    }

@app.put("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
def update_conductor(conductor_id: int, conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    for key, value in conductor.dict().items():
        setattr(db_conductor, key, value)
    
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")
    
    # Eliminar usuario asociado si existe
    db_user = db.query(models.User).filter(models.User.conductor_id == conductor_id).first()
    if db_user:
        db.delete(db_user)
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor deleted"}

# ==================== VEHICULOS ====================

@app.get("/vehiculos/", response_model=List[schemas.VehiculoResponse])
def get_vehiculos(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Vehiculo).all()

@app.post("/vehiculos/", response_model=schemas.VehiculoResponse)
def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
def update_vehiculo(vehiculo_id: int, vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    
    for key, value in vehiculo.dict().items():
        setattr(db_vehiculo, key, value)
    
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo not found")
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehiculo deleted"}

# ==================== SERVICIOS ====================

@app.get("/servicios/", response_model=List[schemas.ServicioResponse])
def get_servicios(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    conductor_id: Optional[int] = None
):
    query = db.query(models.Servicio)
    
    # Si es conductor, solo ver sus servicios asignados
    if current_user.role == "conductor" and current_user.conductor_id:
        query = query.filter(models.Servicio.conductor_id == current_user.conductor_id)
    elif conductor_id:
        query = query.filter(models.Servicio.conductor_id == conductor_id)
    
    return query.order_by(models.Servicio.fecha_inicio.desc()).all()

@app.post("/servicios/", response_model=schemas.ServicioResponse)
def create_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_servicio = models.Servicio(**servicio.dict())
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
def update_servicio(servicio_id: int, servicio: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    
    for key, value in servicio.dict().items():
        setattr(db_servicio, key, value)
    
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    db.delete(db_servicio)
    db.commit()
    return {"message": "Servicio deleted"}

# ==================== FACTURAS ====================

@app.get("/facturas/", response_model=List[schemas.FacturaResponse])
def get_facturas(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Factura).order_by(models.Factura.id.desc()).all()

@app.post("/facturas/", response_model=schemas.FacturaResponse)
def create_factura(factura: schemas.FacturaCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    # Calcular IVA y total si no vienen
    importe_base = factura.importe_base
    tipo_iva = factura.tipo_iva or 21
    importe_iva = importe_base * tipo_iva / 100
    importe_total = importe_base + importe_iva
    
    db_factura = models.Factura(
        **factura.dict(exclude={'importe_iva', 'importe_total'}),
        importe_iva=importe_iva,
        importe_total=importe_total
    )
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.put("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
def update_factura(factura_id: int, factura: schemas.FacturaCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    
    # Recalcular totales
    importe_base = factura.importe_base
    tipo_iva = factura.tipo_iva or 21
    importe_iva = importe_base * tipo_iva / 100
    importe_total = importe_base + importe_iva
    
    for key, value in factura.dict().items():
        setattr(db_factura, key, value)
    
    db_factura.importe_iva = importe_iva
    db_factura.importe_total = importe_total
    
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.delete("/facturas/{factura_id}")
def delete_factura(factura_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    db.delete(db_factura)
    db.commit()
    return {"message": "Factura deleted"}

# ==================== CONDUCTOR PANEL ====================

@app.get("/conductor/mis-servicios/", response_model=List[schemas.ServicioResponse])
def get_mis_servicios(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "conductor" or not current_user.conductor_id:
        raise HTTPException(status_code=403, detail="Solo conductores pueden acceder")
    
    servicios = db.query(models.Servicio).filter(
        models.Servicio.conductor_id == current_user.conductor_id
    ).order_by(models.Servicio.fecha_inicio.desc()).all()
    
    return servicios

@app.patch("/conductor/servicios/{servicio_id}/completar", response_model=schemas.ServicioResponse)
def completar_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "conductor" or not current_user.conductor_id:
        raise HTTPException(status_code=403, detail="Solo conductores pueden acceder")
    
    servicio = db.query(models.Servicio).filter(
        models.Servicio.id == servicio_id,
        models.Servicio.conductor_id == current_user.conductor_id
    ).first()
    
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    servicio.estado = "completado"
    db.commit()
    db.refresh(servicio)
    return servicio

# ==================== HEALTH CHECK ====================

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now()}

@app.get("/")
def root():
    return {
        "message": "Milano Transport API",
        "version": "2.0.0",
        "docs": "/docs"
    }