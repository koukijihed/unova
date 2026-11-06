# Statut du projet UNOVA

Dernière mise à jour : 7 novembre 2026

## Implémenté

- Application Next.js avec App Router, TypeScript, Tailwind CSS et ESLint.
- Dossier `src/` et alias d'import `@/*`.
- Chaînes de l'interface centralisées dans `src/content/fr.ts`.
- Coquille publique avec en-tête (logo UNOVA, Accueil, Formations, Connexion) et pied de page ESSECT.
- Logo UNOVA intégré avec `next/image` dans l'en-tête, le pied de page, la barre latérale et au-dessus des formulaires d'authentification.
- Favicon et icône Apple générés depuis le logo (`src/app/icon.png`, `src/app/apple-icon.png`), favicon par défaut supprimé.
- Page d'accueil avec slogan, présentation, cartes UNOVA Académique et UNOVA Gestion, et boutons d'action.
- Connexion Supabase avec `@supabase/supabase-js` et `@supabase/ssr` (clé publique uniquement).
- Authentification par e-mail et mot de passe : inscription, connexion, déconnexion.
- Confirmation d'adresse par e-mail via la route `/auth/callback`.
- Réinitialisation du mot de passe : demande par e-mail et choix d'un nouveau mot de passe.
- Rafraîchissement de la session à chaque requête via `src/proxy.ts`.
- Routes de l'espace applicatif protégées côté serveur avec `supabase.auth.getUser()`.
- Redirection des utilisateurs non connectés vers `/connexion?redirection=<chemin>`.
- Redirection des utilisateurs connectés depuis `/connexion` et `/inscription` vers le tableau de bord.
- Chargement du profil (`first_name`, `last_name`) et affichage du nom et des initiales dans la barre supérieure.
- Menu utilisateur accessible au clavier avec « Mon profil » et « Se déconnecter ».
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

## Prévu

- Gestion des enseignants.
- Import et consultation des plans d'études officiels.
- Page d'import de la liste officielle dans l'administration.
- Gestion des emplois du temps.
- Statistiques de gestion.
- Affichage et gestion des rôles dans l'interface.
- Téléversement et affichage de la photo de profil.
- Recherche globale fonctionnelle dans l'en-tête de l'espace applicatif.
- Notifications et communications institutionnelles.
- Tests automatisés et déploiement.

## Limites actuelles

- L'acceptation des inscriptions est disponible pour les administrateurs et les directeurs de programme ; la structure académique est administrable par les administrateurs, les autres outils de gestion restent à venir.
- L'import de la liste officielle se fait uniquement en ligne de commande ; aucune page d'administration n'est encore proposée.
- L'espace applicatif est protégé, mais la plupart de ses pages métier restent des pages d'attente.
- Aucune donnée académique, aucun utilisateur fictif et aucune statistique ne sont affichés.
- La recherche globale de l'en-tête est volontairement désactivée ; la recherche par nom est disponible dans la gestion des étudiants.
