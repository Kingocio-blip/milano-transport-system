# ============================================
# MILANO - Sistema de Permisos Granular
# ============================================

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import fnmatch  # Para wildcards (*)

import models
from database import get_db
from auth import get_current_user

# ============================================
# DEFINICIÓN DE PERMISOS DEL SISTEMA
# ============================================

PERMISOS_SISTEMA = [
    # Dashboard
    {"codigo": "dashboard.ver", "nombre": "Ver dashboard", "categoria": "dashboard"},
    
    # Usuarios
    {"codigo": "usuarios.ver", "nombre": "Ver usuarios", "categoria": "usuarios"},
    {"codigo": "usuarios.crear", "nombre": "Crear usuarios", "categoria": "usuarios"},
    {"codigo": "usuarios.editar", "nombre": "Editar usuarios", "categoria": "usuarios"},
    {"codigo": "usuarios.eliminar", "nombre": "Eliminar usuarios", "categoria": "usuarios"},
    
    # Clientes
    {"codigo": "clientes.ver", "nombre": "Ver clientes", "categoria": "clientes"},
    {"codigo": "clientes.crear", "nombre": "Crear clientes", "categoria": "clientes"},
    {"codigo": "clientes.editar", "nombre": "Editar clientes", "categoria": "clientes"},
    {"codigo": "clientes.eliminar", "nombre": "Eliminar clientes", "categoria": "clientes"},
    
    # Conductores
    {"codigo": "conductores.ver", "nombre": "Ver conductores", "categoria": "conductores"},
    {"codigo": "conductores.crear", "nombre": "Crear conductores", "categoria": "conductores"},
    {"codigo": "conductores.editar", "nombre": "Editar conductores", "categoria": "conductores"},
    {"codigo": "conductores.eliminar", "nombre": "Eliminar conductores", "categoria": "conductores"},
    
    # Vehículos
    {"codigo": "vehiculos.ver", "nombre": "Ver vehículos", "categoria": "vehiculos"},
    {"codigo": "vehiculos.crear", "nombre": "Crear vehículos", "categoria": "vehiculos"},
    {"codigo": "vehiculos.editar", "nombre": "Editar vehículos", "categoria": "vehículos"},
    {"codigo": "vehiculos.eliminar", "nombre": "Eliminar vehículos", "categoria": "vehiculos"},
    {"codigo": "vehiculos.historial", "nombre": "Ver historial vehículos", "categoria": "vehiculos"},
    
    # Servicios
    {"codigo": "servicios.ver", "nombre": "Ver servicios", "categoria": "servicios"},
    {"codigo": "servicios.crear", "nombre": "Crear servicios", "categoria": "servicios"},
    {"codigo": "servicios.editar", "nombre": "Editar servicios", "categoria": "servicios"},
    {"codigo": "servicios.eliminar", "nombre": "Eliminar servicios", "categoria": "servicios"},
    {"codigo": "servicios.asignar", "nombre": "Asignar conductores/vehículos", "categoria": "servicios"},
    
    # Facturación
    {"codigo": "facturacion.ver", "nombre": "Ver facturación", "categoria": "facturacion"},
    {"codigo": "facturacion.crear", "nombre": "Crear facturas", "categoria": "facturacion"},
    {"codigo": "facturacion.editar", "nombre": "Editar facturas", "categoria": "facturacion"},
    {"codigo": "facturacion.eliminar", "nombre": "Eliminar facturas", "categoria": "facturacion"},
    
    # Panel Conductor (app móvil/conductores)
    {"codigo": "panel_conductor.ver", "nombre": "Acceder a panel conductor", "categoria": "panel_conductor"},
    {"codigo": "panel_conductor.servicios", "nombre": "Ver mis servicios asignados", "categoria": "panel_conductor"},
    {"codigo": "panel_conductor.actualizar", "nombre": "Actualizar estado servicio", "categoria": "panel_conductor"},
    
    # Configuración (solo admin)
    {"codigo": "configuracion.ver", "nombre": "Ver configuración", "categoria": "configuracion"},
    {"codigo": "configuracion.editar", "nombre": "Editar configuración", "categoria": "configuracion"},
    {"codigo": "configuracion.roles", "nombre": "Gestionar roles y permisos", "categoria": "configuracion"},
    
    # Admin total
    {"codigo": "admin.todo", "nombre": "Acceso total administrador", "categoria": "admin"},
]

# ============================================
# MAPEO DE ROLES BASE A PERMISOS
# ============================================

PERMISOS_POR_ROL = {
    models.UserRole.ADMIN: [
        "admin.todo",  # Admin tiene todo
    ],
    
    models.UserRole.GERENTE: [
        "dashboard.ver",
        "usuarios.ver", "usuarios.crear", "usuarios.editar",
        "clientes.*",
        "conductores.*",
        "vehiculos.*",
        "servicios.*",
        "facturacion.*",
        "configuracion.ver",
    ],
    
    models.UserRole.OPERADOR: [
        "dashboard.ver",
        "clientes.ver", "clientes.crear", "clientes.editar",
        "conductores.ver",
        "vehiculos.ver",
        "servicios.ver", "servicios.crear", "servicios.editar", "servicios.asignar",
        "facturacion.ver", "facturacion.crear",
    ],
    
    models.UserRole.CONDUCTOR: [
        "panel_conductor.ver",
        "panel_conductor.servicios",
        "panel_conductor.actualizar",
        "vehiculos.ver",  # Solo ver básico
    ],
}

# ============================================
# FUNCIONES DE VERIFICACIÓN
# ============================================

