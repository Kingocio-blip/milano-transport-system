# ============================================
# MILANO - Database Configuration (OPTIMIZADO)
# ============================================

from sqlalchemy import create_engine, text
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

IS_POSTGRES = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")

# ============================================
# ENGINE CONFIGURATION
# ============================================

if IS_POSTGRES:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
    )
    logger.info("✅ PostgreSQL engine configured (Render)")
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
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
    expire_on_commit=False,
)

# ============================================
# BASE CLASS
# ============================================

Base = declarative_base()

# ============================================
# DEPENDENCY
# ============================================

def get_db():
    """
    Dependency para FastAPI que proporciona una sesión de DB.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database error, rolling back: {e}")
        raise
    finally:
        db.close()

# ============================================
# UTILITY FUNCTIONS
# ============================================

def init_db():
    """Inicializa todas las tablas."""
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")

def drop_db():
    """Elimina todas las tablas."""
    Base.metadata.drop_all(bind=engine)
    logger.info("⚠️ Database tables dropped")

# ============================================
# HEALTH CHECK (FIXED)
# ============================================

def check_db_connection() -> bool:
    """Verifica si la conexión a la base de datos está activa."""
    try:
        with engine.connect() as conn:
            # FIX: Usar text() para SQLAlchemy 2.x
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"❌ Database connection check failed: {e}")
        return False