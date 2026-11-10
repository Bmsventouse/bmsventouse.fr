# Convention CSS — BMS Ventouse (état réel)

## Source effectivement servie

Le site statique charge **`/css/style.css?v=...`** comme feuille principale. Ce fichier est un **CSS déjà combiné** : il contient des blocs `base`, `layout`, `components`, `sections`, `pages` et des ajustements supplémentaires. Il **n'importe pas** les six feuilles séparées au moyen de `@import`.

Le `npm run build` actuel ne regroupe **pas** les fichiers CSS. Il prépare les images et les remplacements d'adresse e-mail uniquement. Modifier une feuille séparée **ne modifie donc pas automatiquement** le rendu en production.

## Rôle des fichiers existants

- `css/style.css` : **source utilisée par le navigateur et référence pour les modifications visuelles** tant qu'aucune compilation CSS n'est mise en place.
- `css/base.css` : découpage de référence des variables et règles globales.
- `css/layout.css` : découpage de référence des structures et de la navigation.
- `css/components.css` : découpage de référence des boutons et autres composants.
- `css/sections.css` : découpage de référence des blocs de page.
- `css/pages.css` : découpage de référence des particularités de page.
- `css/faq.css` : découpage de référence de la FAQ.

Ces six fichiers existent mais **ne sont pas la source compilée** de `style.css` : leurs contenus peuvent diverger. Ils ne doivent pas être traités comme des composants automatiquement synchronisés.

## Règles de maintenance en vigueur

1. Modifier `css/style.css` lorsqu'une règle doit effectivement changer sur le site. Cibler d'abord les règles existantes, sans empiler d'overrides.
2. Ne **pas** ajouter dans les pages des liens vers les fichiers CSS secondaires : cela multiplierait les requêtes et pourrait changer la cascade.
3. Pour une correction commune (bouton, bannière, menu, FAQ), tester les pages concernées sur mobile et ordinateur.
4. Pour une correction propre à une page, utiliser un sélecteur limité à cette page lorsque nécessaire.
5. Ne pas modifier seulement un fichier secondaire en pensant qu'il sera déployé.
6. Maintenir **une seule feuille principale** tant qu'une migration complète, testée et mesurée vers des sources modulaires n'est pas décidée.

## Architecture cible confirmée par BMS

**Objectif de maintenance :** les fichiers `base.css`, `layout.css`, `components.css`, `sections.css`, `pages.css` et `faq.css` deviennent les **sources éditables**. Une étape de build produit automatiquement un seul `style.css` à charger sur les pages. Il ne doit plus y avoir deux versions indépendantes des règles.

**Attention : cette architecture cible n'est PAS encore appliquée.** Les modules et `style.css` ont divergé. Par exemple, `sections.css` est nettement plus long que le bloc « sections » actuellement inclus dans `style.css`. Une simple concaténation modifierait potentiellement le rendu de plusieurs pages.

### Migration sans régression (à réaliser)

1. Inventorier les règles et overrides de `style.css` et des modules séparés, en identifiant les doublons, les différences et leur ordre dans la cascade.
2. Reconstituer des **sources modulaires strictement équivalentes au CSS actuellement chargé**, sans introduire au passage des changements visuels non validés.
3. Ajouter au build un script léger qui concatène les sources dans un ordre explicite et déterministe, sans framework ni dépendance supplémentaire.
4. Comparer automatiquement le CSS généré à la référence actuelle puis exécuter les tests HTML, accessibilité, navigation, cookies et captures mobiles/ordinateur.
5. Lorsque le résultat est validé, faire de `style.css` un **fichier généré** et placer chaque nouvelle règle uniquement dans le module approprié.
6. Déployer uniquement après accord explicite de BMS et vérifier à nouveau les pages représentatives sur le site publié.

**Pendant cette migration :** `style.css` reste la seule feuille servie et fait autorité sur le rendu. Aucun basculement de build n'est autorisé tant que l'équivalence visuelle et fonctionnelle n'est pas démontrée.
