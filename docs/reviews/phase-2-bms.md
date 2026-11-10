# BMS Ventouse — corrections après audit

Base auditée : `e4d73d73e25bd74af8ed1ba8efc7c956dc497e28`.
Branche : `fix/contact-consent-and-commercial-pages`.
Aucune fusion, aucun déploiement de production, aucune modification DNS ou des comptes publicitaires.

## Changements

- Consentement centralisé dans `js/consent.js`, initialisé synchroniquement sur les 73 documents HTML : refus par défaut, reprise du choix mémorisé avant toute configuration de mesure, durée de préférence de 180 jours. Google tag, GTM et Clarity chargent seulement après acceptation. Le retrait transmet les signaux de refus, supprime les cookies de mesure accessibles au site puis recharge la page pour terminer les scripts et minuteries déjà chargés. Aucun chargement multiple dans un document.
- Coordonnées commerciales autorisées : `+33646005642`, `contact@bmsventouse.fr`, et `https://wa.me/33646005642`. Les administrations et partenaires ne déclenchent aucun événement commercial. Un gestionnaire délégué couvre aussi les liens construits dynamiquement.
- Pour un clic BMS accepté : une occurrence de l’événement du canal (`phone_click`, `email_click`, `whatsapp_click`) et une occurrence de `lead_contact`. Ce sont deux événements complémentaires, pas deux demandes reçues. `lead_contact` porte `lead_stage=contact_intent` et ne doit pas être une conversion principale de demande qualifiée.
- Un seul envoi direct GA4 par événement ; suppression du second objet d’événement personnalisé dans `dataLayer`. Le contenu du conteneur GTM doit être revu avant fusion pour exclure ses propres déclencheurs redondants et adapter les déclencheurs dépendant de l’ancien schéma.
- Aucun e-mail, téléphone, nom, message libre ou URL de contact transmis dans les paramètres des événements personnalisés. Les anciennes captures de formulaire, de données personnelles et les fausses confirmations `?success=1` ont été retirées. Aucun formulaire actif n’a été ajouté.
- `page_location` et `page_referrer` sont nettoyés des paramètres libres et fragments. Les identifiants publicitaires `gclid`, `dclid`, `gbraid`, `wbraid` restent transmis s’ils respectent le format attendu. Les UTM libres ne sont pas transmis dans la valeur configurée de `page_location` : valider la classification des campagnes dans GA4 avant fusion. Les URL des visiteurs ne sont pas réécrites et les redirections des pages restent inchangées, hormis le retrait des règles obsolètes de `/en/` vers `/`.
- Structure HTML, CSS et données structurées rétablies pour Logistique Val-d’Oise, Transport audiovisuel Paris et Infos IA. Contenus et prestations maintenus.
- Références d’images réparées et variantes responsive utilisées. Aucun visuel de catering disponible : le logo BMS existant sert d’illustration de remplacement, avec un texte alternatif honnête. Le logo Netflix était déjà un PNG nommé `.svg` : renommage sans modification de ses octets, avec redirection de l’ancienne URL.
- Préchargements mobiles alignés sur les variantes WebP. Le générateur accepte le WebP source conservé dans le dépôt et produit les icônes existantes, sans exiger un JPG absent.
- CSS/JS revalidés, URL de ressources versionnées et service worker réseau d’abord avec secours hors ligne. Seuls les anciens caches BMS sont supprimés. Les images conservent leur politique de cache.
- Liens directs téléphone/WhatsApp renforcés sur Accueil, Contact et NFC ; suppression du CTA principal Contact qui revenait vers lui-même. Promesse harmonisée autour d’un premier retour sous 24h, sans engagement de devis final dans ce délai.
- Sitemap complété avec les pages canoniques indexables manquantes. La sauvegarde HTML reste accessible, avec `noindex` en HTML et dans les en-têtes Netlify. Favicons reliés aux PNG générés.
- Les politiques CSP de `_headers` et `netlify.toml` sont alignées ; destination régionale GA4 explicitée. Cela ne configure aucune conversion Google Ads.

## Contrat des mesures commerciales

| Étape | Source de vérité | Événement proposé | Usage |
| --- | --- | --- | --- |
| Clic de contact | Navigateur, après consentement | `lead_contact` + événement du canal | Analyse du parcours ; intention uniquement |
| Demande reçue | Réception vérifiée côté serveur ou équipe | `inquiry_received` | Jamais déduite d’un clic ou d’une URL de succès |
| Demande qualifiée | Qualification commerciale/CRM | `qualified_lead` | Conversion principale candidate après validation Ads |
| Devis envoyé | Équipe ou CRM | `quote_sent` | Étape commerciale distincte, selon les objectifs Ads |
| Client obtenu | Équipe ou CRM | `customer_acquired` | Résultat commercial et valeur réelle, si vérifiable |

