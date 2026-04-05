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

def calcular_rentabilidad_servicio(servicio: models.Servicio):
    """Calcula la rentabilidad de un servicio"""
    ingresos = servicio.precio_final or 0
    gastos = (
        (servicio.gasto_conductor or 0) +
        (servicio.gasto_auxiliar or 0) +
        (servicio.gasto_gasoil or 0) +
        (servicio.gasto_peajes or 0) +
        (servicio.gasto_otros or 0)
    )
    return {
        "ingresos": ingresos,
        "gastos": gastos,
        "beneficio": ingresos - gastos,
        "margen": ((ingresos - gastos) / ingresos * 100) if ingresos > 0 else 0
    }

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
            models.Cliente(nombre="Transportes Garcia S.L.", email="info@transportesgarcia.com", telefono="+34 912 345 678", ciudad="Madrid", nif="B12345678"),
            models.Cliente(nombre="Viajes Express", email="reservas@viajesexpress.es", telefono="+34 913 456 789", ciudad="Barcelona", nif="B87654321"),
        ]
        db.add_all(clientes_demo)
        db.commit()
    
    if db.query(models.Vehiculo).count() == 0:
        vehiculos_demo = [
            models.Vehiculo(matricula="1234 ABC", marca="Mercedes-Benz", modelo="Sprinter", tipo="furgon", capacidad=12, ano=2022),
            models.Vehiculo(matricula="5678 DEF", marca="Volkswagen", modelo="Crafter", tipo="minibus", capacidad=20, ano=2023),
        ]
        db.add_all(vehiculos_demo)
        db.commit()
    
    if db.query(models.Conductor).count() == 0:
        conductores_demo = [
            models.Conductor(nombre="Juan", apellidos="Martinez Lopez", email="juan@milano.com", telefono="+34 654 321 098", licencia="D12345678"),
            models.Conductor(nombre="Maria", apellidos="Garcia Ruiz", email="maria@milano.com", telefono="+34 612 345 678", licencia="D87654321"),
        ]
        db.add_all(conductores_demo)
        db.commit()
    db.close()

