import os


os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
os.environ.setdefault("EODHD_API_KEY", "test-key")
os.environ.setdefault("OS_API_KEY", "test-key")
