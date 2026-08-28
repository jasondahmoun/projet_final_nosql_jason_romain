from fastapi import APIRouter, Query

from db import db

router = APIRouter(prefix="/agg", tags=["agregations"])

FILTRE = {
    "$match": {
        "type_local": {"$in": ["Maison", "Appartement"]},
        "surface_reelle_bati": {"$gt": 9},
        "valeur_fonciere": {"$gt": 1000},
    }
}


@router.get("/prix-m2-commune")
def prix_m2_commune(limit: int = Query(10, le=100), min_ventes: int = 30):
    return list(
        db.mutations.aggregate(
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
                {"$project": {"_id": 0, "commune": 1, "n": 1, "median_m2": {"$round": ["$median_m2", 0]}}},
            ]
        )
    )


@router.get("/evolution-mensuelle")
def evolution_mensuelle(type_local: str | None = None):
    filtre = {"$match": dict(FILTRE["$match"], date_mutation={"$ne": None})}
    if type_local:
        filtre["$match"]["type_local"] = type_local
    return list(
        db.mutations.aggregate(
            [
                filtre,
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
def dans_rayon(lon: float = 3.8767, lat: float = 43.6108, rayon_m: int = 5000, limit: int = Query(500, le=2000)):
    return list(
        db.mutations.aggregate(
            [
                {
                    "$geoNear": {
                        "near": {"type": "Point", "coordinates": [lon, lat]},
                        "distanceField": "distance_m",
                        "maxDistance": rayon_m,
                        "spherical": True,
                        "query": {
                            "type_local": "Appartement",
                            "surface_reelle_bati": {"$gt": 9},
                            "valeur_fonciere": {"$gt": 1000},
                        },
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "nom_commune": 1,
                        "distance_m": {"$round": ["$distance_m", 0]},
                        "prix_m2": {"$round": [{"$divide": ["$valeur_fonciere", "$surface_reelle_bati"]}, 0]},
                        "lon": {"$arrayElemAt": ["$geo.coordinates", 0]},
                        "lat": {"$arrayElemAt": ["$geo.coordinates", 1]},
                    }
                },
                {"$limit": limit},
            ]
        )
    )
