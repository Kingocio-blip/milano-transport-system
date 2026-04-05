from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from . import models, schemas, auth
from .database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MILANO API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generar_codigo(prefix: str, id: int) -> str:
    return f"{prefix}-{datetime.now().year}-{id:05d}"

def generar_numero_factura(id: int) -> str:
    return f"FAC-{datetime.now().year}-{id:05d}"

@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    admin = db.query(models.Usuario).filter(models.Usuario.email == "admin@milano.com").first()
    if not admin:
        admin = models.Usuario(
            email="admin@milano.com",
            nombre="Administrador",
            hashed_password=auth.get_password_hash("admin123"),
            rol="admin",
            activo=True
        )
        db.add(admin)
        db.commit()
        print("Usuario admin creado: admin@milano.com / admin123")
    if db.query(models.Cliente).count() == 0:
        clientes_demo = [
            models.Cliente(nombre="Transportes Garcia S.L.", email="info@transportesgarcia.com", telefono="+34 912 345 678", ciudad="Madrid", nif="B12345678", tipo_cliente="empresa"),
            models.Cliente(nombre="Viajes Express", email="reservas@viajesexpress.es", telefono="+34 913 456 789", ciudad="Barcelona", nif="B87654321", tipo_cliente="empresa"),
        ]
        db.add_all(clientes_demo)
        db.commit()
    if db.query(models.Vehiculo).count() == 0:
        vehiculos_demo = [
            models.Vehiculo(matricula="1234 ABC", marca="Mercedes-Benz", modelo="Sprinter", tipo="furgon", capacidad=12, ano=2022, estado="disponible"),
            models.Vehiculo(matricula="5678 DEF", marca="Volkswagen", modelo="Crafter", tipo="minibus", capacidad=20, ano=2023, estado="disponible"),
        ]
        db.add_all(vehiculos_demo)
        db.commit()
    if db.query(models.Conductor).count() == 0:
        conductores_demo = [
            models.Conductor(nombre="Juan", apellidos="Martinez Lopez", email="juan@milano.com", telefono="+34 654 321 098", licencia="D12345678", estado="disponible"),
            models.Conductor(nombre="Maria", apellidos="Garcia Ruiz", email="maria@milano.com", telefono="+34 612 345 678", licencia="D87654321", estado="disponible"),
        ]
        db.add_all(conductores_demo)
        db.commit()
    db.close()

