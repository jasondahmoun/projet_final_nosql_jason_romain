// db/02-transform.js
// Regroupe les lignes brutes DVF par id_mutation (une vente peut s'étaler sur
// plusieurs lignes, une par lot/parcelle) et construit deux collections :
//   mutations  - une par vente, avec les lots imbriqués (lots[])
//   communes   - référentiel, une par commune, avec son centroïde
// Lancé par db/import.sh, ou à la main :
//   docker compose exec -T mongo mongosh "$URI" --quiet --file db/02-transform.js

const HABITABLE = { $in: ["$type_local", ["Maison", "Appartement"]] };

// Un lot par ligne brute peut porter jusqu'à 5 sous-lots (lot1_numero..lot5_numero).
// On construit ici le tableau des lots réellement présents sur CETTE ligne.
function paireLot(n) {
  const numeroChamp = "$lot" + n + "_numero";
  const surfaceChamp = "$lot" + n + "_surface_carrez";
  return {
    $cond: [
      { $and: [{ $ne: [numeroChamp, null] }, { $ne: [numeroChamp, ""] }] },
      {
        numero: { $convert: { input: numeroChamp, to: "int", onError: null, onNull: null } },
        surface_carrez: { $convert: { input: surfaceChamp, to: "double", onError: null, onNull: null } },
      },
      null,
    ],
  };
}

db.raw.aggregate([
  {
    $set: {
      lots_ligne: {
        $filter: {
          input: [paireLot(1), paireLot(2), paireLot(3), paireLot(4), paireLot(5)],
          as: "l",
          cond: { $ne: ["$$l", null] },
        },
      },
    },
  },
  {
    $group: {
      _id: "$id_mutation",
      date_mutation: { $first: { $convert: { input: "$date_mutation", to: "date", onError: null, onNull: null } } },
      valeur_fonciere: { $first: { $convert: { input: "$valeur_fonciere", to: "double", onError: null, onNull: null } } },
      nature_mutation: { $first: "$nature_mutation" },
      nom_commune: { $first: "$nom_commune" },
      // code_commune / code_postal sont des identifiants, pas des quantités :
      // mongoimport les infère en int32 par défaut sur ce CSV (colonne
      // numérique en apparence) - forcé en chaîne pour éviter le piège.
      code_commune: { $first: { $toString: "$code_commune" } },
      code_postal: { $first: { $toString: "$code_postal" } },
      types: { $addToSet: "$type_local" },
      surface_reelle_bati: {
        $sum: {
          $cond: [HABITABLE, { $convert: { input: "$surface_reelle_bati", to: "double", onError: 0, onNull: 0 } }, 0],
        },
      },
      nb_lignes: { $sum: 1 },
      nb_locaux: { $sum: { $cond: [HABITABLE, 1, 0] } },
      // lot1_numero..lot5_numero décrivent les lots au niveau de LA MUTATION,
      // pas de la ligne : le CSV les répète à l'identique sur chaque ligne
      // d'une même mutation. $first (pas $push) évite de dupliquer les lots
      // sur les mutations qui s'étalent sur plusieurs lignes.
      lots: { $first: "$lots_ligne" },
      lon: { $first: { $convert: { input: "$longitude", to: "double", onError: null, onNull: null } } },
      lat: { $first: { $convert: { input: "$latitude", to: "double", onError: null, onNull: null } } },
    },
  },
  { $set: { habitables: { $setIntersection: ["$types", ["Maison", "Appartement"]] } } },
  {
    $set: {
      type_local: {
        $switch: {
          branches: [
            { case: { $eq: [{ $size: "$habitables" }, 1] }, then: { $arrayElemAt: ["$habitables", 0] } },
            { case: { $gt: [{ $size: "$habitables" }, 1] }, then: "Mixte" },
          ],
          default: null,
        },
      },
      prix_m2: {
        $cond: [{ $gt: ["$surface_reelle_bati", 0] }, { $divide: ["$valeur_fonciere", "$surface_reelle_bati"] }, null],
      },
      geo: {
        $cond: [
          { $and: [{ $ne: ["$lon", null] }, { $ne: ["$lat", null] }] },
          { type: "Point", coordinates: ["$lon", "$lat"] },
          null,
        ],
      },
    },
  },
  { $unset: ["lon", "lat", "types", "habitables"] },
  { $out: "mutations" },
]);

db.mutations.aggregate([
  { $match: { code_commune: { $ne: null } } },
  {
    $group: {
      _id: "$code_commune",
      nom: { $first: "$nom_commune" },
      code_postal: { $first: "$code_postal" },
      nb_mutations: { $sum: 1 },
      lon: { $avg: { $arrayElemAt: ["$geo.coordinates", 0] } },
      lat: { $avg: { $arrayElemAt: ["$geo.coordinates", 1] } },
    },
  },
  {
    $set: {
      centroide: {
        $cond: [{ $ne: ["$lon", null] }, { type: "Point", coordinates: ["$lon", "$lat"] }, null],
      },
    },
  },
  { $unset: ["lon", "lat"] },
  { $out: "communes" },
]);

print("lignes brutes : " + db.raw.countDocuments());
print("mutations     : " + db.mutations.countDocuments());
print("communes      : " + db.communes.countDocuments());
print("mutations avec au moins un lot : " + db.mutations.countDocuments({ "lots.0": { $exists: true } }));
