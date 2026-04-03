from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class Law(Base):
    __tablename__ = "laws"

    id = Column(Integer, primary_key=True)
    chapter = Column(String(20), unique=True, index=True)   # e.g. "CAP. 9"
    title = Column(String(500), nullable=False)
    full_text = Column(Text)
    summary = Column(Text)
    source_url = Column(String(1000))
    last_amended = Column(DateTime)
    version_history = Column(JSON, default=list)            # [{date, changes}]
    subsidiary_legislation = Column(JSON, default=list)     # [chapter refs]
    related_cases = Column(JSON, default=list)              # [judgment ids]
    embedding = Column(Vector(384))
    scraped_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
