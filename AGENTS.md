<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UNOVA — Règles permanentes

Ces règles s'appliquent à toutes les tâches du projet.

1. **Interface en français uniquement.** Tous les textes visibles, libellés, messages d'erreur, e-mails et métadonnées sont rédigés en français. Les chaînes de l'interface sont centralisées dans `src/content/fr.ts`.
2. **Aucun secret dans le frontend.** Ne jamais placer de secret ni de clé service-role dans du code exposé au navigateur. Ne jamais journaliser ni afficher un CIN.
3. **Permissions vérifiées côté base de données et serveur.** Ne pas se contenter de masquer une action dans l'interface : toute autorisation doit être appliquée dans la base de données et sur le serveur.
4. **Aucune donnée académique inventée.** Les données officielles proviennent uniquement d'imports vérifiés.
5. **Dépendances minimales.** N'ajouter une dépendance que lorsqu'une tâche l'exige.
6. **Statut à jour.** Maintenir `docs/STATUS.md` avec deux listes : « Implémenté » et « Prévu ».
