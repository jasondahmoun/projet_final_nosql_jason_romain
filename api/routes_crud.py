"""routes_crud.py - CRUD complet sur la collection mutations.

_id est l'id_mutation (chaîne) : l'unicité est garantie par construction, pas
besoin d'index unique séparé (voir db/03-indexes.js).
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from db import db

router = APIRouter(prefix="/mutations", tags=["mutations"])


class MutationIn(BaseModel):
    id_mutation: str
    date_mutation: datetime | None = None
    nom_commune: str
    code_commune: str
    code_postal: str | None = None
    type_local: str | None = None
    valeur_fonciere: float = Field(gt=0)
    surface_reelle_bati: float = Field(gt=0)


class MutationPatch(BaseModel):
    valeur_fonciere: float | None = Field(default=None, gt=0)
    surface_reelle_bati: float | None = Field(default=None, gt=0)
    type_local: str | None = None


@router.get("")
def lister(skip: int = 0, limit: int = Query(20, le=100), commune: str | None = None):
    """Liste paginée, filtrable par commune - la requête la plus fréquente de l'API."""
    filtre = {"nom_commune": commune} if commune else {}
    return {
        "total": db.mutations.count_documents(filtre),
        "skip": skip,
        "limit": limit,
        "items": list(db.mutations.find(filtre, {"geo": 0}).skip(skip).limit(limit)),
    }


@router.get("/{id_mutation}")
def lire(id_mutation: str):
    doc = db.mutations.find_one({"_id": id_mutation})
    if doc is None:
        raise HTTPException(404, "mutation introuvable")
    return doc


@router.post("", status_code=201)
def creer(m: MutationIn):
    doc = m.model_dump()
    doc["_id"] = doc.pop("id_mutation")
    doc["prix_m2"] = doc["valeur_fonciere"] / doc["surface_reelle_bati"]
    if db.mutations.find_one({"_id": doc["_id"]}) is not None:
        raise HTTPException(409, "id_mutation déjà présent")
    db.mutations.insert_one(doc)
    return doc


@router.put("/{id_mutation}")
def modifier(id_mutation: str, patch: MutationPatch):
    champs = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not champs:
        raise HTTPException(400, "aucun champ à modifier")
    if db.mutations.update_one({"_id": id_mutation}, {"$set": champs}).matched_count == 0:
        raise HTTPException(404, "mutation introuvable")
    if "valeur_fonciere" in champs or "surface_reelle_bati" in champs:
        doc = db.mutations.find_one({"_id": id_mutation})
        surface = doc.get("surface_reelle_bati") or 0
        prix_m2 = doc["valeur_fonciere"] / surface if surface > 0 else None
        db.mutations.update_one({"_id": id_mutation}, {"$set": {"prix_m2": prix_m2}})
        doc["prix_m2"] = prix_m2
        return doc
    return db.mutations.find_one({"_id": id_mutation})


@router.delete("/{id_mutation}", status_code=204)
def supprimer(id_mutation: str):
    if db.mutations.delete_one({"_id": id_mutation}).deleted_count == 0:
        raise HTTPException(404, "mutation introuvable")
