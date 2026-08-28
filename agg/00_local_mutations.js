const HABITABLE = { $in: ["$type_local", ["Maison", "Appartement"]] };

db.raw.aggregate([
  { $group: {
      _id: "$id_mutation",
      date_mutation: { $first: { $convert: { input: "$date_mutation", to: "date", onError: null, onNull: null } } },
      valeur_fonciere: { $first: { $convert: { input: "$valeur_fonciere", to: "double", onError: null, onNull: null } } },
      nature_mutation: { $first: "$nature_mutation" },
      nom_commune: { $first: "$nom_commune" },
      code_commune: { $first: "$code_commune" },
      code_postal: { $first: "$code_postal" },
      types: { $addToSet: "$type_local" },
      surface_reelle_bati: { $sum: { $cond: [ HABITABLE,
        { $convert: { input: "$surface_reelle_bati", to: "double", onError: 0, onNull: 0 } }, 0 ] } },
      nb_lignes: { $sum: 1 },
      nb_locaux: { $sum: { $cond: [ HABITABLE, 1, 0 ] } },
      lon: { $first: { $convert: { input: "$longitude", to: "double", onError: null, onNull: null } } },
      lat: { $first: { $convert: { input: "$latitude", to: "double", onError: null, onNull: null } } }
  } },
  { $set: { habitables: { $setIntersection: ["$types", ["Maison", "Appartement"]] } } },
  { $set: {
      type_local: { $switch: { branches: [
          { case: { $eq: [{ $size: "$habitables" }, 1] }, then: { $arrayElemAt: ["$habitables", 0] } },
          { case: { $gt: [{ $size: "$habitables" }, 1] }, then: "Mixte" }
        ], default: null } },
      prix_m2: { $cond: [ { $gt: ["$surface_reelle_bati", 0] },
                          { $divide: ["$valeur_fonciere", "$surface_reelle_bati"] }, null ] },
      geo: { $cond: [ { $and: [{ $ne: ["$lon", null] }, { $ne: ["$lat", null] }] },
                      { type: "Point", coordinates: ["$lon", "$lat"] }, null ] }
  } },
  { $unset: ["lon", "lat", "types", "habitables"] },
  { $out: "mutations" }
]);

db.mutations.aggregate([
  { $match: { code_commune: { $ne: null } } },
  { $group: {
      _id: "$code_commune",
      nom: { $first: "$nom_commune" },
      code_postal: { $first: "$code_postal" },
      nb_mutations: { $sum: 1 },
      lon: { $avg: { $arrayElemAt: ["$geo.coordinates", 0] } },
      lat: { $avg: { $arrayElemAt: ["$geo.coordinates", 1] } }
  } },
  { $set: { centroide: { $cond: [ { $ne: ["$lon", null] },
                                  { type: "Point", coordinates: ["$lon", "$lat"] }, null ] } } },
  { $unset: ["lon", "lat"] },
  { $out: "communes" }
]);

print("lignes brutes : " + db.raw.countDocuments());
print("mutations     : " + db.mutations.countDocuments());
print("communes      : " + db.communes.countDocuments());
