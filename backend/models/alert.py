from sqlalchemy import Column, String, DateTime, Integer, JSON, Boolean
from sqlalchemy.sql import func
from database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    email = Column(String(300), nullable=False, index=True)
    keywords = Column(JSON, default=list)
    sources = Column(JSON, default=list)                    # filter by source
    last_triggered = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
