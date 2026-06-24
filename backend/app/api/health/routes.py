from fastapi import APIRouter
from sqlalchemy import text
from app.db.database import engine

router = APIRouter()


@router.get("/db")
def test_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"message": "Database Connected"}