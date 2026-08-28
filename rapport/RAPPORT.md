# Prix au m² dans l'Hérault — rapport de projet

**Binôme** : jasondahmoun · *(nom du binôme)*
**IPSSI Montpellier** — Mastère Dév, Data & IA, 4ᵉ année — module MIA4
**Date** : 28 août 2026
**Dépôt** : https://github.com/jasondahmoun/projet_final_nosql

---

## i) Problématique

### Contexte métier

### Les trois questions

1.
2.
3.

### Le jeu de données

Source, URL, volume, période couverte, licence. Pourquoi il convient à ces questions.

### Pourquoi MongoDB pour ce cas précis

---

## ii) Problèmes de données rencontrés

| Anomalie | Comment détectée | Ampleur | Traitement retenu | Justification |
|---|---|---|---|---|
| Mutation répétée sur plusieurs lignes | `db.raw.distinct("id_mutation").length` vs `countDocuments()` | 69 651 lignes → ≈ 29 565 mutations | `$group` par `id_mutation` avant tout calcul | sans regroupement, le prix médian est faux de X % |
| | | | | |
| | | | | |

### Le chiffre naïf et le chiffre correct

Sortie de `agg/q1_naif.js` : valeur naïve, valeur correcte, écart en %.

### Ce que ces anomalies changent pour l'interprétation

---

## iii) Démarche

### Modélisation

Schéma des collections. Pour chaque relation, la décision *embed* ou *référence* et ses trois critères : cardinalité, taille bornée ou non, cycle de vie indépendant ou non. Ce qui ferait changer d'avis.

### Import

Commande exacte, temps d'import, transformations appliquées.

### Indexation

| Index | Requête servie | `stage` avant → après | `totalDocsExamined` avant → après |
|---|---|---|---|
| `{ code_postal: 1, date_mutation: -1 }` | Q1 | COLLSCAN → IXSCAN | → |
| `{ geo: "2dsphere" }` | Q3 | COLLSCAN → IXSCAN | → |

### Architecture applicative

Front statique → API FastAPI → PyMongo → MongoDB. Choix de framework et de driver, routes exposées.

### Sécurité

Authentification, rôle applicatif et son périmètre, gestion des secrets, validation des entrées, restriction CORS.

---

## iv) Résultats

### Question 1

**La question.**
**Le pipeline** (commenté).
**Le résultat.**
**Interprétation métier** en 3 à 5 lignes, avec ses réserves.

### Question 2

### Question 3

### Captures

- `captures/explain_avant.json` et `captures/explain_apres.json`
- `captures/front.png`

---

## v) Conclusion

- Ce qui a été livré, et ce qui n'a pas pu l'être.
- Passage à l'échelle : le modèle à 10 millions de documents. Shard key envisagée et pourquoi. Quelles requêtes resteraient *targeted*, lesquelles deviendraient des *broadcasts*.
- Limites du travail : ce que les données ne permettent pas de conclure.
- Ce qu'on ferait différemment en repartant de zéro.

---

## Annexes

Schéma détaillé des collections · liste complète des routes · commandes d'import · répartition du travail dans le binôme.
