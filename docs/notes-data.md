# Notes de données - Voie 1

Canal de transmission vers le rapport (chapitre ii, Problèmes de données rencontrés).
Chaque ligne notée au moment où elle a été découverte, avec les commandes et les chiffres exacts.

## Import brut

```bash
./db/import.sh
```

- `dvf34.csv` : 69 652 lignes dont l'en-tête → **69 651 lignes de données**, conforme au volume annoncé par le sujet.
- Temps d'import (`mongoimport` vers `raw`) : **4 s**.

## Écart de comptage - la mutation répétée sur plusieurs lignes

```js
db.raw.countDocuments()                    // 69651
db.raw.distinct("id_mutation").length      // 29565
```

**69 651 lignes brutes pour 29 565 mutations distinctes.** Une vente s'étale sur plusieurs lignes (une par lot ou
parcelle) - confirmé par le comptage post-transformation :

```js
db.mutations.countDocuments({ nb_lignes: { $gt: 1 } })   // 17698
```

**17 698 mutations sur 29 565 (60 %)** s'étalent sur au moins 2 lignes brutes. Sans le `$group` par
`id_mutation` avant tout calcul, la majorité des transactions seraient comptées plusieurs fois et les
prix moyens seraient faux. Traitement retenu : `db/02-transform.js`, `$group` par `id_mutation` → `$out mutations`.

## Sonde 1 - types mixtes

```js
db.raw.countDocuments({ valeur_fonciere: { $type: "string" } })   // 420
db.raw.countDocuments({ code_postal: { $type: "string" } })        // 1189
db.raw.countDocuments({ code_postal: { $type: ["int","double"] } }) // 68462
```

`mongoimport --type csv` infère automatiquement le type de chaque colonne. Deux effets constatés :

- **`valeur_fonciere`** : 420 lignes où le champ est resté du texte (valeurs vides dans le CSV source) au lieu
  d'un nombre - géré par `$convert` avec `onError`/`onNull` → `null` lors de la transformation.
- **`code_postal`** (et `code_commune`) : inférés en **nombre** (68 462 lignes sur 69 651) alors que ce sont
  des identifiants, pas des quantités - piège classique (comparer `1930` à `"34000"` ne renvoie jamais rien).
  Traitement retenu : `$toString` forcé sur ces deux champs dans `02-transform.js`. Vérifié après coup :
  `db.mutations.countDocuments({ code_postal: { $type: "string" } })` = **29565** (100 % en chaîne).

## Sonde 2 - valeurs manquantes

```js
db.mutations.countDocuments({ geo: null })              // 237
db.mutations.countDocuments({ type_local: null })       // 10186
db.mutations.countDocuments({ type_local: "Mixte" })    // 99
```

- **237 mutations** (0,8 %) sans coordonnées GeoJSON (longitude/latitude absentes de la source) - exclues
  de Q3 et de la carte, sans que cela fausse Q1/Q2.
- **10 186 mutations (34,5 %)** n'ont ni "Maison" ni "Appartement" comme type de local (locaux commerciaux,
  dépendances, terrains...) - `type_local` reste `null`. **Ces mutations sont exclues de Q1/Q2/Q3**, dont le
  filtre ne retient que `Maison`/`Appartement`. À rappeler explicitement dans le rapport : les questions
  métier ne portent que sur 65,5 % du jeu (le logement résidentiel), pas sur l'intégralité des transactions
  DVF de l'Hérault.
- **99 mutations "Mixte"** : plusieurs lots de types différents (ex. logements + commerce) dans la même vente.

## Sonde 3 - valeurs aberrantes

```js
db.mutations.find({ prix_m2: { $ne: null } }).sort({ prix_m2: -1 }).limit(3)
db.mutations.find({ prix_m2: { $ne: null, $gt: 0 } }).sort({ prix_m2: 1 }).limit(3)
```

Extrêmes hauts : 284 000 €/m² (Montpellier), 249 000 €/m² (Quarante), 157 000 €/m² (Clermont-l'Hérault) -
les trois portent une `surface_reelle_bati` de **1 m²**, valeur de saisie manifestement fictive plutôt qu'un
vrai studio d'1 m².

Extrêmes bas : 0,0010 €/m² (Béziers, 1031 m² pour **1 €**), 0,0050 €/m² (Vendargues, 202 m² pour 1 €),
0,0050 €/m² (Montpellier, 200 m² pour 1 €) - des ventes à **1 euro symbolique** (donation, cession entre
proches), pas des transactions de marché.

Traitement retenu : le filtre déjà présent dans `agg/*.js` et `routes_agg.py`
(`surface_reelle_bati > 9` et `valeur_fonciere > 1000`) élimine mécaniquement les deux extrêmes montrés
ci-dessus - confirmé, ces six mutations sont toutes hors filtre. C'est donc ce filtre, et non une simple
intuition, qui justifie ces deux seuils précis.

## Sonde 4 - doublons

Traités par construction : voir "Écart de comptage" ci-dessus. `_id` de `mutations` est `id_mutation` -
l'unicité est garantie, pas besoin d'index unique séparé.

## Sonde 5 - intégrité référentielle

```js
db.mutations.aggregate([
  { $match: { code_commune: { $ne: null } } },
  { $lookup: { from: "communes", localField: "code_commune", foreignField: "_id", as: "c" } },
  { $match: { c: { $size: 0 } } },
  { $count: "n" }
])
// []  -> aucune mutation orpheline
```

**0 mutation orpheline** (aucune dont le `code_commune` n'ait pas de commune correspondante). Résultat
attendu : `communes` est construite par `$group` directement à partir de `mutations.code_commune`, donc
l'intégrité est garantie par construction, pas par une contrainte du SGBD - MongoDB n'impose aucune clé
étrangère, ce test aurait pu échouer si les deux collections avaient été peuplées séparément.

## Sécurité - preuve du moindre privilège

Vérifié en conditions réelles avec les identifiants de l'utilisateur applicatif (`app`) :

```js
db.createUser({ user: "hack", pwd: "hack", roles: ["readWrite"] })
// -> not authorized on immo to execute command { createUser: ... }
db.getSiblingDB("admin").system.users.countDocuments({})
// -> not authorized on admin to execute command { aggregate: "system.users", ... }
```

L'utilisateur `app` ne peut **ni créer d'utilisateur, ni lire une autre base** (testé sur `admin`) - seul le
`readWrite` sur `immo` fonctionne (`db.mutations.countDocuments({})` → 29565). Ce n'est pas juste déclaré
dans `db/01-init-app-user.js`, c'est vérifié par un refus réel du serveur.
