"""main.py - point d'entrée de l'API.
Câblage uniquement (app, CORS, /health, montage des routers). La logique
métier vit dans routes_crud.py (CRUD) et routes_agg.py (agrégations)."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import db
from routes_agg import router as agg_router
from routes_crud import router as crud_router

app = FastAPI(title="Prix au m² dans l'Hérault - API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(crud_router)
app.include_router(agg_router)


@app.get("/health")
def health():
    db.command("ping")
    return {"status": "ok", "mutations": db.mutations.estimated_document_count()}
