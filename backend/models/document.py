from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class Document(Base):
    """Regulatory docs, guidance, news — everything that isn't a law or judgment."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    title = Column(String(1000), nullable=False)
    source = Column(String(100), index=True)                # FIAU / MFSA / MGA / NEWS / etc.
    doc_type = Column(String(100))                          # guidance / circular / news / gazette
    body = Column(String(100))                              # issuing body
    full_text = Column(Text)
    summary = Column(Text)
    published_at = Column(DateTime, index=True)
    source_url = Column(String(1000))
    pdf_url = Column(String(1000))
    laws_cited = Column(JSON, default=list)
    embedding = Column(Vector(384))
    scraped_at = Column(DateTime, server_default=func.now())
