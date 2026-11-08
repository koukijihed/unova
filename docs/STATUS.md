# Statut du projet UNOVA

Dernière mise à jour : 8 novembre 2026

## Implémenté

- Application Next.js avec App Router, TypeScript, Tailwind CSS et ESLint.
- Dossier `src/` et alias d'import `@/*`.
- Chaînes de l'interface centralisées dans `src/content/fr.ts`.
- Coquille publique avec en-tête (logo UNOVA, Accueil, Formations, Connexion) et pied de page ESSECT.
- Logo UNOVA intégré avec `next/image` dans l'en-tête, le pied de page, la barre latérale et au-dessus des formulaires d'authentification.
- Favicon et icône Apple générés depuis le logo (`src/app/icon.png`, `src/app/apple-icon.png`), favicon par défaut supprimé.
- Page d'accueil avec slogan, présentation, boutons d'action et section « Nos formations » alimentée par le nombre réel de programmes actifs par diplôme, avec liens vers `/formations`.
- Connexion Supabase avec `@supabase/supabase-js` et `@supabase/ssr` (clé publique uniquement).
- Authentification par e-mail et mot de passe : inscription, connexion, déconnexion.
- Confirmation d'adresse par e-mail via la route `/auth/callback`.
- Réinitialisation du mot de passe : demande par e-mail et choix d'un nouveau mot de passe.
- Rafraîchissement de la session à chaque requête via `src/proxy.ts`.
- Routes de l'espace applicatif protégées côté serveur avec `supabase.auth.getUser()`.
- Redirection des utilisateurs non connectés vers `/connexion?redirection=<chemin>`.
- Redirection des utilisateurs connectés depuis `/connexion` et `/inscription` vers le tableau de bord.
- Chargement du profil (`first_name`, `last_name`, `phone`, `avatar_path`, `created_at`) et affichage du nom, des initiales et de la photo dans la barre supérieure et le menu utilisateur.
- Menu utilisateur accessible au clavier avec « Mon profil » et « Se déconnecter ».
- Page `/profil` : en-tête avec photo, nom complet, rôles (`roles.label_fr`), date de création du compte et adresse e-mail ; inscription(s) étudiante(s) en lecture seule (classe, programme, année, statut en français).
- Modification du prénom, du nom (obligatoires, 80 caractères maximum) et du téléphone (facultatif, 20 caractères maximum, chiffres, espaces et `+`) via une action serveur avec erreurs en français.
- Photo de profil : téléversement PNG/JPEG/WebP (2 Mo maximum), type réel vérifié par signature binaire, stockage dans `<user_id>/<uuid>.<ext>`, suppression de l'ancien objet et action « Supprimer la photo ». Affichage par URL signée d'une heure avec repli sur les initiales.
- Changement de mot de passe depuis `/profil` (10 caractères minimum, confirmation) via `supabase.auth.updateUser`.
- Catalogue des formations partagé entre les routes publiques `/formations`, `/formations/[code]` et les routes authentifiées `/programmes`, `/programmes/[code]` : regroupement par diplôme selon `sort_order`, groupes vides masqués, recherche `?q=` insensible aux accents, cartes (nom, département, badge « Co-construit », parcours).
- Détail d'une formation : diplôme, département, parcours et note « Le plan d'études détaillé sera publié prochainement. ». Les administrateurs voient aussi les programmes inactifs (badge « Inactif ») et leur `source_note`.
- Hub `/academique` listant les modules (Programmes, Cours, Documents, Vidéos, Emplois du temps, Questions-Réponses) avec les badges « Disponible » et « Bientôt disponible ».
- Bloc « Accès rapide » sur le tableau de bord vers Profil, Programmes, Cours, Documents et, pour les rôles `admin` et `director`, Gestion.
- Gestion des enseignants `/gestion/enseignants` (administrateur uniquement) : liste des comptes ayant le rôle `teacher` (nom et prénom seulement), ajout par adresse e-mail via `admin_find_user` avec insertion dans `user_roles` (`granted_by` = utilisateur courant), messages « Aucun compte ne correspond à cette adresse. » et « Cette personne est déjà enseignante. », retrait du rôle avec confirmation native `<dialog>` et refus si l'enseignant est encore affecté à un cours.
- Gestion des cours `/gestion/cours` (administrateurs et directeurs) : sélecteur de classe `?classe=<id>`, création (nom 2 à 200 caractères, semestre facultatif de 1 à 10, description 2000 caractères maximum), modification, activation/désactivation sans suppression, et gestion des enseignants du cours par adresse e-mail via `find_teacher_by_email` avec confirmation de retrait.
- Pages de cours `/cours` et `/cours/[id]` pour tous les utilisateurs connectés : visibilité appliquée par les politiques RLS, recherche `?q=` insensible aux accents, cartes avec nom, libellé de classe `<code> — <classe> (<année>)`, semestre et noms des enseignants (`course_teacher_names`), états vides adaptés (compte non vérifié, inscription en attente ou non active), et sections « Vidéos » et « Questions-Réponses » marquées « Bientôt disponible ».
- Documents de cours : téléversement direct vers le bucket privé `documents` via URL signée (aucun fichier ne traverse le serveur Next.js/Cloudflare), validation du type MIME, de l'extension, de la taille (50 Mo) et des octets magiques, vérification de l'objet stocké avant validation définitive ; liste par cours avec filtre `?categorie=` et recherche `?q=` insensible aux accents, page `/documents` avec filtres `?cours=`, `?categorie=`, `?q=` et pagination de 20 par page, visionneuse `/documents/[id]` (PDF intégré, images, message pour les autres formats), route `/documents/[id]/fichier?mode=view|download` avec URL signée de 60 secondes, et contrôles de gestion (modification, masquage/affichage, suppression avec confirmation) réservés aux utilisateurs autorisés par `can_upload_to_course`.
- Tableau de bord avec le message « Bonjour, <prénom> » et notices d'inscription : aucun profil étudiant (lien vers `/verification`), en attente, acceptée, refusée, interrompue ou terminée.
- Écran d'acceptation des inscriptions pour les administrateurs et directeurs de programme : `/gestion` et `/gestion/etudiants`, sélection de classe, recherche par nom, compteurs, actions Accepter / Refuser / Remettre en attente (y compris pour les inscriptions acceptées), refus d'une inscription acceptée avec confirmation, et « Tout accepter » avec confirmation.
- Accès à `/gestion` réservé aux rôles `admin` et `director`, avec entrée « Gestion » affichée uniquement pour ces rôles.
- Écrans d'administration de la structure académique réservés au rôle `admin` : `/gestion/annees` (création, définition de l'année courante, ouverture et fermeture des inscriptions) et `/gestion/programmes` (création et modification, désactivation sans suppression).
- Détail d'un programme `/gestion/programmes/[id]` : gestion des parcours, des classes par année universitaire et affectation des directeurs de programme par adresse e-mail.
- Appels aux fonctions `director_students`, `director_set_enrollment` et `director_accept_all` avec le client Supabase de l'utilisateur connecté ; les permissions restent appliquées par la base de données.
- Vérification de l'identité étudiante par CIN sur `/verification` : CIN à 8 chiffres et nom de famille, empreinte HMAC-SHA256 calculée côté serveur, appel à la fonction `claim_roster` et messages d'erreur en français.
- Client Supabase administrateur réservé au serveur (`src/lib/supabase/admin.ts`) avec `SUPABASE_SECRET_KEY` et `CIN_PEPPER`, jamais exposés au navigateur.
- Script d'import de la liste officielle (`scripts/import-roster.mjs`) : simulation par défaut, `--apply`, `--skip-invalid`, `--self-test`, contrôle des classes de l'année courante et insertion par lots.
- Fichiers CSV locaux contenant des CIN exclus du dépôt via `data/` dans `.gitignore`.
- Formulaires avec validation et messages d'erreur en français, erreurs par champ, état de chargement et bouton désactivé pendant l'envoi.
- Coquille authentifiée avec barre latérale sur ordinateur, tiroir accessible sur mobile et navigation active.
- Pages `error.tsx`, `loading.tsx` et 404 en français.
- Mise en page responsive et états de focus visibles.
- Variables CSS de marque (`primary`, `accent`, `background`, `foreground`) exposées à Tailwind.
- Métadonnées françaises et police Geist chargée via `next/font`.
- Fichier `.env.example` sans valeurs et exclusion des fichiers `.env*`.
- Règles permanentes documentées dans `AGENTS.md`.
- Configuration de déploiement Cloudflare Workers avec `@opennextjs/cloudflare` : `wrangler.jsonc` (Worker `unova`, `nodejs_compat`, actifs statiques, bindings), `open-next.config.ts`, scripts `preview`, `deploy`, `upload` et `cf-typegen`, en-têtes de cache des actifs statiques.
- Build de l'adaptateur Cloudflare vérifié et bundle mesuré : 8,92 Mio non compressé, 1,94 Mio gzip (limite Workers de 64 Mio non compressés).
- Prévisualisation Cloudflare (`npm run preview`) fonctionnelle : Cache Components désactivé pour contourner un défaut amont d'OpenNext ; `/`, `/connexion`, `/inscription` et `/mot-de-passe-oublie` répondent 200, et les routes protégées redirigent vers `/connexion?redirection=...`.
- **Premier déploiement de production** sur Cloudflare Workers : <https://unova.unova-app-essect.workers.dev> (version `5549992f-2d01-4442-9339-b2eb4563c60f`, 7 novembre 2026). Les routes publiques répondent 200 et les routes protégées redirigent vers `/connexion?redirection=...`.
- Guide de déploiement en français dans `docs/DEPLOIEMENT.md` (prérequis, variables publiques et secrètes, commandes, retour arrière, décision Cache Components).

