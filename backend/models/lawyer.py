from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, Boolean
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class Lawyer(Base):
    __tablename__ = "lawyers"

    id = Column(Integer, primary_key=True)
    warrant_number = Column(String(50), unique=True, index=True)
    full_name = Column(String(300), nullable=False, index=True)
    profession = Column(String(100))                        # Advocate / Legal Procurator / Notary
    firm = Column(String(300))
    email = Column(String(300))
    phone = Column(String(100))
    address = Column(Text)
    practice_areas = Column(JSON, default=list)             # derived from cases
    case_count = Column(Integer, default=0)
    courts_active_in = Column(JSON, default=list)
    first_case_date = Column(DateTime)
    last_case_date = Column(DateTime)
    cases = Column(JSON, default=list)                      # [judgment ids]
    is_active = Column(Boolean, default=True)
    source_url = Column(String(1000))
    embedding = Column(Vector(384))
    scraped_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
