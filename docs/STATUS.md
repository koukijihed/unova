# Statut du projet UNOVA

Dernière mise à jour : 31 octobre 2026

## Implémenté

- Application Next.js avec App Router, TypeScript, Tailwind CSS et ESLint.
- Dossier `src/` et alias d'import `@/*`.
- Chaînes de l'interface centralisées dans `src/content/fr.ts`.
- Coquille publique avec en-tête (logo provisoire, Accueil, Formations, Connexion) et pied de page ESSECT.
- Page d'accueil avec slogan, présentation, cartes UNOVA Académique et UNOVA Gestion, et boutons d'action.
- Pages `/connexion` et `/inscription` avec formulaires visibles, désactivés et notice « Disponible prochainement ».
- Coquille authentifiée avec barre latérale sur ordinateur, tiroir accessible sur mobile, barre supérieure, recherche désactivée et avatar neutre.
- Navigation active dans la barre latérale pour les onze espaces de l'application.
- Onze pages d'attente avec titre, phrase explicative et badge « Bientôt disponible ».
- Pages `error.tsx`, `loading.tsx` et 404 en français.
- Mise en page responsive et états de focus visibles.
- Variables CSS de marque (`primary`, `accent`, `background`, `foreground`) exposées à Tailwind.
- Métadonnées françaises et police Geist chargée via `next/font`.
- Fichier `.env.example` sans valeurs et exclusion des fichiers `.env*`.
- Règles permanentes documentées dans `AGENTS.md`.

## Prévu

- Authentification Supabase et protection des routes de l'espace applicatif.
- Gestion des rôles et permissions côté base de données et serveur.
- Activation réelle des formulaires de connexion et d'inscription.
- Recherche fonctionnelle dans l'espace applicatif.
- Import et consultation des données académiques officielles vérifiées.
- Notifications et communications institutionnelles.
- Tests automatisés et déploiement.

## Limites actuelles

- L'espace applicatif est une coquille : les routes ne sont pas encore protégées.
- Aucune donnée académique, aucun utilisateur et aucune statistique ne sont affichés.
- Les formulaires et la recherche sont volontairement désactivés.
