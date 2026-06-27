from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health.routes import router as health_router
from app.api.auth.routes import router as auth_router
from app.api.clusters.routes import router as cluster_router
from app.api.ai.routes import router as ai_router

from app.db.database import engine
from app.db.base import Base


app = FastAPI(
    title="KubeSage AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Database migration: clean up duplicates in ai_analyses and add a unique constraint
from sqlalchemy import text
with engine.connect() as conn:
    try:
        # Delete duplicate reports, keeping the latest one (highest ID) for each investigation_id
        conn.execute(text("""
            DELETE FROM ai_analyses
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM ai_analyses
                GROUP BY investigation_id
            );
        """))
        conn.commit()
        print("[Database] Successfully cleaned up duplicate ai_analyses rows.")
    except Exception as e:
        print("[Database] Warning during ai_analyses duplicate cleanup:", e)

    try:
        # Enforce UNIQUE constraint on investigation_id
        conn.execute(text("ALTER TABLE ai_analyses ADD CONSTRAINT uq_ai_analyses_investigation_id UNIQUE (investigation_id);"))
        conn.commit()
        print("[Database] Successfully added UNIQUE constraint to ai_analyses.investigation_id.")
    except Exception as e:
        # Might already exist or fail on sqlite/different DB engines — this is expected on subsequent runs
        pass


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(cluster_router)
app.include_router(ai_router)


@app.get("/")
def root():
    return {
        "message": "KubeSage AI Backend Running"
    }