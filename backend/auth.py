# ============================================
# MILANO - Authentication Module (JWT ROBUSTO con Refresh Tokens)
# ============================================

from datetime import datetime, timedelta
from typing import Optional, Union, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
import logging
import secrets
import hashlib

import models
from database import get_db

# Configure logging
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

# TIEMPOS DE EXPIRACIÓN (JWT ROBUSTO)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))  # 15 minutos
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 días

# Password context con configuración segura
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scheme_name="JWT"
)

# ============================================
# PASSWORD UTILITIES
# ============================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"❌ Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Genera un hash seguro de una contraseña."""
    return pwd_context.hash(password)

def check_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """Valida la fortaleza de una contraseña."""
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
    """Autentica un usuario verificando username y password."""
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
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    logger.info(f"✅ User authenticated: {username}")
    return user

# ============================================
# TOKEN UTILITIES (JWT ROBUSTO)
# ============================================

def generate_token_hash(token: str) -> str:
    """Genera un hash del token para almacenar en BD (no guardamos el token plano)."""
    return hashlib.sha256(token.encode()).hexdigest()

def create_access_token(data: dict) -> str:
    """
    Crea un access token JWT (corto: 15 minutos).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: int, db: Session, device_info: Optional[str] = None) -> str:
    """
    Crea un refresh token JWT (largo: 7 días) y lo guarda en BD.
    """
    # Generar token aleatorio seguro
    token_plain = secrets.token_urlsafe(32)
    token_hash = generate_token_hash(token_plain)
    
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Guardar en BD
    refresh_token = models.RefreshToken(
        token=token_hash,
        user_id=user_id,
        expires_at=expires_at,
        device_info=device_info
    )
    db.add(refresh_token)
    db.commit()
    
    # Retornar el token plano (solo se muestra una vez)
    return token_plain

def verify_refresh_token(token: str, db: Session) -> Optional[models.User]:
    """
    Verifica un refresh token. Retorna el usuario si es válido, None si no.
    """
    token_hash = generate_token_hash(token)
    
    refresh_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == token_hash,
        models.RefreshToken.revoked_at.is_(None),
        models.RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if not refresh_token:
        logger.warning("⚠️ Invalid or expired refresh token")
        return None
    
    return refresh_token.user

def revoke_refresh_token(token: str, db: Session) -> bool:
    """
    Revoca un refresh token (logout).
    """
    token_hash = generate_token_hash(token)
    
    refresh_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == token_hash
    ).first()
    
    if refresh_token:
        refresh_token.revoked_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ Refresh token revoked for user {refresh_token.user_id}")
        return True
    
    return False

def revoke_all_user_tokens(user_id: int, db: Session) -> int:
    """
    Revoca TODOS los refresh tokens de un usuario (logout global).
    Útil si hay sospecha de cuenta comprometida.
    """
    tokens = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked_at.is_(None)
    ).all()
    
    count = 0
    for token in tokens:
        token.revoked_at = datetime.utcnow()
        count += 1
    
    db.commit()
    logger.info(f"✅ Revoked {count} refresh tokens for user {user_id}")
    return count

# ============================================
# FASTAPI DEPENDENCIES
# ============================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Obtiene el usuario actual desde el access token."""
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
        
        # Verificar que es access token (no refresh)
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
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
    """Garantiza que el usuario está activo."""
    if not current_user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return current_user

async def get_admin_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """Requiere rol de administrador."""
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user

# ============================================
# PASSWORD RESET
# ============================================

def create_password_reset_token(user_id: int) -> str:
    """Crea un token para reseteo de contraseña (expira en 1 hora)."""
    expires = timedelta(hours=1)
    return create_access_token(
        data={"sub": str(user_id), "type": "reset"},
        expires_delta=expires
    )

def verify_password_reset_token(token: str) -> Optional[int]:
    """Verifica un token de reseteo de contraseña."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "reset":
            return None
        
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
        
    except JWTError:
        return None