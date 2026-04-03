from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Matter(Base):
    """Case/matter workspace — lawyers save research, queries, docs per matter."""
    __tablename__ = "matters"

    id = Column(Integer, primary_key=True)
    name = Column(String(500), nullable=False)
    description = Column(Text)
    owner_email = Column(String(300), index=True)
    sector = Column(String(100))                    # legal / tax / maritime / compliance / etc.
    saved_queries = Column(JSON, default=list)       # [{query, answer, sources, date}]
    saved_laws = Column(JSON, default=list)          # [chapter refs]
    saved_judgments = Column(JSON, default=list)     # [judgment references]
    saved_documents = Column(JSON, default=list)     # [doc ids]
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
