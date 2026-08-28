#!/usr/bin/env bash
# db/import.sh - telecharge le CSV DVF Herault 2024 et l'importe brut dans la
# collection raw. A lancer depuis la racine du depot, une fois `docker compose
# up -d` fait. Le regroupement par id_mutation (db/02-transform.js) et les
# index (db/03-indexes.js) s'enchainent juste apres - voir le README.
set -euo pipefail

set -a; source .env; set +a

URL="https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/34.csv.gz"
URI="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=${MONGO_DB}"

echo "1) Telechargement (si absent)"
[ -f dvf34.csv ] || { curl -L -o dvf34.csv.gz "$URL"; gunzip -kf dvf34.csv.gz; }
wc -l dvf34.csv   # attendu : 69652 (dont l'en-tete)

echo "2) Import brut dans raw"
debut=$(date +%s)
docker compose cp dvf34.csv mongo:/tmp/dvf34.csv
docker compose exec -T mongo mongoimport --uri "$URI" --collection raw \
  --type csv --headerline --drop --file /tmp/dvf34.csv
fin=$(date +%s)
echo "temps d'import : $((fin - debut)) s"
