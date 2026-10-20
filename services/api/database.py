"""The Python API uses the generated synchronous Prisma client.
Prisma owns the educational schema; Alembic owns only ingestion-region tables.
Generate this client with: python -m prisma generate --generator py
"""
from prisma import Prisma

prisma = Prisma()

def connect_db():
    if not prisma.is_connected():
        prisma.connect()

def disconnect_db():
    if prisma.is_connected():
        prisma.disconnect()
