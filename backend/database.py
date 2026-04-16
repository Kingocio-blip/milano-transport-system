# ============================================
# MILANO - Database Configuration (OPTIMIZADO)
# ============================================

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# ============================================
# DATABASE CONFIGURATION
# ============================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# FIX: Detectar si es PostgreSQL (Render) o SQLite (local)
IS_POSTGRES = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")

# ============================================
# ENGINE CONFIGURATION (OPTIMIZADO)
# ============================================

# FIX: Configuración específica según el tipo de base de datos
if IS_POSTGRES:
    # PostgreSQL en Render - optimizado para conexiones cloud
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=5,                    # FIX: Conexiones mantenidas
        max_overflow=10,                # FIX: Conexiones adicionales bajo carga
        pool_timeout=30,              # FIX: Timeout de espera
        pool_recycle=1800,              # FIX: Reciclar conexiones cada 30 min
        pool_pre_ping=True,             # FIX: Verificar conexión antes de usar
        echo=False,                     # FIX: No loggear queries en producción
    )
    logger.info("✅ PostgreSQL engine configured (Render)")
else:
    # SQLite local - configuración simple
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # FIX: Permitir threads en SQLite
        echo=False,
    )
    logger.info("✅ SQLite engine configured (local)")

# ============================================
# SESSION CONFIGURATION
# ============================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # FIX: Mejor performance en API
)

# ============================================
# BASE CLASS
# ============================================

Base = declarative_base()

# ============================================
# DATABASE EVENTS (OPTIMIZACIÓN)
# ============================================

# FIX: Evento para loggear conexiones (debug)
@event.listens_for(engine, "connect")
def on_connect(dbapi_conn, connection_record):
    logger.debug("🔌 New database connection established")

@event.listens_for(engine, "checkout")
def on_checkout(dbapi_conn, connection_record, connection_proxy):
    logger.debug("📤 Database connection checked out from pool")

# ============================================
# DEPENDENCY (OPTIMIZADO)
# ============================================

def get_db():
    """
    Dependency para FastAPI que proporciona una sesión de DB.
    Maneja automáticamente rollback en caso de error.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()  # FIX: Auto-commit si no hay excepción
    except Exception as e:
        db.rollback()  # FIX: Rollback automático en error
        logger.error(f"❌ Database error, rolling back: {e}")
        raise
    finally:
        db.close()

# ============================================
# UTILITY FUNCTIONS (NUEVO)
# ============================================

def init_db():
    """Inicializa todas las tablas (usar en desarrollo)."""
    from models import Base  # Importar aquí para evitar circular
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")

def drop_db():
    """Elimina todas las tablas (usar con cuidado)."""
    from models import Base
    Base.metadata.drop_all(bind=engine)
    logger.info("⚠️ Database tables dropped")

def get_db_session():
    """
    Context manager para sesiones de DB fuera de FastAPI.
    Uso: with get_db_session() as db: ...
    """
    from contextlib import contextmanager
    
    @contextmanager
    def _session_scope():
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"❌ Session error: {e}")
            raise
        finally:
            session.close()
    
    return _session_scope()

# ============================================
# HEALTH CHECK (NUEVO)
# ============================================

def check_db_connection() -> bool:
    """Verifica si la conexión a la base de datos está activa."""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection check failed: {e}")
        return False