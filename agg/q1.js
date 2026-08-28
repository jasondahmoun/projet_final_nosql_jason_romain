const FILTRE = { $match: {
  type_local: { $in: ["Maison", "Appartement"] },
  surface_reelle_bati: { $gt: 9 },
  valeur_fonciere: { $gt: 1000 }
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
  { $project: { _id: 0, commune: 1, n: 1, median_m2: { $round: ["$median_m2", 0] } } }
]

print(JSON.stringify(db.mutations.aggregate([FILTRE, ...CALCUL]).toArray()))
