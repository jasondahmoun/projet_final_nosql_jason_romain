const FILTRE = { $match: {
  nature_mutation: { $in: ["Vente", "Vente en l'état futur d'achèvement"] },
  type_local: { $in: ["Maison", "Appartement"] },
  surface_reelle_bati: { $gt: 9 },
  valeur_fonciere: { $gt: 1000 },
  prix_m2: { $gt: 100, $lt: 20000 }
} }

const CALCUL = [
  { $group: {
      _id: "$code_commune",
      commune: { $first: "$nom_commune" },
      median_m2: { $median: { input: { $divide: ["$valeur_fonciere", "$surface_reelle_bati"] }, method: "approximate" } },
      n: { $sum: 1 }
  } },
  { $match: { n: { $gte: 30 } } },
  { $sort: { median_m2: -1 } },
  { $limit: 10 },
  { $lookup: { from: "communes", localField: "_id", foreignField: "_id", as: "ref" } },
  { $unwind: { path: "$ref", preserveNullAndEmptyArrays: true } },
  { $project: { _id: 0, commune: 1, n: 1,
                median_m2: { $round: ["$median_m2", 0] },
                centroide: "$ref.centroide" } }
]

print(JSON.stringify(db.mutations.aggregate([FILTRE, ...CALCUL]).toArray()))
