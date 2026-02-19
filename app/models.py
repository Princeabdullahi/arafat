from sqlalchemy import Column, Integer, String, Float, Boolean
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    phone = Column(String, unique=True, index=True)
    email = Column(String, unique=True)
    password = Column(String)
    pin = Column(String)
    balance = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
