# Statut du projet UNOVA

Dernière mise à jour : 31 octobre 2026

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
- Tableau de bord avec le message « Bonjour, <prénom> » et notice lorsque le compte n'a aucun rôle.
- Formulaires avec validation et messages d'erreur en français, erreurs par champ, état de chargement et bouton désactivé pendant l'envoi.
- Coquille authentifiée avec barre latérale sur ordinateur, tiroir accessible sur mobile et navigation active.
- Pages `error.tsx`, `loading.tsx` et 404 en français.
- Mise en page responsive et états de focus visibles.
- Variables CSS de marque (`primary`, `accent`, `background`, `foreground`) exposées à Tailwind.
- Métadonnées françaises et police Geist chargée via `next/font`.
- Fichier `.env.example` sans valeurs et exclusion des fichiers `.env*`.
- Règles permanentes documentées dans `AGENTS.md`.

## Prévu

- Vérification de l'identité étudiante par CIN.
- Affichage et gestion des rôles dans l'interface.
- Téléversement et affichage de la photo de profil.
- Recherche fonctionnelle dans l'espace applicatif.
- Import et consultation des données académiques officielles vérifiées.
- Notifications et communications institutionnelles.
- Tests automatisés et déploiement.

## Limites actuelles

- Seule l'authentification par e-mail est disponible ; aucune vérification CIN n'est encore proposée.
- L'espace applicatif est protégé, mais ses pages métier restent des pages d'attente.
- Aucune donnée académique, aucun utilisateur fictif et aucune statistique ne sont affichés.
- La recherche est volontairement désactivée.
