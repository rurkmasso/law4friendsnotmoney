from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from pgvector.sqlalchemy import Vector
from database import Base
import datetime


class IGamingOperator(Base):
    __tablename__ = "igaming_operators"

    id = Column(String, primary_key=True)  # licence_number or slug
    company_name = Column(String, nullable=False, index=True)
    licence_number = Column(String, unique=True, index=True)
    licence_type = Column(String, default="B2C Gaming Service")  # B2C / B2B
    status = Column(String, default="Active")  # Active / Suspended / Revoked
    country = Column(String, default="Malta")
    source_url = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    embedding = Column(Vector(384))
