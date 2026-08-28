"""Routes d'agregation du sujet DVF Herault (voie 2).

Pour brancher ce module, une seule ligne a ajouter dans api/main.py :

    import routes_agg
    app.include_router(routes_agg.router)

Le module est autonome : il ouvre son propre client plutot que d'importer
celui de main.py, ce qui creerait un import circulaire.
"""

import os

from fastapi import APIRouter, Query
from pymongo import MongoClient

router = APIRouter(prefix="/agg", tags=["agregations"])

client = MongoClient(os.environ["MONGO_URI"])
mutations = client[os.environ.get("MONGO_DB", "immo")]["mutations"]

VENTES = ["Vente", "Vente en l'état futur d'achèvement"]

FILTRE = {
    "$match": {
        "nature_mutation": {"$in": VENTES},
        "type_local": {"$in": ["Maison", "Appartement"]},
        "surface_reelle_bati": {"$gt": 9},
        "valeur_fonciere": {"$gt": 1000},
        "prix_m2": {"$gt": 100, "$lt": 20000},
    }
}


@router.get("/prix-m2-commune")
def prix_m2_commune(limit: int = Query(10, ge=1, le=100), min_ventes: int = Query(30, ge=1)):
    return list(
        mutations.aggregate(
            [
                FILTRE,
                {
                    "$group": {
                        "_id": "$code_commune",
                        "commune": {"$first": "$nom_commune"},
                        "median_m2": {
                            "$median": {
                                "input": {"$divide": ["$valeur_fonciere", "$surface_reelle_bati"]},
                                "method": "approximate",
                            }
                        },
                        "n": {"$sum": 1},
                    }
                },
                {"$match": {"n": {"$gte": min_ventes}}},
                {"$sort": {"median_m2": -1}},
                {"$limit": limit},
                {"$lookup": {"from": "communes", "localField": "_id", "foreignField": "_id", "as": "ref"}},
                {"$unwind": {"path": "$ref", "preserveNullAndEmptyArrays": True}},
                {
                    "$project": {
                        "_id": 0,
                        "commune": 1,
                        "n": 1,
                        "median_m2": {"$round": ["$median_m2", 0]},
                        "centroide": "$ref.centroide",
                    }
                },
            ]
        )
    )


@router.get("/evolution-mensuelle")
def evolution_mensuelle(type_local: str | None = None):
    match = dict(FILTRE["$match"], date_mutation={"$ne": None})
    if type_local:
        match["type_local"] = type_local
    return list(
        mutations.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": {
                            "mois": {"$dateToString": {"format": "%Y-%m", "date": "$date_mutation"}},
                            "type": "$type_local",
                        },
                        "prix_m2_moyen": {"$avg": {"$divide": ["$valeur_fonciere", "$surface_reelle_bati"]}},
                        "n": {"$sum": 1},
                    }
                },
                {"$sort": {"_id.mois": 1}},
                {
                    "$project": {
                        "_id": 0,
                        "mois": "$_id.mois",
                        "type": "$_id.type",
                        "n": 1,
                        "prix_m2_moyen": {"$round": ["$prix_m2_moyen", 0]},
                    }
                },
            ]
        )
    )


@router.get("/dans-rayon")
def dans_rayon(
    lon: float = 3.8767,
    lat: float = 43.6108,
    rayon_m: int = Query(5000, ge=100, le=50000),
    limit: int = Query(4000, ge=1, le=10000),
):
    query = dict(FILTRE["$match"], type_local="Appartement")
    return list(
        mutations.aggregate(
            [
                {
                    "$geoNear": {
                        "near": {"type": "Point", "coordinates": [lon, lat]},
                        "distanceField": "distance_m",
                        "maxDistance": rayon_m,
                        "spherical": True,
                        "query": query,
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "nom_commune": 1,
                        "distance_m": {"$round": ["$distance_m", 0]},
                        "prix_m2": {"$round": ["$prix_m2", 0]},
                        "lon": {"$arrayElemAt": ["$geo.coordinates", 0]},
                        "lat": {"$arrayElemAt": ["$geo.coordinates", 1]},
                    }
                },
                {"$limit": limit},
            ]
        )
    )