Seule la première ligne est implémentée dans le navigateur. Les autres sont un contrat pour une intégration serveur/CRM future, pas des événements activés. Prévoir un identifiant de demande opaque, une date d’étape et une clé de déduplication par demande/étape. Choisir une seule voie d’import pour un même résultat ; ne pas importer en parallèle la même demande via GA4 et une conversion Ads native comme deux objectifs principaux. Ne transmettre aucune donnée personnelle brute à GA4. Les conversions améliorées éventuelles demandent une mise en œuvre spécifique et un consentement adapté, jamais l’ajout d’un e-mail dans un événement GA4.

## Proposition de devis court — non activée

Aucun formulaire, endpoint ou fausse confirmation n’est livré. Proposition pour validation BMS :

| Champ | Caractère proposé |
| --- | --- |
| Prestation recherchée | Obligatoire, liste des prestations existantes |
| Ville / lieu | Obligatoire |
| Dates souhaitées et urgence | Obligatoire, option « dates à préciser » |
| Coordonnée de réponse | E-mail ou téléphone, au moins un des deux |
| Société / nom | Facultatif selon les besoins commerciaux |
| Description du besoin | Facultative, courte |

Avant activation : confirmer la boîte/équipe destinataire et un circuit de secours ; vérifier réception réelle et erreurs réseau ; limiter fréquence et taille des soumissions ; prévoir honeypot et protection anti-spam adaptée ; établir confidentialité, durée de conservation et accès aux données ; confirmer la réussite uniquement après acceptation serveur ; ne pas conditionner l’envoi d’une demande au consentement analytique. Ajouter l’événement de demande reçue seulement après vérification de cette réception et de sa déduplication. Les coordonnées seront traitées pour répondre à la demande, sans consentement marketing imposé ni données brutes dans Analytics.

## Vérifications et reproduction

- `npm test` : 13 tests Node, intégrés comme étape bloquante de la CI. Consentement, destinations BMS/tiers, données autorisées et cache.
- HTMLHint : les 73 documents sans erreur avec la configuration du dépôt.
- ESLint : scripts modifiés et tests sans erreur.
- `npm run build` : exécuté avec Node 20 et Sharp dans une copie temporaire ; ne pas intégrer les images régénérées involontairement dans le commit de correction.
- `node tests/browser.cjs` : nécessite Playwright et Chromium et un serveur servant la copie construite sur `127.0.0.1:8081` (modifiable par `BMS_TEST_URL`). Vérifie consentement, six parcours de contact, 73 pages à 360 px et dix routes à 1280 px, images y compris différées, menu mobile, styles et erreurs de console/HTTP. Les appels tiers sont interceptés et remplacés par des réponses vides ; les en-têtes CSP du dépôt sont appliqués aux réponses locales. Aucun trafic de conversion réel n’est envoyé.

Exemple dans l’environnement préparé : activer Node 20 dans `/workspace/.bms-tools/node_modules/node/bin` et ajouter `/workspace/.bms-tools/node_modules` à `NODE_PATH` en préservant sa valeur existante. Copier le dépôt sans `.git` dans un répertoire temporaire, y exécuter le build puis `python3 -m http.server 8081 --bind 127.0.0.1`. Depuis le dépôt, lancer les tests navigateur. En dehors de cet environnement, installer les dépendances du projet et fournir Playwright/Chromium séparément ; le test Node ne nécessite aucune bibliothèque de test externe.

Ces vérifications locales ne démontrent pas la réception des événements par les comptes Google, le contenu publié de GTM, les résultats de la CI distante ou les en-têtes de production. Aucun score Lighthouse ni résultat Core Web Vitals de production n’est revendiqué.

## À vérifier avant fusion et mise en production autorisée

- Google Ads : identifiants et libellés réels, sources des conversions, statut principal/secondaire, réglage de comptage, liens GA4 et import éventuel de leads qualifiés ; appliquer les demandes exactes du compte sans inventer d’identifiant.
- GA4 : DebugView après acceptation, absence d’événements après refus/retrait, propriété `G-V7QXQC5260`, attribution avec vrais liens de campagne et absence de données personnelles. Examiner la mesure améliorée automatique, qui n’est pas configurable depuis ce dépôt.
- GTM : version publiée de `GTM-KD4HDWX4`, balises GA4/Ads, déclencheurs de clic et d’événement, consentement ; éviter une deuxième configuration GA4/page_view ou un second envoi du même clic.
- Clarity : projet `v0wk7109ix`, traitement effectif des signaux Consent V2, masquage et retrait ; l’exécution réelle du script tiers n’est pas simulée par les tests.
- Netlify : commit réellement construit, en-têtes CSP/cache, redirections, ancienne URL du logo, état `noindex` de la sauvegarde, `/en/`, conservation des paramètres publicitaires et fonctionnement du service worker sur HTTPS.
- Commercial : faire valider la promesse « premier retour sous 24h » et l’illustration provisoire de catering ; aucune promesse de gain de clients n’est déduite des seuls tests techniques.

