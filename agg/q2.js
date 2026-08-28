const FILTRE = { $match: {
  type_local: { $in: ["Maison", "Appartement"] },
  surface_reelle_bati: { $gt: 9 },
  valeur_fonciere: { $gt: 1000 },
  date_mutation: { $ne: null }
} }

print(JSON.stringify(db.mutations.aggregate([
  FILTRE,
  { $group: {
      _id: { mois: { $dateToString: { format: "%Y-%m", date: "$date_mutation" } }, type: "$type_local" },
      prix_m2_moyen: { $avg: { $divide: ["$valeur_fonciere", "$surface_reelle_bati"] } },
      n: { $sum: 1 }
  } },
  { $sort: { "_id.mois": 1 } },
  { $project: { _id: 0, mois: "$_id.mois", type: "$_id.type", n: 1,
                prix_m2_moyen: { $round: ["$prix_m2_moyen", 0] } } }
]).toArray()))
