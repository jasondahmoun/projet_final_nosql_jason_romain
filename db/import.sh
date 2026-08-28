#!/usr/bin/env bash
# db/import.sh - télécharge le CSV DVF Hérault 2024, l'importe brut, le
# transforme (regroupement par id_mutation, lots imbriqués, communes) et crée
# les index. À lancer depuis la racine du dépôt, une fois `docker compose up
# -d` fait.
set -euo pipefail

set -a; source .env; set +a

URL="https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/34.csv.gz"
URI="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=${MONGO_DB}"

echo "1) Téléchargement (si absent)"
[ -f dvf34.csv ] || { curl -L -o dvf34.csv.gz "$URL"; gunzip -kf dvf34.csv.gz; }
wc -l dvf34.csv   # attendu : 69652 (dont l'en-tête)

echo "2) Import brut dans raw"
debut=$(date +%s)
docker compose cp dvf34.csv mongo:/tmp/dvf34.csv
docker compose exec -T mongo mongoimport --uri "$URI" --collection raw \
  --type csv --headerline --drop --file /tmp/dvf34.csv
fin=$(date +%s)
echo "temps d'import : $((fin - debut)) s"

echo "3) Transformation (regroupement par id_mutation, lots imbriqués, communes)"
docker compose exec -T mongo mongosh "$URI" --quiet --file /dev/stdin < db/02-transform.js

echo "4) Index"
docker compose exec -T mongo mongosh "$URI" --quiet --file /dev/stdin < db/03-indexes.js

echo "terminé."
