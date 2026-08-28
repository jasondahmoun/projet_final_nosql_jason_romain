// db/03-indexes.js
// Trois index, pas dix - chacun sert une requête précise et démontrable.
// Pas d'index unique séparé sur id_mutation : _id EST id_mutation (voir
// 02-transform.js), l'unicité est donc déjà garantie par l'index _id_
// automatique, sans index redondant à maintenir.

// Sert la requête de la capture explain() avant/après (exigence n°5) :
// db.mutations.find({ code_postal: "34000" }), triée par date la plus récente.
db.mutations.createIndex({ code_postal: 1, date_mutation: -1 });

// Obligatoire pour $geoNear (Q3).
db.mutations.createIndex({ geo: "2dsphere" });

// Sert le filtre par commune de GET /mutations (le CRUD).
db.mutations.createIndex({ nom_commune: 1 });

printjson(db.mutations.getIndexes());
