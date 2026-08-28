# Contrat d'API

Base : `http://localhost:8000`

## CRUD — `/mutations`

| Méthode | Route | Paramètres | Réponse |
|---|---|---|---|
| GET | `/mutations` | `skip=0`, `limit=20` (max 100), `commune` | `{ total, skip, limit, items[] }` |
| GET | `/mutations/{id_mutation}` | — | document, ou `404` |
| POST | `/mutations` | corps `MutationIn` | `201` + document, `409` si l'id existe, `422` si invalide |
| PUT | `/mutations/{id_mutation}` | corps `MutationPatch` | document modifié, `404`, `400` si corps vide |
| DELETE | `/mutations/{id_mutation}` | — | `204`, ou `404` |

`MutationIn` : `id_mutation`, `nom_commune`, `code_commune`, `code_postal?`, `type_local?`, `valeur_fonciere > 0`, `surface_reelle_bati > 0`

## Agrégations — `/agg`

### `GET /agg/prix-m2-commune?limit=10&min_ventes=30`

Un `$lookup` vers `communes` ramène le centroïde de chaque commune, après le `$limit`
pour que la jointure ne porte que sur les documents effectivement retournés.

```json
[{ "commune": "La Grande-Motte", "median_m2": 5400, "n": 664,
   "centroide": { "type": "Point", "coordinates": [4.0776, 43.5615] } }]
```

### `GET /agg/evolution-mensuelle?type_local=Appartement`

```json
[{ "mois": "2024-03", "type": "Appartement", "prix_m2_moyen": 3240, "n": 512 }]
```

### `GET /agg/dans-rayon?lon=3.8767&lat=43.6108&rayon_m=5000&limit=500`

```json
[{ "nom_commune": "Montpellier", "distance_m": 820, "prix_m2": 3980, "lon": 3.881, "lat": 43.615 }]
```

## Santé

`GET /health` → `{ "status": "ok", "mutations": 29565 }`