def check_wildcard_permission(permisos_usuario: List[str], codigo_requerido: str) -> bool:
    """
    Verifica si un código de permiso coincide con algún patrón wildcard.
    Ej: "clientes.*" coincide con "clientes.crear"
    """
    for permiso in permisos_usuario:
        if fnmatch.fnmatch(codigo_requerido, permiso):
            return True
    return False

def get_permisos_usuario(user: models.User, db: Session) -> List[str]:
    """
    Obtiene todos los permisos efectivos de un usuario.
    Orden de prioridad:
    1. Permisos del rol custom (si tiene)
    2. Permisos del rol base (enum)
    3. Overrides individuales (allow/deny)
    """
    permisos = set()
    
    # 1. Si tiene rol custom, usar permisos de ese rol
    if user.rol_custom_obj and user.rol_custom_obj.activo:
        for rp in user.rol_custom_obj.permissions:
            if rp.permission.activo:
                permisos.add(rp.permission.codigo)
    
    # 2. Si no tiene rol custom o es rol del sistema, usar mapeo base
    else:
        permisos_base = PERMISOS_POR_ROL.get(user.rol, [])
        for permiso in permisos_base:
            permisos.add(permiso)
    
    # 3. Aplicar overrides individuales
    for override in user.permisos_override:
        # Si expiró, ignorar
        if override.expires_at and override.expires_at < datetime.datetime.utcnow():
            continue
        
        if override.tipo == "allow":
            permisos.add(override.permission.codigo)
        elif override.tipo == "deny":
            permisos.discard(override.permission.codigo)
    
    return list(permisos)

def has_permission(user: models.User, codigo: str, db: Session) -> bool:
    """
    Verifica si un usuario tiene un permiso específico.
    Soporta wildcards (*).
    """
    # Admin con "admin.todo" tiene todos los permisos
    permisos = get_permisos_usuario(user, db)
    
    if "admin.todo" in permisos:
        return True
    
    return check_wildcard_permission(permisos, codigo)

def require_permission(codigo_permiso: str):
    """
    Dependency de FastAPI para requerir un permiso específico en un endpoint.
    Uso: @app.get("/ruta", dependencies=[Depends(require_permission("clientes.crear"))])
    """
    async def permission_checker(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if not has_permission(current_user, codigo_permiso, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere permiso: {codigo_permiso}"
            )
        return current_user
    return permission_checker

# ============================================
# INICIALIZACIÓN DE PERMISOS EN BD
# ============================================

def inicializar_permisos_sistema(db: Session):
    """
    Crea los permisos del sistema en la base de datos si no existen.
    Llama esto en el startup de la app.
    """
    for permiso_data in PERMISOS_SISTEMA:
        existing = db.query(models.Permission).filter(
            models.Permission.codigo == permiso_data["codigo"]
        ).first()
        
        if not existing:
            permiso = models.Permission(
                codigo=permiso_data["codigo"],
                nombre=permiso_data["nombre"],
                categoria=permiso_data["categoria"],
                es_sistema=True,
                activo=True
            )
            db.add(permiso)
            print(f"✅ Permiso creado: {permiso_data['codigo']}")
    
    db.commit()

def inicializar_roles_sistema(db: Session):
    """
    Crea los roles del sistema (admin, gerente, operador, conductor) con sus permisos.
    """
    roles_sistema = [
        {"codigo": "admin", "nombre": "Administrador", "rol_base": models.UserRole.ADMIN},
        {"codigo": "gerente", "nombre": "Gerente", "rol_base": models.UserRole.GERENTE},
        {"codigo": "operador", "nombre": "Operador", "rol_base": models.UserRole.OPERADOR},
        {"codigo": "conductor", "nombre": "Conductor", "rol_base": models.UserRole.CONDUCTOR},
    ]
    
    for rol_data in roles_sistema:
        existing = db.query(models.Role).filter(
            models.Role.codigo == rol_data["codigo"],
            models.Role.es_sistema == True
        ).first()
        
        if not existing:
            rol = models.Role(
                codigo=rol_data["codigo"],
                nombre=rol_data["nombre"],
                es_sistema=True,
                rol_base=rol_data["rol_base"],
                activo=True
            )
            db.add(rol)
            db.flush()  # Para obtener el ID
            
            # Asignar permisos según el mapeo
            permisos_codigos = PERMISOS_POR_ROL.get(rol_data["rol_base"], [])
            
            for codigo_permiso in permisos_codigos:
                # Expandir wildcards
                if "*" in codigo_permiso:
                    # Buscar todos los permisos que coincidan
                    permisos_match = db.query(models.Permission).filter(
                        models.Permission.codigo.like(codigo_permiso.replace("*", "%"))
                    ).all()
                    for p in permisos_match:
                        rp = models.RolePermission(role_id=rol.id, permission_id=p.id)
                        db.add(rp)
                else:
                    permiso = db.query(models.Permission).filter(
                        models.Permission.codigo == codigo_permiso
                    ).first()
                    if permiso:
                        rp = models.RolePermission(role_id=rol.id, permission_id=permiso.id)
                        db.add(rp)
            
            print(f"✅ Rol creado: {rol_data['codigo']} con permisos")
    
    db.commit()

# ============================================
# HELPERS PARA ENDPOINTS
# ============================================

def user_can(user: models.User, codigo: str, db: Session) -> bool:
    """
    Versión simple para usar en código (no como dependency).
    Ej: if user_can(current_user, "servicios.eliminar", db):
    """
    return has_permission(user, codigo, db)

def filter_query_by_permission(query, user: models.User, permiso_base: str, db: Session):
    """
    Filtra una query SQL según los permisos del usuario.
    Por ahora no aplica filtros (futuro: multi-tenant por empresa).
    """
    # TODO: Cuando implementemos multi-tenant, filtrar por empresa_id aquí
    return query