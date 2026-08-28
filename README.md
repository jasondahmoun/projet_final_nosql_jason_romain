# Prix au m² dans l'Hérault

Back-end MongoDB + API REST + front minimal, sur les mutations immobilières
réelles de l'Hérault (DVF 2024).

Projet final MIA4 · IPSSI Montpellier · binôme **jasondahmoun** et **r.pintre**.

## Les trois questions métier

1. Quelles sont les 10 communes de l'Hérault où le m² s'est vendu le plus cher en 2024, parmi celles ayant enregistré au moins 30 ventes ?
2. Comment le prix moyen au m² a-t-il évolué mois par mois en 2024, séparément pour les maisons et pour les appartements ?
3. Quels appartements se sont vendus dans un rayon de 5 km autour du centre de Montpellier, et à quel prix au m² ?

Réponses et interprétations : [`rapport/RAPPORT.md`](rapport/RAPPORT.md).

## Données

DVF 2024, département 34 — <https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/34.csv.gz>
**69 651 lignes** → **29 565 mutations** → **340 communes**. Non versionnées, `db/import.sh` les télécharge.

## Installation

```bash
cp .env.example .env      # renseigner les deux mots de passe
docker compose up -d
bash db/import.sh         # télécharge, importe, transforme, indexe

curl http://localhost:8000/health    # {"status":"ok","mutations":29565}
open http://localhost:3000
```

Opérationnel en **21 s** depuis un volume vide. Si le port 27017 est déjà pris
par un conteneur des TP : `docker stop <nom>`.

## Collections

**`mutations`** (29 565) — `_id` = `id_mutation`, unicité par construction.
Les lots sont **imbriqués** dans `lots[]` : le CSV éclate une vente sur jusqu'à
329 lignes, et sans regroupement les prix sont faux d'un **facteur 3,6**.

```js
{ _id: "2024-403665", date_mutation: ISODate("2024-08-14"),
  valeur_fonciere: 104500, nature_mutation: "Vente",
  nom_commune: "Sète", code_commune: "34301", code_postal: "34200",
  type_local: "Appartement", surface_reelle_bati: 29, prix_m2: 3603.45,
  lots: [ { numero: 146, surface_carrez: 28.6 } ],
  geo: { type: "Point", coordinates: [3.699835, 43.411157] } }
```

**`communes`** (340) — **référencée**, pas imbriquée : jusqu'à 4 218 mutations
par commune, cycle de vie indépendant. `$lookup` sur `code_commune` → `_id`.

## Index

| Index | Requête servie |
|---|---|
| `{ code_postal: 1, date_mutation: -1 }` | filtrage par secteur, tri par date (Q1, Q2) |
| `{ geo: "2dsphere" }` | `$geoNear` de Q3 — obligatoire, sans lui la requête échoue |
| `{ nom_commune: 1 }` | `GET /mutations?commune=…` |

Sur `find({ code_postal: "34000" })` : `COLLSCAN` 29 565 documents examinés →
`FETCH ← IXSCAN` 1 933 examinés pour 1 933 rendus. Ratio 15,3 → **1,0**.
Captures dans `rapport/captures/`.

## Routes

| | | |
|---|---|---|
| `GET` | `/health` | état de l'API et de la base |
| `GET` | `/mutations` | `skip`, `limit` (≤ 100), `commune` |
| `GET` | `/mutations/{id}` | · `404` |
| `POST` | `/mutations` | `201` · `409` · `422` |
| `PUT` | `/mutations/{id}` | `404` · `400` |
| `DELETE` | `/mutations/{id}` | `204` · `404` |
| `GET` | `/agg/prix-m2-commune` | `limit`, `min_ventes` |
| `GET` | `/agg/evolution-mensuelle` | `type_local` |
| `GET` | `/agg/dans-rayon` | `lon`, `lat`, `rayon_m`, `limit` |

Détail : [`docs/API.md`](docs/API.md) · doc interactive : <http://localhost:8000/docs>

## Sécurité

Utilisateur applicatif `readWrite` sur la seule base `immo`, jamais `root`.
`.env` ignoré par git, `.env.example` seul versionné. CORS restreint au front.
Entrées validées par Pydantic.

## Répartition du travail

| Périmètre | Membre |
|---|---|
| Docker, import, transformation, modélisation, index et `explain()`, CRUD, sécurité | **r.pintre** |
| Questions métier, pipelines d'agrégation, routes `/agg`, front, rapport | **jasondahmoun** |