@app.post("/auth/login", response_model=schemas.Token)
async def login(credentials: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
async def get_me(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

# ========== CLIENTES ==========
@app.get("/clientes", response_model=List[schemas.ClienteResponse])
async def get_clientes(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    return db.query(models.Cliente).filter(models.Cliente.activo == True).all()

@app.post("/clientes", response_model=schemas.ClienteResponse)
async def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
async def update_cliente(cliente_id: int, cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, value in cliente.dict().items():
        setattr(db_cliente, key, value)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.activo = False
    db.commit()
    return {"message": "Cliente eliminado"}

# ========== VEHICULOS ==========
@app.get("/vehiculos", response_model=List[schemas.VehiculoResponse])
async def get_vehiculos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    return db.query(models.Vehiculo).all()

@app.post("/vehiculos", response_model=schemas.VehiculoResponse)
async def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
async def update_vehiculo(vehiculo_id: int, vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not db_vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    for key, value in vehiculo.dict().items():
        setattr(db_vehiculo, key, value)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.delete("/vehiculos/{vehiculo_id}")
async def delete_vehiculo(vehiculo_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    db.delete(vehiculo)
    db.commit()
    return {"message": "Vehiculo eliminado"}

# ========== CONDUCTORES ==========
@app.get("/conductores", response_model=List[schemas.ConductorResponse])
async def get_conductores(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    return db.query(models.Conductor).all()

@app.post("/conductores", response_model=schemas.ConductorResponse)
async def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.put("/conductores/{conductor_id}", response_model=schemas.ConductorResponse)
async def update_conductor(conductor_id: int, conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not db_conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    for key, value in conductor.dict().items():
        setattr(db_conductor, key, value)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.delete("/conductores/{conductor_id}")
async def delete_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    db.delete(conductor)
    db.commit()
    return {"message": "Conductor eliminado"}

# ========== SERVICIOS (AMPLIADO) ==========
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
async def update_servicio(servicio_id: int, servicio_update: schemas.ServicioUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Actualizar solo los campos proporcionados
    for key, value in servicio_update.dict(exclude_unset=True).items():
        setattr(db_servicio, key, value)
    
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
async def delete_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(servicio)
    db.commit()
    return {"message": "Servicio eliminado"}

@app.get("/servicios/{servicio_id}/rentabilidad")
async def get_rentabilidad_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Obtiene el análisis de rentabilidad de un servicio"""
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    rentabilidad = calcular_rentabilidad_servicio(servicio)
    return {
        "servicio_id": servicio.id,
        "codigo": servicio.codigo,
        **rentabilidad
    }

# ========== FACTURAS (AMPLIADO) ==========
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
    numero = generar_codigo("FAC", nuevo_id)
    
    # Calcular impuestos y total
    subtotal = factura.subtotal
    descuento = factura.descuento
    base_imponible = subtotal - descuento
    impuestos = base_imponible * (factura.impuesto_porcentaje / 100)
    total = base_imponible + impuestos
    
    db_factura = models.Factura(
        **factura.dict(),
        numero=numero,
        impuestos=impuestos,
        total=total
    )
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.post("/servicios/{servicio_id}/facturar", response_model=schemas.FacturaResponse)
async def facturar_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Genera una factura automáticamente desde un servicio completado"""
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    if servicio.facturado:
        raise HTTPException(status_code=400, detail="El servicio ya está facturado")
    
    if servicio.estado != "completado":
        raise HTTPException(status_code=400, detail="Solo se pueden facturar servicios completados")
    
    # Generar número de factura
    ultimo = db.query(models.Factura).order_by(models.Factura.id.desc()).first()
    nuevo_id = (ultimo.id + 1) if ultimo else 1
    numero = generar_codigo("FAC", nuevo_id)
    
    # Calcular totales
    subtotal = servicio.precio_final or 0
    impuesto_porcentaje = 10  # 10% para transporte por defecto
    impuestos = subtotal * (impuesto_porcentaje / 100)
    total = subtotal + impuestos
    
    # Fechas
    fecha_emision = date.today()
    fecha_vencimiento = fecha_emision + timedelta(days=30)  # 30 días por defecto
    
    # Crear factura
    db_factura = models.Factura(
        numero=numero,
        cliente_id=servicio.cliente_id,
        servicio_id=servicio.id,
        fecha_emision=fecha_emision,
        fecha_vencimiento=fecha_vencimiento,
        subtotal=subtotal,
        descuento=0,
        impuesto_porcentaje=impuesto_porcentaje,
        impuestos=impuestos,
        total=total,
        estado="pendiente",
        forma_pago="Transferencia bancaria - 30 días"
    )
    db.add(db_factura)
    db.commit()
    db.refresh(db_factura)
    
    # Actualizar servicio como facturado
    servicio.facturado = True
    servicio.factura_id = db_factura.id
    servicio.estado = "facturado"
    db.commit()
    
    return db_factura

@app.put("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
async def update_factura(factura_id: int, factura_update: schemas.FacturaUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Actualizar campos
    for key, value in factura_update.dict(exclude_unset=True).items():
        setattr(db_factura, key, value)
    
    # Si se marca como pagada y no tiene fecha de pago, asignar hoy
    if factura_update.estado == "pagada" and not db_factura.fecha_pago:
        db_factura.fecha_pago = date.today()
    
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.delete("/facturas/{factura_id}")
async def delete_factura(factura_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Si la factura estaba asociada a un servicio, desmarcarlo
    if factura.servicio_id:
        servicio = db.query(models.Servicio).filter(models.Servicio.id == factura.servicio_id).first()
        if servicio:
            servicio.facturado = False
            servicio.factura_id = None
            servicio.estado = "completado"
    
    db.delete(factura)
    db.commit()
    return {"message": "Factura eliminada"}

# ========== DASHBOARD (AMPLIADO) ==========
@app.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)
    
    # Conteos básicos
    total_clientes = db.query(models.Cliente).filter(models.Cliente.activo == True).count()
    total_vehiculos = db.query(models.Vehiculo).count()
    total_conductores = db.query(models.Conductor).count()
    
    # Servicios
    servicios_pendientes = db.query(models.Servicio).filter(models.Servicio.estado == "pendiente").count()
    servicios_completados = db.query(models.Servicio).filter(models.Servicio.estado == "completado").count()
    servicios_facturados = db.query(models.Servicio).filter(models.Servicio.estado == "facturado").count()
    
    # Facturas
    facturas_pendientes = db.query(models.Factura).filter(models.Factura.estado == "pendiente").count()
    facturas_pagadas = db.query(models.Factura).filter(models.Factura.estado == "pagada").count()
    
    # Ingresos del mes
    facturas_mes = db.query(models.Factura).filter(
        models.Factura.estado == "pagada",
        models.Factura.fecha_pago >= inicio_mes
    ).all()
    ingresos_mes = sum(f.total for f in facturas_mes)
    
    # Gastos del mes (de servicios completados/facturados)
    servicios_mes = db.query(models.Servicio).filter(
        models.Servicio.estado.in_(["completado", "facturado"]),
        models.Servicio.fecha_salida >= inicio_mes
    ).all()
    gastos_mes = sum(
        (s.gasto_conductor or 0) + (s.gasto_auxiliar or 0) + 
        (s.gasto_gasoil or 0) + (s.gasto_peajes or 0) + (s.gasto_otros or 0)
        for s in servicios_mes
    )
    
    beneficio_mes = ingresos_mes - gastos_mes
    
    return {
        "total_clientes": total_clientes,
        "total_vehiculos": total_vehiculos,
        "total_conductores": total_conductores,
        "servicios_pendientes": servicios_pendientes,
        "servicios_completados": servicios_completados,
        "servicios_facturados": servicios_facturados,
        "facturas_pendientes": facturas_pendientes,
        "facturas_pagadas": facturas_pagadas,
        "ingresos_mes": round(ingresos_mes, 2),
        "gastos_mes": round(gastos_mes, 2),
        "beneficio_mes": round(beneficio_mes, 2)
    }

@app.get("/")
async def root():
    return {"message": "MILANO Transport Management System API", "version": "2.0.0"}