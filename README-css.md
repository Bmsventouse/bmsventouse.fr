# CSS BMS Ventouse — architecture modulaire

## Règle principale

**Les fichiers `css/*.css` ci-dessous sont les sources maintenues.**
`css/style.css` est désormais **généré automatiquement** à partir de ces modules, dans un ordre fixe. Les pages continuent de charger une seule feuille CSS `/css/style.css?v=...`. Pas de framework, pas de dépendance CSS ni de chargement multiple.

| Ordre | Source | Rôle |
| --- | --- | --- |
| 1 | `css/base.css` | Variables, reset, typographie, styles globaux |
| 2 | `css/layout.css` | Structure, menu, grille, pied de page |
| 3 | `css/components.css` | Boutons, cartes et composants communs |
| 4 | `css/faq.css` | Styles de l'accordéon FAQ |
| 5 | `css/animations.css` | Animations, états visuels et interactions |
| 6 | `css/sections.css` | Sections de pages : hero, CTA, carrousel, bannière |
| 7 | `css/pages.css` | Styles spécifiques à certaines pages |
| 8 | `css/overrides.css` | Règles historiques de compatibilité à résorber |

**Important :** la séparation initiale a été reconstruite **à l'identique** à partir du CSS combiné qui faisait autorité. L'ordre des sélecteurs et la cascade ont été préservés, y compris certains ajustements historiques qui seront revus lors des audits par page. Ne pas déplacer une règle entre modules sans examiner sa priorité et tester les pages affectées.

## Comment modifier le design

1. Éditer le fichier source correspondant au composant ou à la page. **Ne pas modifier directement `css/style.css`.**
2. Lancer `npm run build:css` pour régénérer `css/style.css`.
3. Lancer `npm test` : cette commande commence par `npm run check:css` et échoue si le fichier généré ne correspond plus aux sources. Elle lance ensuite les tests Node existants.
4. Vérifier le comportement sur mobile et ordinateur (notamment menu, cookies, boutons et sections critiques) avant validation.
5. Commiter **les fichiers sources et `css/style.css` généré ensemble**, afin que le dépôt et les déploiements statiques directs restent cohérents.

La commande Netlify `npm run build` exécute `build:css` avant les autres tâches existantes. `npm run check:css` **vérifie uniquement** l'équivalence et ne modifie aucun fichier.

## Risques et règles de stabilité

- Conserver le point d'entrée CSS unique : ne pas ajouter les modules en `<link>` ou en `@import` dans les pages.
- Respecter l'ordre des modules : le modifier peut changer le rendu même si les règles CSS restent identiques.
- Limiter les nouveaux sélecteurs aux composants / pages nécessaires et éviter les overrides en cascade.
- L'ancienne arborescence contenait des versions divergentes des mêmes règles ; elles ont été remplacées par les modules reconstruits à partir de la version réellement utilisée.
- Une compilation **identique en texte** ne prouve pas à elle seule la compatibilité de chaque écran : les tests de navigateur et une revue visuelle restent requis lors des changements de design.
- En production, les URL des ressources gardent actuellement un identifiant de version. Prévoir une invalidation du cache lors du déploiement validé pour que les visiteurs voient les dernières modifications.
