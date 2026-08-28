#!/usr/bin/env bash
set -euo pipefail

set -a; source .env; set +a

URI="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=${MONGO_DB}"

for q in q1 q2 q3; do
  docker compose exec -T mongo mongosh "$URI" --quiet --eval "$(cat "agg/$q.js")" > "web/mock/$q.json"
  python3 -c "import json,sys; d=json.load(open('web/mock/$q.json')); print('web/mock/$q.json : %d entrees' % len(d))"
done
