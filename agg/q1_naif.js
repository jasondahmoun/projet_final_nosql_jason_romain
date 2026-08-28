const COMMUNE = { $in: [34172, "34172"] };

const naif = db.raw.aggregate([
  { $match: { code_commune: COMMUNE } },
  { $group: { _id: "$code_commune",
              commune: { $first: "$nom_commune" },
              prix_m2_moyen: { $avg: { $divide: [
                { $convert: { input: "$valeur_fonciere", to: "double", onError: null, onNull: null } },
                { $convert: { input: "$surface_reelle_bati", to: "double", onError: null, onNull: null } } ] } },
              n: { $sum: 1 } } }
]).toArray()[0];

const correct = db.mutations.aggregate([
  { $match: { code_commune: COMMUNE,
              type_local: { $in: ["Maison", "Appartement"] },
              surface_reelle_bati: { $gt: 9 },
              valeur_fonciere: { $gt: 1000 } } },
  { $group: { _id: "$code_commune",
              commune: { $first: "$nom_commune" },
              prix_m2_moyen: { $avg: "$prix_m2" },
              n: { $sum: 1 } } }
]).toArray()[0];

const ecart = ((naif.prix_m2_moyen - correct.prix_m2_moyen) / correct.prix_m2_moyen) * 100;

print("commune            : " + correct.commune);
print("naif    (raw, sans filtre, sans regroupement) : " + Math.round(naif.prix_m2_moyen) + " EUR/m2 sur " + naif.n + " lignes");
print("correct (mutations, filtre, regroupe)         : " + Math.round(correct.prix_m2_moyen) + " EUR/m2 sur " + correct.n + " mutations");
print("ecart              : " + ecart.toFixed(1) + " %  (facteur " + (naif.prix_m2_moyen / correct.prix_m2_moyen).toFixed(2) + ")");
print("");
print("lignes brutes      : " + db.raw.countDocuments());
print("mutations          : " + db.mutations.countDocuments());
print("mutations sur >1 ligne : " + db.mutations.countDocuments({ nb_lignes: { $gt: 1 } }));
