from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from . import models, schemas, auth
from .database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MILANO API", version="2.1.0")

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

def calcular_sueldo_conductor(servicio: models.Servicio, conductor: models.Conductor):
    """Calcula el sueldo del conductor para un servicio"""
    if not servicio.fecha_salida or not servicio.fecha_llegada_real:
        return {"horas": 0, "sueldo": 0}
    
    # Calcular horas trabajadas
    inicio = servicio.fecha_salida
    fin = servicio.fecha_llegada_real
    horas = (fin - inicio).total_seconds() / 3600
    
    # Sueldo = horas * tarifa por hora
    tarifa_hora = conductor.salario_base_hora or 12.0
    sueldo = horas * tarifa_hora
    
    return {
        "horas": round(horas, 2),
        "tarifa_hora": tarifa_hora,
        "sueldo": round(sueldo, 2)
    }

@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    
    # Crear admin si no existe
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
    
    # Crear conductor demo si no existe
    conductor_user = db.query(models.Usuario).filter(models.Usuario.email == "conductor@milano.com").first()
    if not conductor_user:
        # Crear usuario conductor
        conductor_user = models.Usuario(
            email="conductor@milano.com",
            nombre="Juan Garcia",
            hashed_password=auth.get_password_hash("conductor123"),
            rol="conductor",
            activo=True
        )
        db.add(conductor_user)
        db.commit()
        
        # Crear ficha de conductor vinculada
        conductor = models.Conductor(
            usuario_id=conductor_user.id,
            nombre="Juan",
            apellidos="Garcia Lopez",
            email="conductor@milano.com",
            telefono="+34 654 321 098",
            licencia="D12345678",
            tipo_licencia="D",
            salario_base_hora=12.5,
            estado="disponible"
        )
        db.add(conductor)
        db.commit()
        print("Conductor demo creado: conductor@milano.com / conductor123")
    
    # Datos demo
    if db.query(models.Cliente).count() == 0:
        db.add_all([
            models.Cliente(nombre="Transportes Garcia S.L.", email="info@transportesgarcia.com", telefono="+34 912 345 678", ciudad="Madrid", nif="B12345678"),
            models.Cliente(nombre="Viajes Express", email="reservas@viajesexpress.es", telefono="+34 913 456 789", ciudad="Barcelona", nif="B87654321"),
        ])
        db.commit()
    
    if db.query(models.Vehiculo).count() == 0:
        db.add_all([
            models.Vehiculo(matricula="1234 ABC", marca="Mercedes-Benz", modelo="Sprinter", tipo="furgon", capacidad=12, ano=2022),
            models.Vehiculo(matricula="5678 DEF", marca="Volkswagen", modelo="Crafter", tipo="minibus", capacidad=20, ano=2023),
        ])
        db.commit()
    
    db.close()

