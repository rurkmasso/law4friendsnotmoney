from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, Date
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class Judgment(Base):
    __tablename__ = "judgments"

    id = Column(Integer, primary_key=True)
    reference = Column(String(200), unique=True, index=True)
    court = Column(String(200), index=True)
    judge = Column(String(500), index=True)
    parties = Column(String(1000))
    plaintiff = Column(String(500))
    defendant = Column(String(500))
    date = Column(Date, index=True)
    full_text = Column(Text)
    summary = Column(Text)
    outcome = Column(String(100))                           # upheld / dismissed / etc.
    laws_cited = Column(JSON, default=list)                 # [chapter refs]
    cases_cited = Column(JSON, default=list)                # [reference refs]
    lawyers_appearing = Column(JSON, default=list)          # [lawyer ids]
    source_url = Column(String(1000))
    pdf_url = Column(String(1000))
    embedding = Column(Vector(384))
    scraped_at = Column(DateTime, server_default=func.now())
