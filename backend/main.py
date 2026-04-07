from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
import models
import schemas
import auth
from database import SessionLocal, engine
import secrets
import string
import re

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Milano Transport API")

# Configuración CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://milano-transport.netlify.app",
    "https://milanobus.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth dependencies
oauth2_scheme = auth.oauth2_scheme

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

# ==================== FUNCIONES AUXILIARES ====================

def generar_codigo_cliente(db: Session):
    """Genera código automático CLI-001, CLI-002..."""
    ultimo = db.query(models.Cliente).order_by(models.Cliente.id.desc()).first()
    if ultimo:
        numero = ultimo.id + 1
    else:
        numero = 1
    return f"CLI-{numero:03d}"

def calcular_estadisticas_cliente(db: Session, cliente_id: int):
    """Calcula servicios e ingresos del último año"""
    fecha_inicio = datetime.now() - timedelta(days=365)
    
    servicios = db.query(models.Servicio).filter(
        models.Servicio.cliente_id == cliente_id,
        models.Servicio.fecha_creacion >= fecha_inicio
    ).all()
    
    total_servicios = len(servicios)
    total_facturado = sum(s.precio for s in servicios)
    
    return {
        "total_servicios": total_servicios,
        "total_facturado": total_facturado,
        "es_frecuente": total_servicios > 5,
        "es_vip": total_facturado > 5000
    }

# ==================== INIT ADMIN USER ====================

def create_initial_admin():
    """Crea o actualiza usuario admin"""
    db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        
        if admin_user:
            admin_user.hashed_password = auth.get_password_hash("admin123")
            admin_user.is_active = True
            if not hasattr(admin_user, 'role') or admin_user.role is None:
                admin_user.role = "admin"
            db.commit()
            print("=" * 50)
            print("✓ ADMIN ACTUALIZADO")
            print("=" * 50)
        else:
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
            print("✓ ADMIN CREADO")
            print("=" * 50)
        
        print("Usuario: admin")
        print("Contraseña: admin123")
        print("=" * 50)
        
        all_users = db.query(models.User).all()
        print(f"Total usuarios: {len(all_users)}")
        for u in all_users:
            role = getattr(u, 'role', 'SIN ROL')
            print(f"  - {u.username} ({role})")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

create_initial_admin()

# ==================== AUTH ROUTES ====================

