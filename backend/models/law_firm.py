from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, Boolean
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class LawFirm(Base):
    __tablename__ = "law_firms"

    id = Column(Integer, primary_key=True)
    name = Column(String(500), nullable=False, index=True)
    website = Column(String(1000))
    email = Column(String(300))
    phone = Column(String(100))
    address = Column(Text)
    area = Column(String(200))                      # Valletta, Sliema, etc.
    practice_areas = Column(JSON, default=list)     # categorised
    lawyers = Column(JSON, default=list)            # [{name, role}]
    lawyer_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    source_url = Column(String(1000))
    embedding = Column(Vector(384))
    scraped_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
