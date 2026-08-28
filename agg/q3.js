print(JSON.stringify(db.mutations.aggregate([
  { $geoNear: {
      near: { type: "Point", coordinates: [3.8767, 43.6108] },
      distanceField: "distance_m",
      maxDistance: 5000,
      spherical: true,
      query: { nature_mutation: { $in: ["Vente", "Vente en l'état futur d'achèvement"] },
               type_local: "Appartement", surface_reelle_bati: { $gt: 9 },
               valeur_fonciere: { $gt: 1000 }, prix_m2: { $gt: 100, $lt: 20000 } }
  } },
  { $project: { _id: 0, nom_commune: 1,
      distance_m: { $round: ["$distance_m", 0] },
      prix_m2: { $round: [{ $divide: ["$valeur_fonciere", "$surface_reelle_bati"] }, 0] },
      lon: { $arrayElemAt: ["$geo.coordinates", 0] },
      lat: { $arrayElemAt: ["$geo.coordinates", 1] }
  } },
  { $limit: 500 }
]).toArray()))