@app.post("/auth/login")
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        user = auth.authenticate_user(db, credentials.username, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        
        if not hasattr(user, 'role') or user.role is None:
            user.role = "conductor"
        
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
    except Exception as e:
        print(f"Login error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==================== CLIENTES ====================

@app.get("/clientes/", response_model=List[schemas.ClienteResponse])
def get_clientes(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    buscar: Optional[str] = None,
    tipo: Optional[str] = None
):
    query = db.query(models.Cliente)
    
    if tipo:
        query = query.filter(models.Cliente.tipo == tipo)
    
    if buscar:
        buscar = f"%{buscar}%"
        query = query.filter(
            (models.Cliente.nombre.ilike(buscar)) |
            (models.Cliente.apellidos.ilike(buscar)) |
            (models.Cliente.dni.ilike(buscar)) |
            (models.Cliente.cif.ilike(buscar)) |
            (models.Cliente.email.ilike(buscar)) |
            (models.Cliente.telefono.ilike(buscar)) |
            (models.Cliente.codigo.ilike(buscar))
        )
    
    clientes = query.order_by(models.Cliente.nombre).all()
    
    resultado = []
    for cliente in clientes:
        stats = calcular_estadisticas_cliente(db, cliente.id)
        cliente_dict = {
            "id": cliente.id,
            "codigo": cliente.codigo,
            "nombre": cliente.nombre,
            "apellidos": cliente.apellidos,
            "dni": cliente.dni,
            "cif": cliente.cif,
            "tipo": cliente.tipo,
            "telefono": cliente.telefono,
            "email": cliente.email,
            "direccion": cliente.direccion,
            "ciudad": cliente.ciudad,
            "codigo_postal": cliente.codigo_postal,
            "persona_contacto": cliente.persona_contacto,
            "notas": cliente.notas,
            "fecha_registro": cliente.fecha_registro,
            "total_servicios": stats["total_servicios"],
            "total_facturado": stats["total_facturado"],
            "es_frecuente": stats["es_frecuente"],
            "es_vip": stats["es_vip"]
        }
        resultado.append(cliente_dict)
    
    return resultado

@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteDetalle)
def get_cliente_detalle(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    stats = calcular_estadisticas_cliente(db, cliente.id)
    
    servicios = db.query(models.Servicio).filter(
        models.Servicio.cliente_id == cliente_id
    ).order_by(models.Servicio.fecha_inicio.desc()).limit(10).all()
    
    servicios_list = []
    for s in servicios:
        servicios_list.append({
            "id": s.id,
            "fecha_inicio": s.fecha_inicio,
            "origen": s.origen,
            "destino": s.destino,
            "precio": s.precio,
            "estado": s.estado
        })
    
    return {
        "id": cliente.id,
        "codigo": cliente.codigo,
        "nombre": cliente.nombre,
        "apellidos": cliente.apellidos,
        "dni": cliente.dni,
        "cif": cliente.cif,
        "tipo": cliente.tipo,
        "telefono": cliente.telefono,
        "email": cliente.email,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "codigo_postal": cliente.codigo_postal,
        "persona_contacto": cliente.persona_contacto,
        "notas": cliente.notas,
        "fecha_registro": cliente.fecha_registro,
        "total_servicios": stats["total_servicios"],
        "total_facturado": stats["total_facturado"],
        "servicios_recientes": servicios_list,
        "es_frecuente": stats["es_frecuente"],
        "es_vip": stats["es_vip"]
    }

@app.post("/clientes/", response_model=schemas.ClienteResponse)
def create_cliente(
    cliente: schemas.ClienteCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_admin)
):
    # Validar DNI
    if cliente.dni:
        cliente.dni = cliente.dni.upper()
        if not re.match(r'^\d{8}[A-HJ-NP-TV-Z]$', cliente.dni):
            raise HTTPException(status_code=400, detail="DNI inválido. Formato: 12345678A")
        letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
        numero = int(cliente.dni[:-1])
        letra_correcta = letras[numero % 23]
        if cliente.dni[-1] != letra_correcta:
            raise HTTPException(status_code=400, detail=f"Letra de DNI incorrecta. Debería ser: {letra_correcta}")
        
        existente = db.query(models.Cliente).filter(models.Cliente.dni == cliente.dni).first()
        if existente:
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe un cliente con ese DNI: {existente.nombre} {existente.apellidos} (Código: {existente.codigo})"
            )
    
    # Validar CIF
    if cliente.cif:
        cliente.cif = cliente.cif.upper()
        if not re.match(r'^[A-HJ-NP-SW]\d{7}[0-9A-J]$', cliente.cif):
            raise HTTPException(status_code=400, detail="CIF inválido")
        
        existente = db.query(models.Cliente).filter(models.Cliente.cif == cliente.cif).first()
        if existente:
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe un cliente con ese CIF: {existente.nombre} {existente.apellidos} (Código: {existente.codigo})"
            )
    
    # Validar tipo vs documento
    if cliente.tipo == 'particular' and not cliente.dni:
        raise HTTPException(status_code=400, detail="Los particulares deben tener DNI")
    if cliente.tipo in ['autonomo', 'empresa'] and not cliente.cif:
        raise HTTPException(status_code=400, detail="Autónomos y empresas deben tener CIF")
    
    codigo = generar_codigo_cliente(db)
    
    db_cliente = models.Cliente(
        **cliente.dict(),
        codigo=codigo
    )
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    
    stats = calcular_estadisticas_cliente(db, db_cliente.id)
    return {
        "id": db_cliente.id,
        "codigo": db_cliente.codigo,
        "nombre": db_cliente.nombre,
        "apellidos": db_cliente.apellidos,
        "dni": db_cliente.dni,
        "cif": db_cliente.cif,
        "tipo": db_cliente.tipo,
        "telefono": db_cliente.telefono,
        "email": db_cliente.email,
        "direccion": db_cliente.direccion,
        "ciudad": db_cliente.ciudad,
        "codigo_postal": db_cliente.codigo_postal,
        "persona_contacto": db_cliente.persona_contacto,
        "notas": db_cliente.notas,
        "fecha_registro": db_cliente.fecha_registro,
        "total_servicios": stats["total_servicios"],
        "total_facturado": stats["total_facturado"],
        "es_frecuente": stats["es_frecuente"],
        "es_vip": stats["es_vip"]
    }

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def update_cliente(
    cliente_id: int, 
    cliente: schemas.ClienteCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_admin)
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Validar DNI si cambió
    if cliente.dni:
        cliente.dni = cliente.dni.upper()
        if not re.match(r'^\d{8}[A-HJ-NP-TV-Z]$', cliente.dni):
            raise HTTPException(status_code=400, detail="DNI inválido. Formato: 12345678A")
        letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
        numero = int(cliente.dni[:-1])
        letra_correcta = letras[numero % 23]
        if cliente.dni[-1] != letra_correcta:
            raise HTTPException(status_code=400, detail=f"Letra de DNI incorrecta. Debería ser: {letra_correcta}")
        
        if cliente.dni != db_cliente.dni:
            existente = db.query(models.Cliente).filter(
                models.Cliente.dni == cliente.dni,
                models.Cliente.id != cliente_id
            ).first()
            if existente:
                raise HTTPException(status_code=400, detail=f"Ya existe un cliente con ese DNI: {existente.nombre} {existente.apellidos}")
    
    # Validar CIF si cambió
    if cliente.cif:
        cliente.cif = cliente.cif.upper()
        if not re.match(r'^[A-HJ-NP-SW]\d{7}[0-9A-J]$', cliente.cif):
            raise HTTPException(status_code=400, detail="CIF inválido")
        
        if cliente.cif != db_cliente.cif:
            existente = db.query(models.Cliente).filter(
                models.Cliente.cif == cliente.cif,
                models.Cliente.id != cliente_id
            ).first()
            if existente:
                raise HTTPException(status_code=400, detail=f"Ya existe un cliente con ese CIF: {existente.nombre} {existente.apellidos}")
    
    # Validar tipo vs documento
    if cliente.tipo == 'particular' and not cliente.dni:
        raise HTTPException(status_code=400, detail="Los particulares deben tener DNI")
    if cliente.tipo in ['autonomo', 'empresa'] and not cliente.cif:
        raise HTTPException(status_code=400, detail="Autónomos y empresas deben tener CIF")
    
    for key, value in cliente.dict().items():
        setattr(db_cliente, key, value)
    
    db.commit()
    db.refresh(db_cliente)
    
    stats = calcular_estadisticas_cliente(db, db_cliente.id)
    return {
        "id": db_cliente.id,
        "codigo": db_cliente.codigo,
        "nombre": db_cliente.nombre,
        "apellidos": db_cliente.apellidos,
        "dni": db_cliente.dni,
        "cif": db_cliente.cif,
        "tipo": db_cliente.tipo,
        "telefono": db_cliente.telefono,
        "email": db_cliente.email,
        "direccion": db_cliente.direccion,
        "ciudad": db_cliente.ciudad,
        "codigo_postal": db_cliente.codigo_postal,
        "persona_contacto": db_cliente.persona_contacto,
        "notas": db_cliente.notas,
        "fecha_registro": db_cliente.fecha_registro,
        "total_servicios": stats["total_servicios"],
        "total_facturado": stats["total_facturado"],
        "es_frecuente": stats["es_frecuente"],
        "es_vip": stats["es_vip"]
    }

@app.delete("/clientes/{cliente_id}")
def delete_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_admin)
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    servicios = db.query(models.Servicio).filter(models.Servicio.cliente_id == cliente_id).count()
    if servicios > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar: el cliente tiene {servicios} servicios asociados"
        )
    
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente eliminado correctamente"}

# ==================== CONDUCTORES ====================

@app.get("/conductores/", response_model=List[schemas.ConductorResponse])
def get_conductores(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Conductor).all()

@app.post("/conductores/", response_model=dict)
def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first()
    if db_conductor:
        raise HTTPException(status_code=400, detail="Ya existe un conductor con ese DNI")
    
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    
    username = f"conductor{db_conductor.id}"
    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    
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