@app.post("/auth/login", response_model=schemas.Token)
async def login(credentials: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
async def get_me(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

@app.get("/clientes", response_model=List[schemas.ClienteResponse])
async def get_clientes(activo: Optional[bool] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    query = db.query(models.Cliente)
    if activo is not None:
        query = query.filter(models.Cliente.activo == activo)
    return query.all()

@app.post("/clientes", response_model=schemas.ClienteResponse)
async def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
async def get_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
async def update_cliente(cliente_id: int, cliente_update: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in cliente_update.dict().items():
        setattr(cliente, field, value)
    db.commit()
    db.refresh(cliente)
    return cliente

@app.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.activo = False
    db.commit()
    return {"message": "Cliente eliminado"}

@app.get("/vehiculos", response_model=List[schemas.VehiculoResponse])
async def get_vehiculos(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    query = db.query(models.Vehiculo)
    if estado:
        query = query.filter(models.Vehiculo.estado == estado)
    return query.all()

@app.post("/vehiculos", response_model=schemas.VehiculoResponse)
async def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.get("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
async def get_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    return vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
async def update_vehiculo(vehiculo_id: int, vehiculo_update: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    for field, value in vehiculo_update.dict().items():
        setattr(vehiculo, field, value)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
async def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    db.delete(vehiculo)
    db.commit()
    return {"message": "Vehiculo eliminado"}

@app.get("/conductores", response_model=List[schemas.ConductorResponse])
async def get_conductores(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    query = db.query(models.Conductor)
    if estado:
        query = query.filter(models.Conductor.estado == estado)
    return query.all()

@app.post("/conductores", response_model=schemas.ConductorResponse)
async def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.get("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
async def get_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return conductor

@app.put("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
async def update_conductor(conductor_id: int, conductor_update: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    for field, value in conductor_update.dict().items():
        setattr(conductor, field, value)
    db.commit()
    db.refresh(conductor)
    return conductor

@app.delete("/conductores/{conductor_id}")
async def delete_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    db.delete(conductor)
    db.commit()
    return {"message": "Conductor eliminado"}

@app.get("/servicios", response_model=List[schemas.ServicioResponse])
async def get_servicios(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    query = db.query(models.Servicio)
    if estado:
        query = query.filter(models.Servicio.estado == estado)
    return query.order_by(models.Servicio.fecha_salida.desc()).all()

@app.post("/servicios", response_model=schemas.ServicioResponse)
async def create_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    ultimo = db.query(models.Servicio).order_by(models.Servicio.id.desc()).first()
    nuevo_id = (ultimo.id + 1) if ultimo else 1
    codigo = generar_codigo("SRV", nuevo_id)
    db_servicio = models.Servicio(**servicio.dict(), codigo=codigo, creado_por=current_user.id)
    db.add(db_servicio)
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.get("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
async def get_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
async def update_servicio(servicio_id: int, servicio_update: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for field, value in servicio_update.dict().items():
        setattr(servicio, field, value)
    db.commit()
    db.refresh(servicio)
    return servicio

@app.delete("/servicios/{servicio_id}")
async def delete_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(servicio)
    db.commit()
    return {"message": "Servicio eliminado"}

@app.get("/facturas", response_model=List[schemas.FacturaResponse])
async def get_facturas(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    query = db.query(models.Factura)
    if estado:
        query = query.filter(models.Factura.estado == estado)
    return query.order_by(models.Factura.fecha_emision.desc()).all()

@app.post("/facturas", response_model=schemas.FacturaResponse)
async def create_factura(factura: schemas.FacturaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    ultimo = db.query(models.Factura).order_by(models.Factura.id.desc()).first()
    nuevo_id = (ultimo.id + 1) if ultimo else 1
    numero = generar_numero_factura(nuevo_id)
    impuestos = factura.subtotal * (factura.impuesto_porcentaje / 100)
    total = factura.subtotal - factura.descuento + impuestos
    db_factura = models.Factura(**factura.dict(), numero=numero, impuestos=impuestos, total=total)
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.get("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
async def get_factura(factura_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura

@app.put("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
async def update_factura(factura_id: int, factura_update: schemas.FacturaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    for field, value in factura_update.dict().items():
        setattr(factura, field, value)
    factura.impuestos = factura.subtotal * (factura.impuesto_porcentaje / 100)
    factura.total = factura.subtotal - factura.descuento + factura.impuestos
    db.commit()
    db.refresh(factura)
    return factura

@app.delete("/facturas/{factura_id}")
async def delete_factura(factura_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    db.delete(factura)
    db.commit()
    return {"message": "Factura eliminada"}

@app.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)
    total_clientes = db.query(models.Cliente).filter(models.Cliente.activo == True).count()
    total_vehiculos = db.query(models.Vehiculo).count()
    total_conductores = db.query(models.Conductor).count()
    servicios_pendientes = db.query(models.Servicio).filter(models.Servicio.estado == "pendiente").count()
    facturas_pendientes = db.query(models.Factura).filter(models.Factura.estado == "pendiente").count()
    ingresos_mes = db.query(models.Factura).filter(models.Factura.estado == "pagada", models.Factura.fecha_pago >= inicio_mes).all()
    total_ingresos = sum(f.total for f in ingresos_mes)
    return {
        "total_clientes": total_clientes,
        "total_vehiculos": total_vehiculos,
        "total_conductores": total_conductores,
        "servicios_pendientes": servicios_pendientes,
        "facturas_pendientes": facturas_pendientes,
        "ingresos_mes": round(total_ingresos, 2),
    }

@app.get("/")
async def root():
    return {"message": "MILANO Transport Management System API", "version": "2.0.0"}