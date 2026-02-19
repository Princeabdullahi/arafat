import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is not provided (e.g., on a fresh Railway deploy),
# fall back to a local sqlite file so the app can start for development/testing.
if not DATABASE_URL:
	db_path = os.path.join(os.path.dirname(__file__), "arafat.db")
	DATABASE_URL = f"sqlite:///{db_path}"
	logging.warning("DATABASE_URL not set; using fallback SQLite at %s", DATABASE_URL)

# Use sqlite-specific connect args when appropriate
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite:") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args) if connect_args else create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()
