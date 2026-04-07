from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import os

import models
import schemas
from models import get_db, init_db, SessionLocal

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "milano-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

app = FastAPI(title="MILANO Transport API", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ==================== AUTH FUNCTIONS ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    username = payload.get("sub")
    user = db.query(models.Usuario).filter(models.Usuario.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

def require_admin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return current_user

# ==================== DEFAULT ADMIN ====================

def create_default_admin():
    """Crea usuario admin por defecto si no existe ninguno"""
    db = SessionLocal()
    try:
        existing = db.query(models.Usuario).first()
        if not existing:
            admin = models.Usuario(
                username="admin",
                password="admin123",
                nombre="Administrador",
                rol="admin",
                activo=True
            )
            db.add(admin)
            db.commit()
            print("=" * 50)
            print("✅ ADMIN CREADO AUTOMÁTICAMENTE")
            print("=" * 50)
            print("Usuario: admin")
            print("Contraseña: admin123")
            print("=" * 50)
        else:
            print("✅ Usuarios ya existen en la base de datos")
    except Exception as e:
        print(f"⚠️ Error creando admin: {e}")
    finally:
        db.close()

# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(
        models.Usuario.username == credentials.username
    ).first()
    
    if not user or user.password != credentials.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    token = create_access_token({"sub": user.username, "rol": user.rol})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
def get_me(current_user: models.Usuario = Depends(get_current_user)):
    return current_user

# ==================== USUARIOS ====================

@app.get("/usuarios/", response_model=List[schemas.UsuarioResponse])
def get_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    return db.query(models.Usuario).all()

@app.post("/usuarios/", response_model=schemas.UsuarioResponse)
def create_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    if db.query(models.Usuario).filter(models.Usuario.username == usuario.username).first():
        raise HTTPException(status_code=400, detail="Username ya existe")
    
    db_usuario = models.Usuario(**usuario.dict())
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

@app.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def update_usuario(
    usuario_id: int,
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    for key, value in usuario.dict().items():
        setattr(db_usuario, key, value)
    
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

@app.delete("/usuarios/{usuario_id}")
def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(db_usuario)
    db.commit()
    return {"message": "Usuario eliminado"}

# ==================== CONDUCTORES ====================

def generar_codigo_conductor(db: Session):
    """Genera código tipo CON-001, CON-002..."""
    ultimo = db.query(models.Conductor).order_by(models.Conductor.id.desc()).first()
    numero = ultimo.id + 1 if ultimo else 1
    return f"CON-{numero:03d}"

@app.get("/conductores/", response_model=List[schemas.ConductorResponse])
def get_conductores(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None,
    buscar: Optional[str] = None
):
    query = db.query(models.Conductor)
    
    if estado:
        query = query.filter(models.Conductor.estado == estado)
    
    if buscar:
        search = f"%{buscar}%"
        query = query.filter(
            (models.Conductor.nombre.ilike(search)) |
            (models.Conductor.apellidos.ilike(search)) |
            (models.Conductor.dni.ilike(search)) |
            (models.Conductor.telefono.ilike(search))
        )
    
    return query.order_by(models.Conductor.apellidos).all()

@app.get("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
def get_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return conductor

@app.post("/conductores/", response_model=schemas.ConductorResponse)
def create_conductor(
    conductor: schemas.ConductorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    if conductor.dni and db.query(models.Conductor).filter(models.Conductor.dni == conductor.dni).first():
        raise HTTPException(status_code=400, detail="DNI ya registrado")
    
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    
    db_conductor.codigo = generar_codigo_conductor(db)
    db.commit()
    db.refresh(db_conductor)
    
    return db_conductor

@app.put("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
def update_conductor(
    conductor_id: int,
    conductor: schemas.ConductorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    update_data = conductor.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_conductor, key, value)
    
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
def delete_conductor(
    conductor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    db.delete(db_conductor)
    db.commit()
    return {"message": "Conductor eliminado"}

# ==================== VEHICULOS ====================

@app.get("/vehiculos/", response_model=List[schemas.VehiculoResponse])
def get_vehiculos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None,
    buscar: Optional[str] = None
):
    query = db.query(models.Vehiculo)
    
    if estado:
        query = query.filter(models.Vehiculo.estado == estado)
    
    if buscar:
        search = f"%{buscar}%"
        query = query.filter(
            (models.Vehiculo.matricula.ilike(search)) |
            (models.Vehiculo.marca.ilike(search)) |
            (models.Vehiculo.modelo.ilike(search))
        )
    
    return query.order_by(models.Vehiculo.matricula).all()

@app.get("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
def get_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehiculo

@app.post("/vehiculos/", response_model=schemas.VehiculoResponse)
def create_vehiculo(
    vehiculo: schemas.VehiculoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    if db.query(models.Vehiculo).filter(models.Vehiculo.matricula == vehiculo.matricula).first():
        raise HTTPException(status_code=400, detail="Matrícula ya registrada")
    
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
def update_vehiculo(
    vehiculo_id: int,
    vehiculo: schemas.VehiculoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    update_data = vehiculo.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehiculo, key, value)
    
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
def delete_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db.delete(db_vehiculo)
    db.commit()
    return {"message": "Vehículo eliminado"}

# ==================== CLIENTES ====================

def generar_codigo_cliente(db: Session):
    """Genera código tipo CLI-001, CLI-002..."""
    ultimo = db.query(models.Cliente).order_by(models.Cliente.id.desc()).first()
    numero = ultimo.id + 1 if ultimo else 1
    return f"CLI-{numero:03d}"

def cliente_to_dict(cliente: models.Cliente) -> dict:
    """Convierte un cliente a diccionario con estructura de contacto anidada"""
    return {
        "id": cliente.id,
        "codigo": cliente.codigo,
        "nombre": cliente.nombre,
        "tipo": cliente.tipo,
        "nif": cliente.nif,
        "condiciones_especiales": cliente.condiciones_especiales,
        "forma_pago": cliente.forma_pago,
        "dias_pago": cliente.dias_pago,
        "estado": cliente.estado,
        "notas": cliente.notas,
        "fecha_alta": cliente.fecha_alta,
        "contacto": {
            "email": cliente.contacto_email,
            "telefono": cliente.contacto_telefono,
            "direccion": cliente.contacto_direccion,
            "ciudad": cliente.contacto_ciudad,
            "codigoPostal": cliente.contacto_codigo_postal
        }
    }

@app.get("/clientes/", response_model=List[dict])
def get_clientes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    buscar: Optional[str] = None,
    tipo: Optional[str] = None
):
    query = db.query(models.Cliente)
    
    if tipo:
        query = query.filter(models.Cliente.tipo == tipo)
    
    if buscar:
        search = f"%{buscar}%"
        query = query.filter(
            (models.Cliente.nombre.ilike(search)) |
            (models.Cliente.codigo.ilike(search)) |
            (models.Cliente.nif.ilike(search)) |
            (models.Cliente.contacto_email.ilike(search)) |
            (models.Cliente.contacto_telefono.ilike(search))
        )
    
    clientes = query.order_by(models.Cliente.nombre).all()
    resultado = []
    for cliente in clientes:
        servicios = db.query(models.Servicio).filter(models.Servicio.cliente_id == cliente.id).all()
        facturas = db.query(models.Factura).filter(
            models.Factura.cliente_id == cliente.id,
            models.Factura.estado == "pagada"
        ).all()
        
        total_servicios = len(servicios)
        total_facturado = sum(f.total for f in facturas)
        ultimo_servicio = max((s.fecha_inicio for s in servicios if s.fecha_inicio), default=None)
        
        cliente_dict = cliente_to_dict(cliente)
        cliente_dict.update({
            "total_servicios": total_servicios,
            "total_facturado": total_facturado,
            "ultimo_servicio": ultimo_servicio
        })
        resultado.append(cliente_dict)
    
    return resultado

@app.get("/clientes/{cliente_id}")
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    servicios = db.query(models.Servicio).filter(models.Servicio.cliente_id == cliente_id).all()
    facturas = db.query(models.Factura).filter(
        models.Factura.cliente_id == cliente_id,
        models.Factura.estado == "pagada"
    ).all()
    
    total_servicios = len(servicios)
    total_facturado = sum(f.total for f in facturas)
    ultimo_servicio = max((s.fecha_inicio for s in servicios if s.fecha_inicio), default=None)
    
    result = cliente_to_dict(cliente)
    result.update({
        "total_servicios": total_servicios,
        "total_facturado": total_facturado,
        "ultimo_servicio": ultimo_servicio
    })
    return result

@app.post("/clientes/")
def create_cliente(
    cliente_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    contacto = cliente_data.get("contacto", {})
    
    nif = cliente_data.get("nif")
    if nif and db.query(models.Cliente).filter(models.Cliente.nif == nif).first():
        raise HTTPException(status_code=400, detail="NIF ya registrado")
    
    db_cliente = models.Cliente(
        nombre=cliente_data.get("nombre"),
        tipo=cliente_data.get("tipo", "particular"),
        nif=nif,
        condiciones_especiales=cliente_data.get("condiciones_especiales"),
        forma_pago=cliente_data.get("forma_pago"),
        dias_pago=cliente_data.get("dias_pago", 30),
        estado=cliente_data.get("estado", "activo"),
        notas=cliente_data.get("notas"),
        contacto_email=contacto.get("email"),
        contacto_telefono=contacto.get("telefono"),
        contacto_direccion=contacto.get("direccion"),
        contacto_ciudad=contacto.get("ciudad"),
        contacto_codigo_postal=contacto.get("codigoPostal")
    )
    
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    
    # Generar código
    db_cliente.codigo = generar_codigo_cliente(db)
    db.commit()
    db.refresh(db_cliente)
    
    # Calcular estadísticas (para devolver igual que en get)
    servicios = db.query(models.Servicio).filter(models.Servicio.cliente_id == db_cliente.id).all()
    facturas = db.query(models.Factura).filter(
        models.Factura.cliente_id == db_cliente.id,
        models.Factura.estado == "pagada"
    ).all()
    
    total_servicios = len(servicios)
    total_facturado = sum(f.total for f in facturas)
    ultimo_servicio = max((s.fecha_inicio for s in servicios if s.fecha_inicio), default=None)
    
    result = cliente_to_dict(db_cliente)
    result.update({
        "total_servicios": total_servicios,
        "total_facturado": total_facturado or 0,
        "ultimo_servicio": ultimo_servicio
    })
    return result

@app.put("/clientes/{cliente_id}")
def update_cliente(
    cliente_id: int,
    cliente_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    contacto = cliente_data.get("contacto", {})
    
    if "nombre" in cliente_data:
        db_cliente.nombre = cliente_data["nombre"]
    if "tipo" in cliente_data:
        db_cliente.tipo = cliente_data["tipo"]
    if "nif" in cliente_data:
        db_cliente.nif = cliente_data["nif"]
    if "condiciones_especiales" in cliente_data:
        db_cliente.condiciones_especiales = cliente_data["condiciones_especiales"]
    if "forma_pago" in cliente_data:
        db_cliente.forma_pago = cliente_data["forma_pago"]
    if "dias_pago" in cliente_data:
        db_cliente.dias_pago = cliente_data["dias_pago"]
    if "estado" in cliente_data:
        db_cliente.estado = cliente_data["estado"]
    if "notas" in cliente_data:
        db_cliente.notas = cliente_data["notas"]
    
    if "email" in contacto:
        db_cliente.contacto_email = contacto["email"]
    if "telefono" in contacto:
        db_cliente.contacto_telefono = contacto["telefono"]
    if "direccion" in contacto:
        db_cliente.contacto_direccion = contacto["direccion"]
    if "ciudad" in contacto:
        db_cliente.contacto_ciudad = contacto["ciudad"]
    if "codigoPostal" in contacto:
        db_cliente.contacto_codigo_postal = contacto["codigoPostal"]
    
    db.commit()
    db.refresh(db_cliente)
    
    # Calcular estadísticas
    servicios = db.query(models.Servicio).filter(models.Servicio.cliente_id == cliente_id).all()
    facturas = db.query(models.Factura).filter(
        models.Factura.cliente_id == cliente_id,
        models.Factura.estado == "pagada"
    ).all()
    
    total_servicios = len(servicios)
    total_facturado = sum(f.total for f in facturas)
    ultimo_servicio = max((s.fecha_inicio for s in servicios if s.fecha_inicio), default=None)
    
    result = cliente_to_dict(db_cliente)
    result.update({
        "total_servicios": total_servicios,
        "total_facturado": total_facturado or 0,
        "ultimo_servicio": ultimo_servicio
    })
    return result

@app.delete("/clientes/{cliente_id}")
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
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
    return {"message": "Cliente eliminado"}

# ==================== SERVICIOS ====================

def generar_codigo_servicio(db: Session):
    """Genera código tipo SER-001, SER-002..."""
    ultimo = db.query(models.Servicio).order_by(models.Servicio.id.desc()).first()
    numero = ultimo.id + 1 if ultimo else 1
    return f"SER-{numero:03d}"

@app.get("/servicios/", response_model=List[schemas.ServicioResponse])
def get_servicios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    conductor_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    buscar: Optional[str] = None
):
    query = db.query(models.Servicio)
    
    if estado:
        query = query.filter(models.Servicio.estado == estado)
    if cliente_id:
        query = query.filter(models.Servicio.cliente_id == cliente_id)
    if conductor_id:
        query = query.filter(models.Servicio.conductor_id == conductor_id)
    if fecha_desde:
        query = query.filter(models.Servicio.fecha_inicio >= fecha_desde)
    if fecha_hasta:
        query = query.filter(models.Servicio.fecha_inicio <= fecha_hasta)
    
    if buscar:
        search = f"%{buscar}%"
        query = query.join(models.Cliente).filter(
            (models.Cliente.nombre.ilike(search)) |
            (models.Servicio.origen.ilike(search)) |
            (models.Servicio.destino.ilike(search))
        )
    
    return query.order_by(models.Servicio.fecha_inicio.desc()).all()

@app.get("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
def get_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio

@app.post("/servicios/", response_model=schemas.ServicioResponse)
def create_servicio(
    servicio: schemas.ServicioCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    margen = servicio.precio - servicio.coste_estimado
    
    db_servicio = models.Servicio(**servicio.dict(), margen=margen, creado_por=current_user.username)
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    
    db_servicio.codigo = generar_codigo_servicio(db)
    db.commit()
    db.refresh(db_servicio)
    
    return db_servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
def update_servicio(
    servicio_id: int,
    servicio: schemas.ServicioUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    update_data = servicio.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_servicio, key, value)
    
    if "precio" in update_data or "coste_real" in update_data:
        db_servicio.margen = db_servicio.precio - (db_servicio.coste_real or db_servicio.coste_estimado)
    
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
def delete_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    db.delete(db_servicio)
    db.commit()
    return {"message": "Servicio eliminado"}

# ==================== FACTURAS ====================

def generar_numero_factura(db: Session):
    """Genera número tipo FAC-2024-001"""
    year = datetime.utcnow().year
    count = db.query(models.Factura).filter(
        models.Factura.fecha_emision >= datetime(year, 1, 1)
    ).count()
    return f"FAC-{year}-{count + 1:03d}"

@app.get("/facturas/", response_model=List[schemas.FacturaResponse])
def get_facturas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None
):
    query = db.query(models.Factura)
    
    if estado:
        query = query.filter(models.Factura.estado == estado)
    if cliente_id:
        query = query.filter(models.Factura.cliente_id == cliente_id)
    if fecha_desde:
        query = query.filter(models.Factura.fecha_emision >= fecha_desde)
    if fecha_hasta:
        query = query.filter(models.Factura.fecha_emision <= fecha_hasta)
    
    return query.order_by(models.Factura.fecha_emision.desc()).all()

@app.get("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
def get_factura(
    factura_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura

@app.post("/facturas/", response_model=schemas.FacturaResponse)
def create_factura(
    factura: schemas.FacturaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_factura = models.Factura(**factura.dict(exclude={"conceptos"}))
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    
    db_factura.numero = generar_numero_factura(db)
    db.commit()
    db.refresh(db_factura)
    
    return db_factura

@app.put("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
def update_factura(
    factura_id: int,
    factura: schemas.FacturaUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    update_data = factura.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_factura, key, value)
    
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.delete("/facturas/{factura_id}")
def delete_factura(
    factura_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(require_admin)
):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    db.delete(db_factura)
    db.commit()
    return {"message": "Factura eliminada"}

# ==================== DASHBOARD ====================

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    today = datetime.utcnow().date()
    first_day_of_month = today.replace(day=1)
    
    servicios_hoy = db.query(models.Servicio).filter(
        models.Servicio.fecha_inicio >= datetime.combine(today, datetime.min.time()),
        models.Servicio.fecha_inicio < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).count()
    
    servicios_mes = db.query(models.Servicio).filter(
        models.Servicio.fecha_inicio >= datetime.combine(first_day_of_month, datetime.min.time())
    ).count()
    
    servicios_pendientes = db.query(models.Servicio).filter(
        ~models.Servicio.estado.in_(["completado", "cancelado", "facturado"])
    ).count()
    
    facturado_mes = db.query(models.Factura).filter(
        models.Factura.fecha_emision >= datetime.combine(first_day_of_month, datetime.min.time()),
        models.Factura.estado == "pagada"
    ).all()
    total_facturado_mes = sum(f.total for f in facturado_mes)
    
    pendiente_cobro = db.query(models.Factura).filter(
        models.Factura.estado.in_(["pendiente", "enviada", "vencida"])
    ).all()
    total_pendiente = sum(f.total for f in pendiente_cobro)
    
    conductores_activos = db.query(models.Conductor).filter(
        models.Conductor.estado == "activo"
    ).count()
    
    vehiculos_operativos = db.query(models.Vehiculo).filter(
        models.Vehiculo.estado == "operativo"
    ).count()
    
    total_clientes = db.query(models.Cliente).count()
    
    return {
        "serviciosActivos": servicios_pendientes,
        "serviciosHoy": servicios_hoy,
        "serviciosMes": servicios_mes,
        "conductoresDisponibles": conductores_activos,
        "conductoresOcupados": 0,
        "vehiculosOperativos": vehiculos_operativos,
        "vehiculosTaller": db.query(models.Vehiculo).filter(models.Vehiculo.estado == "taller").count(),
        "facturacionMes": total_facturado_mes,
        "facturacionPendiente": total_pendiente,
        "serviciosPendientesFacturar": db.query(models.Servicio).filter_by(facturado=False).count()
    }

@app.get("/dashboard/servicios-recientes")
def get_servicios_recientes(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    servicios = db.query(models.Servicio).order_by(
        models.Servicio.fecha_creacion.desc()
    ).limit(limit).all()
    
    resultado = []
    for s in servicios:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == s.cliente_id).first()
        resultado.append({
            "id": s.id,
            "codigo": s.codigo or f"SER-{s.id:03d}",
            "cliente_nombre": cliente.nombre if cliente else "Desconocido",
            "origen": s.origen or "",
            "destino": s.destino or "",
            "fecha_servicio": s.fecha_inicio or s.fecha_creacion,
            "estado": s.estado,
            "total": s.precio
        })
    
    return resultado

# ==================== INIT ====================

@app.on_event("startup")
def startup_event():
    init_db()
    create_default_admin()
    print("✅ Database initialized")

@app.get("/")
def root():
    return {
        "message": "MILANO Transport Management API",
        "version": "2.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}