# ========== AUTH ==========
@app.post("/auth/login", response_model=schemas.Token)
async def login(credentials: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos")
    
    # Actualizar ultimo acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    access_token = auth.create_access_token(data={"sub": user.email, "rol": user.rol})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me")
async def get_me(current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Devuelve info del usuario incluyendo su rol y datos de conductor si aplica"""
    response = {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "rol": current_user.rol,
        "activo": current_user.activo
    }
    
    # Si es conductor, incluir datos de la ficha
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if conductor:
            response["conductor_id"] = conductor.id
            response["salario_base_hora"] = conductor.salario_base_hora
    
    return response

# ========== USUARIOS (ADMIN) ==========
@app.post("/usuarios", response_model=schemas.UsuarioResponse)
async def create_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Crear nuevo usuario (solo admin)"""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear usuarios")
    
    # Verificar email unico
    existing = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    db_usuario = models.Usuario(
        email=usuario.email,
        nombre=usuario.nombre,
        hashed_password=auth.get_password_hash(usuario.password),
        rol=usuario.rol
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

# ========== CONDUCTORES ==========
@app.get("/conductores", response_model=List[schemas.ConductorResponse])
async def get_conductores(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Ver todos los conductores (admin) o solo el propio (conductor)"""
    if current_user.rol == "admin":
        return db.query(models.Conductor).all()
    else:
        # Conductor solo ve su propia ficha
        return db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).all()

@app.post("/conductores", response_model=schemas.ConductorResponse)
async def create_conductor(conductor: schemas.ConductorCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Crear conductor (solo admin)"""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear conductores")
    
    db_conductor = models.Conductor(**conductor.dict())
    db.add(db_conductor)
    db.commit()
    db.refresh(db_conductor)
    return db_conductor

@app.get("/conductores/{conductor_id}/servicios")
async def get_servicios_conductor(conductor_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Ver servicios asignados a un conductor"""
    # Verificar permisos
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or conductor.id != conductor_id:
            raise HTTPException(status_code=403, detail="No puedes ver servicios de otro conductor")
    
    servicios = db.query(models.Servicio).filter(
        models.Servicio.conductor_id == conductor_id
    ).order_by(models.Servicio.fecha_salida.desc()).all()
    
    return servicios

@app.get("/conductores/{conductor_id}/sueldo")
async def calcular_sueldo_conductor_endpoint(
    conductor_id: int, 
    mes: Optional[int] = None, 
    anio: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    """Calcular sueldo del conductor por mes"""
    # Verificar permisos
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or conductor.id != conductor_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    conductor = db.query(models.Conductor).filter(models.Conductor.id == conductor_id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    # Filtrar por mes/año
    if mes and anio:
        inicio_mes = datetime(anio, mes, 1)
        if mes == 12:
            fin_mes = datetime(anio + 1, 1, 1)
        else:
            fin_mes = datetime(anio, mes + 1, 1)
        
        servicios = db.query(models.Servicio).filter(
            models.Servicio.conductor_id == conductor_id,
            models.Servicio.estado.in_(["completado", "facturado"]),
            models.Servicio.fecha_salida >= inicio_mes,
            models.Servicio.fecha_salida < fin_mes
        ).all()
    else:
        # Mes actual por defecto
        hoy = date.today()
        inicio_mes = datetime(hoy.year, hoy.month, 1)
        servicios = db.query(models.Servicio).filter(
            models.Servicio.conductor_id == conductor_id,
            models.Servicio.estado.in_(["completado", "facturado"]),
            models.Servicio.fecha_salida >= inicio_mes
        ).all()
    
    # Calcular sueldo por cada servicio
    detalle_servicios = []
    total_sueldo = 0
    total_horas = 0
    
    for servicio in servicios:
        calculo = calcular_sueldo_conductor(servicio, conductor)
        detalle_servicios.append({
            "servicio_id": servicio.id,
            "codigo": servicio.codigo,
            "fecha": servicio.fecha_salida,
            "horas": calculo["horas"],
            "sueldo": calculo["sueldo"]
        })
        total_sueldo += calculo["sueldo"]
        total_horas += calculo["horas"]
    
    return {
        "conductor_id": conductor_id,
        "nombre": f"{conductor.nombre} {conductor.apellidos}",
        "tarifa_hora": conductor.salario_base_hora,
        "periodo": f"{mes}/{anio}" if mes and anio else "mes actual",
        "total_horas": round(total_horas, 2),
        "total_sueldo": round(total_sueldo, 2),
        "servicios": detalle_servicios
    }

# ========== FICHAJES ==========
@app.post("/fichajes", response_model=schemas.FichajeResponse)
async def crear_fichaje(fichaje: schemas.FichajeCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Registrar fichaje (entrada, salida, inicio/fin servicio)"""
    # Verificar que el conductor solo fiche para si mismo
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or conductor.id != fichaje.conductor_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    db_fichaje = models.Fichaje(**fichaje.dict())
    db.add(db_fichaje)
    db.commit()
    db.refresh(db_fichaje)
    return db_fichaje

@app.get("/conductores/{conductor_id}/fichajes")
async def get_fichajes_conductor(
    conductor_id: int, 
    fecha: Optional[date] = None,
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    """Ver fichajes de un conductor"""
    # Verificar permisos
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or conductor.id != conductor_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    query = db.query(models.Fichaje).filter(models.Fichaje.conductor_id == conductor_id)
    
    if fecha:
        inicio_dia = datetime.combine(fecha, datetime.min.time())
        fin_dia = datetime.combine(fecha, datetime.max.time())
        query = query.filter(models.Fichaje.fecha_hora >= inicio_dia, models.Fichaje.fecha_hora <= fin_dia)
    
    return query.order_by(models.Fichaje.fecha_hora.desc()).all()

# ========== CLIENTES ==========
@app.get("/clientes", response_model=List[schemas.ClienteResponse])
async def get_clientes(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver clientes")
    return db.query(models.Cliente).filter(models.Cliente.activo == True).all()

@app.post("/clientes", response_model=schemas.ClienteResponse)
async def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear clientes")
    db_cliente = models.Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
async def update_cliente(cliente_id: int, cliente: schemas.ClienteCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede editar clientes")
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
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar clientes")
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.activo = False
    db.commit()
    return {"message": "Cliente eliminado"}

# ========== VEHICULOS ==========
@app.get("/vehiculos", response_model=List[schemas.VehiculoResponse])
async def get_vehiculos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver vehiculos")
    return db.query(models.Vehiculo).all()

@app.post("/vehiculos", response_model=schemas.VehiculoResponse)
async def create_vehiculo(vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear vehiculos")
    db_vehiculo = models.Vehiculo(**vehiculo.dict())
    db.add(db_vehiculo)
    db.commit()
    db.refresh(db_vehiculo)
    return db_vehiculo

@app.put("/vehiculos/{vehiculo_id}", response_model=schemas.VehiculoResponse)
async def update_vehiculo(vehiculo_id: int, vehiculo: schemas.VehiculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede editar vehiculos")
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
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar vehiculos")
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    db.delete(vehiculo)
    db.commit()
    return {"message": "Vehiculo eliminado"}

# ========== SERVICIOS ==========
@app.get("/servicios", response_model=List[schemas.ServicioResponse])
async def get_servicios(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    """Ver servicios (admin ve todos, conductor ve los suyos)"""
    query = db.query(models.Servicio)
    
    if current_user.rol == "conductor":
        # Conductor solo ve sus servicios asignados
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if conductor:
            query = query.filter(models.Servicio.conductor_id == conductor.id)
    
    if estado:
        query = query.filter(models.Servicio.estado == estado)
    
    return query.order_by(models.Servicio.fecha_salida.desc()).all()

@app.post("/servicios", response_model=schemas.ServicioResponse)
async def create_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear servicios")
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
    
    # Conductor solo ve sus propios servicios
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or servicio.conductor_id != conductor.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    return servicio

@app.put("/servicios/{servicio_id}", response_model=schemas.ServicioResponse)
async def update_servicio(servicio_id: int, servicio_update: schemas.ServicioUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    db_servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not db_servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Conductor solo puede actualizar ciertos campos de sus servicios
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or db_servicio.conductor_id != conductor.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Conductor solo puede: completar servicio, añadir fecha_llegada_real
        campos_permitidos = ["fecha_llegada_real", "estado", "observaciones"]
        datos = servicio_update.dict(exclude_unset=True)
        for key in list(datos.keys()):
            if key not in campos_permitidos:
                del datos[key]
        
        for key, value in datos.items():
            setattr(db_servicio, key, value)
    else:
        # Admin puede todo
        for key, value in servicio_update.dict(exclude_unset=True).items():
            setattr(db_servicio, key, value)
    
    db.commit()
    db.refresh(db_servicio)
    return db_servicio

@app.delete("/servicios/{servicio_id}")
async def delete_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar servicios")
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(servicio)
    db.commit()
    return {"message": "Servicio eliminado"}

@app.get("/servicios/{servicio_id}/rentabilidad")
async def get_rentabilidad_servicio(servicio_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Conductor solo ve rentabilidad de sus servicios
    if current_user.rol == "conductor":
        conductor = db.query(models.Conductor).filter(models.Conductor.usuario_id == current_user.id).first()
        if not conductor or servicio.conductor_id != conductor.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    rentabilidad = calcular_rentabilidad_servicio(servicio)
    return {
        "servicio_id": servicio.id,
        "codigo": servicio.codigo,
        **rentabilidad
    }

# ========== FACTURAS ==========
@app.get("/facturas", response_model=List[schemas.FacturaResponse])
async def get_facturas(estado: Optional[str] = None, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver facturas")
    
    query = db.query(models.Factura)
    if estado:
        query = query.filter(models.Factura.estado == estado)
    return query.order_by(models.Factura.fecha_emision.desc()).all()

@app.post("/facturas", response_model=schemas.FacturaResponse)
async def create_factura(factura: schemas.FacturaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede crear facturas")
    
    ultimo = db.query(models.Factura).order_by(models.Factura.id.desc()).first()
    nuevo_id = (ultimo.id + 1) if ultimo else 1
    numero = generar_codigo("FAC", nuevo_id)
    
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
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede facturar")
    
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    if servicio.facturado:
        raise HTTPException(status_code=400, detail="El servicio ya está facturado")
    
    if servicio.estado != "completado":
        raise HTTPException(status_code=400, detail="Solo se pueden facturar servicios completados")
    
    ultimo = db.query(models.Factura).order_by(models.Factura.id.desc()).first()
    nuevo_id = (ultimo.id + 1) if ultimo else 1
    numero = generar_codigo("FAC", nuevo_id)
    
    subtotal = servicio.precio_final or 0
    impuesto_porcentaje = 10
    impuestos = subtotal * (impuesto_porcentaje / 100)
    total = subtotal + impuestos
    
    fecha_emision = date.today()
    fecha_vencimiento = fecha_emision + timedelta(days=30)
    
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
    
    servicio.facturado = True
    servicio.factura_id = db_factura.id
    servicio.estado = "facturado"
    db.commit()
    
    return db_factura

@app.put("/facturas/{factura_id}", response_model=schemas.FacturaResponse)
async def update_factura(factura_id: int, factura_update: schemas.FacturaUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede actualizar facturas")
    
    db_factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not db_factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    for key, value in factura_update.dict(exclude_unset=True).items():
        setattr(db_factura, key, value)
    
    if factura_update.estado == "pagada" and not db_factura.fecha_pago:
        db_factura.fecha_pago = date.today()
    
    db.commit()
    db.refresh(db_factura)
    return db_factura

@app.delete("/facturas/{factura_id}")
async def delete_factura(factura_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar facturas")
    
    factura = db.query(models.Factura).filter(models.Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    if factura.servicio_id:
        servicio = db.query(models.Servicio).filter(models.Servicio.id == factura.servicio_id).first()
        if servicio:
            servicio.facturado = False
            servicio.factura_id = None
            servicio.estado = "completado"
    
    db.delete(factura)
    db.commit()
    return {"message": "Factura eliminada"}

# ========== DASHBOARD ==========
@app.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver dashboard")
    
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)
    
    total_clientes = db.query(models.Cliente).filter(models.Cliente.activo == True).count()
    total_vehiculos = db.query(models.Vehiculo).count()
    total_conductores = db.query(models.Conductor).count()
    
    servicios_pendientes = db.query(models.Servicio).filter(models.Servicio.estado == "pendiente").count()
    servicios_completados = db.query(models.Servicio).filter(models.Servicio.estado == "completado").count()
    servicios_facturados = db.query(models.Servicio).filter(models.Servicio.estado == "facturado").count()
    
    facturas_pendientes = db.query(models.Factura).filter(models.Factura.estado == "pendiente").count()
    facturas_pagadas = db.query(models.Factura).filter(models.Factura.estado == "pagada").count()
    
    facturas_mes = db.query(models.Factura).filter(
        models.Factura.estado == "pagada",
        models.Factura.fecha_pago >= inicio_mes
    ).all()
    ingresos_mes = sum(f.total for f in facturas_mes)
    
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
    return {"message": "MILANO Transport Management System API", "version": "2.1.0"}