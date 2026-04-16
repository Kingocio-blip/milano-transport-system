# ============================================
# MILANO - Authentication Module (OPTIMIZADO)
# ============================================

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
import logging

import models
from database import get_db

# Configure logging
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION (OPTIMIZADO)
# ============================================

# FIX: Leer SECRET_KEY de variable de entorno
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 horas por defecto

# FIX: Password context con configuración segura
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # FIX: Cost factor de bcrypt (seguridad vs performance)
)

# FIX: OAuth2 scheme con URL correcta
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",  # FIX: Coincide con endpoint en main.py
    scheme_name="JWT"
)

# ============================================
# PASSWORD UTILITIES
# ============================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"❌ Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """
    Genera un hash seguro de una contraseña.
    """
    return pwd_context.hash(password)

def check_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    FIX: Valida la fortaleza de una contraseña.
    Retorna (es_valida, mensaje_error).
    """
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    if not any(c.isupper() for c in password):
        return False, "La contraseña debe tener al menos una mayúscula"
    if not any(c.islower() for c in password):
        return False, "La contraseña debe tener al menos una minúscula"
    if not any(c.isdigit() for c in password):
        return False, "La contraseña debe tener al menos un número"
    return True, None

# ============================================
# USER AUTHENTICATION
# ============================================

def authenticate_user(
    db: Session, 
    username: str, 
    password: str
) -> Union[models.User, bool]:
    """
    Autentica un usuario verificando username y password.
    Retorna el usuario si es válido, False si no.
    """
    # FIX: Buscar usuario sin distinguir mayúsculas/minúsculas
    user = db.query(models.User).filter(
        models.User.username.ilike(username)
    ).first()
    
    if not user:
        logger.warning(f"⚠️ Login attempt for non-existent user: {username}")
        return False
    
    if not user.activo:
        logger.warning(f"⚠️ Login attempt for inactive user: {username}")
        return False
    
    if not verify_password(password, user.hashed_password):
        logger.warning(f"⚠️ Failed login attempt for user: {username}")
        return False
    
    # FIX: Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    logger.info(f"✅ User authenticated: {username}")
    return user

# ============================================
# JWT TOKEN UTILITIES
# ============================================

def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Crea un JWT access token.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # FIX: Issued at time
        "type": "access"  # FIX: Token type
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """
    FIX: Decodifica y valida un token JWT.
    Retorna el payload o None si es inválido.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"⚠️ Token decode error: {e}")
        return None

def get_token_expiry(token: str) -> Optional[datetime]:
    """
    FIX: Obtiene la fecha de expiración de un token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            return datetime.fromtimestamp(exp)
    except JWTError:
        pass
    return None

# ============================================
# FASTAPI DEPENDENCIES
# ============================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    FIX: Dependency para obtener el usuario actual desde el token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise credentials_exception
        
        # FIX: Verificar tipo de token
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Buscar usuario
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if user is None:
        raise credentials_exception
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    FIX: Dependency que garantiza que el usuario está activo.
    """
    if not current_user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return current_user

async def get_admin_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    FIX: Dependency que requiere rol de administrador.
    """
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user

# ============================================
# PASSWORD RESET (NUEVO)
# ============================================

def create_password_reset_token(user_id: int) -> str:
    """
    Crea un token para reseteo de contraseña (expira en 1 hora).
    """
    expires = timedelta(hours=1)
    return create_access_token(
        data={"sub": str(user_id), "type": "reset"},
        expires_delta=expires
    )

def verify_password_reset_token(token: str) -> Optional[int]:
    """
    Verifica un token de reseteo de contraseña.
    Retorna el user_id si es válido.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verificar que es un token de reset
        if payload.get("type") != "reset":
            return None
        
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
        
    except JWTError:
        return None