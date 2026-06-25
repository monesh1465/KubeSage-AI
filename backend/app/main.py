from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health.routes import router as health_router
from app.api.auth.routes import router as auth_router
from app.api.clusters.routes import router as cluster_router

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

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(cluster_router)


@app.get("/")
def root():
    return {
        "message": "KubeSage AI Backend Running"
    }