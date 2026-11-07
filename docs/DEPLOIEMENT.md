# Déploiement sur Cloudflare Workers

Dernière mise à jour : 7 novembre 2026

Ce document décrit la configuration OpenNext/Cloudflare du projet UNOVA, les
commandes de prévisualisation et de déploiement, la gestion des variables
d'environnement et la procédure de retour arrière.

## Statut actuel

L'application est **déployée en production** sur
<https://unova.unova-app-essect.workers.dev> (Worker `unova`, version
`5549992f-2d01-4442-9339-b2eb4563c60f`, 7 novembre 2026). Le domaine
personnalisé reste à configurer.

La configuration est prête, le build de l'adaptateur réussit et la
prévisualisation locale dans workerd fonctionne. Pour contourner le défaut
amont qui bloquait les routes dynamiques, **Cache Components est désactivé**
dans `next.config.ts`. Voir la section
[Cache Components et compatibilité Cloudflare](#10-cache-components-et-compatibilité-cloudflare).

## 1. Prérequis

- **Node.js 22 ou supérieur** (testé avec Node.js 22.23.4).
- **npm** (le projet utilise `package-lock.json`).
- Un **compte Cloudflare** avec accès à Workers & Pages.
- Un **projet Supabase** configuré (URL, clé publishable, clé secrète).
- Les valeurs de `CIN_PEPPER` et de la clé secrète Supabase, stockées hors du
  dépôt.
- **Wrangler 4.158.0** (installé comme dépendance de développement).
- Pour le développement local : Windows fonctionne, mais OpenNext recommande
  **WSL** ; un avertissement de compatibilité Windows est émis à chaque build.

## 2. Fichiers de configuration

| Fichier | Rôle |
| --- | --- |
| `wrangler.jsonc` | Worker `unova`, date de compatibilité, `nodejs_compat`, actifs statiques, binding d'auto-référence et binding Images. Aucun secret. |
| `open-next.config.ts` | Configuration de l'adaptateur. Le cache incrémental R2 est désactivé (ligne commentée). |
| `next.config.ts` | Configuration Next.js, dont l'initialisation d'OpenNext pour `next dev`. Cache Components est désactivé (voir section 10). |
| `public/_headers` | En-têtes de cache longs pour `/_next/static/*`. |
| `cloudflare-env.d.ts` | Types générés localement par `npm run cf-typegen` (ignoré par Git) ; à régénérer après toute modification des bindings. |
| `src/proxy.ts` | Rafraîchissement de session Supabase. Le middleware Node.js est **expérimental** dans l'adaptateur Cloudflare. |

Le Worker utilise `nodejs_compat`, nécessaire notamment à `node:crypto` pour
l'empreinte HMAC-SHA256 des CIN. La logique de sécurité n'a pas été modifiée.

## 3. Variables d'environnement

Aucune valeur réelle ne doit être commitée. Les noms ci-dessous sont les seuls
nécessaires.

| Nom | Type | Portée | Moment |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publique | Navigateur et serveur | Build et exécution |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publique | Navigateur et serveur | Build et exécution |
| `NEXT_PUBLIC_APP_URL` | Publique | Navigateur et serveur | Build et exécution |
| `SUPABASE_SECRET_KEY` | **Secrète** | Serveur uniquement | Exécution |
| `CIN_PEPPER` | **Secrète** | Serveur uniquement | Exécution |
| `NEXTJS_ENV` | Locale | Wrangler local | Développement local uniquement |

`NEXT_PUBLIC_*` est intégré au bundle client par Next.js au moment du build.
Ces variables doivent donc être présentes dans l'environnement de build, en
plus d'être disponibles à l'exécution pour le code serveur.

### 3.1 Build local ou CI

Créer `.env.local` à partir de `.env.example` et renseigner les valeurs
localement. Ce fichier est ignoré par Git.

Pour la production, créer `.env.production.local` avec l'URL publique :

```sh
NEXT_PUBLIC_APP_URL=https://unova.unova-app-essect.workers.dev
```

Ce fichier est également ignoré par Git (`.env*`, sauf `.env.example`).
`.env.production.local` est chargé en priorité sur `.env.local` lors d'un
build de production.

Pour un build en CI (y compris Workers Builds), définir les mêmes variables
dans les « Build variables and secrets » de l'environnement de build.

> **Important** : les variables `NEXT_PUBLIC_*` sont figées dans le bundle au
> moment du build. Modifier `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`
> ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exige donc un nouveau build et un
> nouveau déploiement ; les modifier dans le tableau de bord Cloudflare n'a
> aucun effet sur ces valeurs.

### 3.2 Variables d'exécution en production

Dans le tableau de bord Cloudflare : **Workers & Pages → unova → Settings →
Variables and Secrets**.

- Ajouter les variables **publiques** comme « Variables ».
- Ajouter `SUPABASE_SECRET_KEY` et `CIN_PEPPER` comme « Secrets ».
- Ne jamais placer ces valeurs dans `wrangler.jsonc` ni dans le code frontend.

Les secrets peuvent aussi être créés en ligne de commande. La valeur est
demandée interactivement et n'apparaît pas dans l'historique du shell :

```sh
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put CIN_PEPPER
```

Lister les secrets existants sans afficher leur valeur :

```sh
npx wrangler secret list
```

Lors d'un déploiement, utiliser `--keep-vars` pour conserver les variables
définies dans le tableau de bord :

```sh
npm run deploy -- --keep-vars
```

## 4. Première mise en place

```sh
npm ci
npx wrangler login
npx wrangler whoami
npm run cf-typegen
```

`npx wrangler login` ouvre le navigateur. En CI, utiliser plutôt une variable
`CLOUDFLARE_API_TOKEN` avec les droits minimaux nécessaires, sans la commiter.

## 5. Prévisualisation locale

```sh
npm run preview
```

Cette commande construit l'application avec l'adaptateur puis démarre un serveur
Wrangler local sur <http://127.0.0.1:8787>.

Routes à vérifier :

- `/` : page d'accueil.
- `/connexion` : formulaire de connexion.
- `/inscription` : formulaire d'inscription.
- `/mot-de-passe-oublie` : demande de réinitialisation.
- `/tableau-de-bord`, `/gestion`, `/verification` : doivent rediriger un
  visiteur non connecté vers `/connexion?redirection=...`.

État mesuré le 7 novembre 2026, avec Cache Components désactivé :

- `/`, `/connexion`, `/inscription` et `/mot-de-passe-oublie` répondent
  **200**.
- `/tableau-de-bord`, `/gestion` et `/verification` répondent **200** avec une
  redirection de streaming Next.js (`<meta http-equiv="refresh">` et
  `NEXT_REDIRECT`) vers respectivement
  `/connexion?redirection=%2Ftableau-de-bord`,
  `/connexion?redirection=%2Fgestion` et
  `/connexion?redirection=%2Fverification`. Ce n'est pas un code 307 : sans
  Cache Components, Next.js diffuse la page puis redirige côté client.
- Aucune erreur « Worker's code had hung » ni erreur 500 dans le journal
  Wrangler.

## 6. Vérifications avant déploiement

```sh
npm run lint
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
```

Dernière mesure du bundle avec `npx wrangler deploy --dry-run` :

- Taille non compressée : **8,92 Mio** (9 136,97 KiB).
- Taille gzip : **1,94 Mio** (1 986,00 KiB).

La limite actuelle de Cloudflare est de **64 Mio non compressés** par Worker
(documentation « Limits » mise à jour le 29 octobre 2026) et il n'existe plus de
limite de taille compressée. Le bundle tient donc dans le plan Workers Free.

Attention : le plan Free limite le temps CPU à **10 ms par requête** et à
100 000 requêtes par jour. Le rendu serveur Next.js peut dépasser 10 ms ; pour
une mise en production réelle, le plan Workers Paid est recommandé.

## 7. Déploiement

URL de production : <https://unova.unova-app-essect.workers.dev>

Commande de (re)déploiement :

```sh
npm run deploy -- --keep-vars
```

La commande construit l'application, prépare le bundle OpenNext, puis déploie le
Worker `unova`. `--keep-vars` conserve les variables et secrets définis dans le
tableau de bord Cloudflare.

Premier déploiement effectué le 7 novembre 2026 :

- URL : <https://unova.unova-app-essect.workers.dev>
- Version : `5549992f-2d01-4442-9339-b2eb4563c60f`

Rappel : les valeurs `NEXT_PUBLIC_*` sont intégrées au build. Après toute
modification de ces variables (ou du domaine), relancer
`npm run deploy -- --keep-vars`.

Pour publier une version sans basculer immédiatement 100 % du trafic :

```sh
npm run upload
npx wrangler versions list
npx wrangler versions deploy
```

Ajouter ensuite le domaine personnalisé ou la route souhaitée dans
**Workers & Pages → unova → Settings → Domains & Routes**. Renseigner
`NEXT_PUBLIC_APP_URL` avec l'URL publique finale, puis reconstruire et
redéployer : cette valeur est intégrée au build.

### Optimisation des images

`wrangler.jsonc` déclare le binding `IMAGES` pour l'optimisation des images
Next.js. Vérifier que Cloudflare Images est disponible sur le compte avant le
déploiement. Si l'optimisation d'images n'est pas utilisée, retirer le bloc
`images` de `wrangler.jsonc` et régénérer les types.

## 8. Cache incrémental R2 (optionnel)

Le cache R2 est désactivé par défaut. Pour l'activer :

```sh
npx wrangler r2 bucket create unova-opennext-cache
```

Ajouter le binding dans `wrangler.jsonc` :

```jsonc
"r2_buckets": [
  {
    "binding": "NEXT_INC_CACHE_R2_BUCKET",
    "bucket_name": "unova-opennext-cache"
  }
]
```

Puis décommenter l'import et `incrementalCache` dans `open-next.config.ts` et
relancer `npm run cf-typegen`.

## 9. Retour arrière

Lister les déploiements récents :

```sh
npx wrangler deployments list
```

Revenir à une version précédente :

```sh
npx wrangler rollback <identifiant-de-version> --name unova --message "Retour à la version précédente"
```

Le tableau de bord permet aussi de revenir à un déploiement antérieur depuis
**Workers & Pages → unova → Deployments**.

Un retour arrière ne restaure pas les valeurs de secrets : si un secret a été
modifié ou supprimé, il faut le recréer avec `wrangler secret put`.

## 10. Cache Components et compatibilité Cloudflare

### Décision

Cache Components (`cacheComponents`) et le préchargement partiel
(`partialPrefetching`) sont **désactivés** dans `next.config.ts`. Les 14
exports `export const instant = false;` ont été retirés : cet export n'est
valide que lorsque `cacheComponents` est activé, et `partialPrefetching`
dépend lui aussi de `cacheComponents`.

Cette désactivation est un contournement, pas un choix de conception.

### Raison

Avec Next.js **16.4.5** et `@opennextjs/cloudflare` **1.20.16**, activer
`cacheComponents` provoque dans workerd le blocage des routes dynamiques :
le runtime annule la requête et répond une erreur 500
« The Workers runtime canceled this request because it detected that your
Worker's code had hung and would never generate a response. » Le journal
affiche aussi l'avertissement :

`Next.js cannot guarantee that Cache Components will run as expected due to
the current runtime's implementation of setTimeout()`.

Le problème a été isolé :

- il persiste avec `src/proxy.ts` désactivé ;
- il n'affecte pas les actifs statiques ;
- il disparaît dès que `cacheComponents` est désactivé.

Les routes restent dynamiques grâce à `await connection()` dans
`src/lib/supabase/server.ts` ; aucun `export const dynamic` ni `<Suspense>`
supplémentaire n'a été nécessaire.

### Réactivation

Le correctif amont est la pull request
[opennextjs/opennextjs-cloudflare#1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318),
**non publiée** au 7 novembre 2026 (le tag npm `latest` reste 1.20.16).

Pour réactiver Cache Components :

1. Mettre à jour `@opennextjs/cloudflare` vers une version incluant le
   correctif.
2. Rétablir `cacheComponents: true` et `partialPrefetching: true` dans
   `next.config.ts`, puis restaurer les exports `instant` nécessaires.
3. Relancer `npm run lint`, `npm run build`, `npx opennextjs-cloudflare build`
   et `npm run preview`, puis vérifier les routes de la section 5.
4. Ne déployer en production qu'après un test local concluant.

## 11. Sécurité

- Ne jamais commiter `.env.local`, `.dev.vars` ni une valeur de secret.
- `.env*`, `.dev.vars*`, `.open-next` et `.wrangler` sont ignorés par Git.
- `SUPABASE_SECRET_KEY` et `CIN_PEPPER` restent exclusivement côté serveur.
- Ne jamais journaliser ni afficher un CIN.
- Les permissions restent appliquées par la base de données et le serveur ;
  masquer une action dans l'interface ne suffit pas.
- En cas d'exposition d'un secret, le révoquer et le remplacer immédiatement.