## Prévu

- Import et consultation des plans d'études officiels.
- Page d'import de la liste officielle dans l'administration.
- Aperçu des fichiers Word, PowerPoint et Excel dans le navigateur.
- Vidéos pédagogiques.
- Questions-Réponses.
- Emplois du temps.
- Nettoyage des fichiers orphelins dans le bucket `documents`.
- Suivi de l'espace de stockage utilisé.
- Statistiques de gestion.
- Affichage et gestion des rôles dans l'interface.
- Recherche globale fonctionnelle dans l'en-tête de l'espace applicatif.
- Notifications et communications institutionnelles.
- Tests automatisés.
- Configuration du domaine personnalisé (le site est pour l'instant servi sur `workers.dev`).
- Réactivation de Cache Components après publication du correctif de l'adaptateur OpenNext (PR #1318).

## Limites actuelles

- L'acceptation des inscriptions, la gestion des enseignants, des cours et de la structure académique sont disponibles ; les vidéos, questions-réponses et emplois du temps restent à venir.
- L'import de la liste officielle se fait uniquement en ligne de commande ; aucune page d'administration n'est encore proposée.
- L'espace applicatif est protégé, mais plusieurs de ses pages métier restent des pages d'attente.
- Aucune donnée académique, aucun utilisateur fictif et aucune statistique ne sont affichés.
- La recherche globale de l'en-tête est volontairement désactivée ; la recherche par nom est disponible dans la gestion des étudiants.
- Le site est déployé en production sur <https://unova.unova-app-essect.workers.dev>, mais aucun domaine personnalisé n'est encore configuré.
- Cache Components reste désactivé : avec Next.js 16.4.5 et `@opennextjs/cloudflare` 1.20.16, l'activer fait bloquer les routes dynamiques dans workerd (erreur « Worker's code had hung »). Le correctif amont (PR #1318) n'est pas encore publié. Voir `docs/DEPLOIEMENT.md`, section 10.
- Les URL de redirection Supabase (confirmation d'e-mail et réinitialisation du mot de passe) doivent inclure l'URL de production ; cette configuration se fait dans le tableau de bord Supabase, pas dans le dépôt.
- Le cache incrémental R2 n'est pas activé ; le guide décrit son activation optionnelle.

## Limites connues

- Des fichiers orphelins peuvent rester dans le bucket `documents` si un téléversement est interrompu avant la validation définitive.
- Le stockage du plan gratuit Supabase est d'environ 1 Go ; les documents partagent cette limite avec les autres fichiers de l'application.