## Risques et retour arrière

Le passage au consentement préalable et la suppression des faux leads feront probablement baisser les volumes mesurés ; cela ne signifie pas nécessairement une baisse des demandes réelles. La suppression du double chemin d’envoi impose une revue GTM avant fusion. Le retrait du consentement recharge la page ; aucun formulaire actif ne peut perdre de saisie aujourd’hui. Le mode réseau d’abord augmente les revalidations CSS/JS et renouvelle les caches BMS.

Avant fusion : fermer la PR conserve `main` et la production. Après une fusion puis un déploiement explicitement autorisés : créer une branche de retour arrière, utiliser `git revert` sur le commit de correction (ou `git revert -m 1` sur un commit de merge, selon le mode de fusion), tester et faire approuver une PR de retour. Ne pas forcer l’historique. Pour un rétablissement urgent, BMS peut republier un déploiement Netlify connu après accord ; vérifier aussi les caches navigateurs/service worker. Ce retour rétablirait les défauts antérieurs de consentement et de mesure : privilégier un correctif ciblé si possible. Aucun compte publicitaire ni DNS n’a de changement à annuler.

## Fichiers modifiés

Liste exacte des changements de cette branche (`M` : modifié, `A` : ajouté, `R100` : renommé sans changement des octets) :

```text
M    .github/workflows/ci.yml
M    404.html
M    _headers
M    affichage-riverains/affichage-riverains-backup.html
M    affichage-riverains/index.html
M    autorisation-occupation-domaine-public-tournage-paris/index.html
M    cantine-catering/index.html
M    conditions-generales-prestation/index.html
M    contact-direct/index.html
M    contact-nfc/index.html
M    contact/index.html
M    convoyage-vehicules-decors/index.html
M    css/style.css
M    definition-ventousage/index.html
M    definition-ventouseur/index.html
M    demenagement-aot/index.html
M    en/index.html
M    en/paris-fashion-week-ventousage-logistics/index.html
M    en/parking-neutralization-paris-france/index.html
M    gardiennage/index.html
R100    images/logo-netflix.svg    images/logo-netflix.png
M    index.html
M    infos-ia/index.html
M    js/script.js
M    loges-confort/index.html
M    logistique-seine-et-marne/index.html
M    logistique-seine-saint-denis/index.html
M    logistique-val-d-oise/index.html
M    mentions/index.html
M    netlify.toml
M    package.json
M    panneaux-demenagement/index.html
M    politique-confidentialite/index.html
M    realisations/index.html
M    regie-materiel/index.html
M    scripts/generate-responsive-images.js
M    securite-gardiennage/index.html
M    securite-plateaux/index.html
M    securite-tournage-amiens/index.html
M    securite-tournage-beauvais/index.html
M    securite-tournage-bordeaux/index.html
M    securite-tournage-compiegne/index.html
M    securite-tournage-lille/index.html
M    securite-tournage-lyon/index.html
M    securite-tournage-marseille/index.html
M    securite-tournage-nice/index.html
M    securite-tournage-paris/index.html
M    securite-tournage-saint-quentin/index.html
M    securite-tournage-senlis/index.html
M    securite-tournage-strasbourg/index.html
M    securite-tournage-toulouse/index.html
M    securite-tournage-versailles/index.html
M    securite-tournage-vincennes/index.html
M    services/index.html
M    signalisation-barrierage/index.html
M    sitemap.xml
M    sw.js
M    transport-materiel-audiovisuel-paris/index.html
M    ventousage-amiens/index.html
M    ventousage-beauvais/index.html
M    ventousage-bordeaux/index.html
M    ventousage-cinema/index.html
M    ventousage-compiegne/index.html
M    ventousage-ile-de-france/index.html
M    ventousage-lille/index.html
M    ventousage-lyon/index.html
M    ventousage-marseille/index.html
M    ventousage-nantes/index.html
M    ventousage-nice/index.html
M    ventousage-orleans/index.html
M    ventousage-pantin/index.html
M    ventousage-paris/index.html
M    ventousage-reims/index.html
M    ventousage-rennes/index.html
M    ventousage-rouen/index.html
M    ventousage-saint-quentin/index.html
M    ventousage-senlis/index.html
M    ventousage-shootings-defiles-paris/index.html
M    ventousage-strasbourg/index.html
M    ventousage-toulouse/index.html
M    ventousage-versailles/index.html
M    ventousage-vincennes/index.html
M    ventousage/index.html
A    docs/reviews/phase-2-bms.md
A    js/consent.js
A    tests/browser.cjs
A    tests/consent.test.cjs
A    tests/service-worker.test.cjs
```
