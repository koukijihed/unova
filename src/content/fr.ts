export const fr = {
  site: {
    name: "UNOVA",
    institution: "ESSECT",
    city: "Tunis",
    title: "UNOVA — Université numérique de l'ESSECT",
    description:
      "UNOVA est la plateforme numérique de l'ESSECT à Tunis. Votre université, un seul espace numérique.",
  },
  common: {
    comingSoon: "Bientôt disponible",
    loading: "Chargement…",
    retry: "Réessayer",
  },
  brand: {
    logoAlt: "Logo UNOVA",
  },
  publicNav: {
    ariaLabel: "Navigation publique",
    home: "Accueil",
    programs: "Formations",
    login: "Connexion",
  },
  footer: {
    addressLabel: "Adresse",
    address: "4, Rue Abou Zakaria El Hafsi - 1089 Montfleury - Tunis",
    tagline: "UNOVA, plateforme numérique de l'ESSECT",
    copyright: "© 2026 UNOVA — ESSECT. Tous droits réservés.",
  },
  home: {
    eyebrow: "ESSECT · Tunis",
    slogan: "Votre université, un seul espace numérique.",
    presentation:
      "UNOVA réunit les services académiques et de gestion de l'ESSECT dans un espace unique, clair et accessible.",
    primaryCta: "Se connecter",
    secondaryCta: "Créer un compte",
    spacesEyebrow: "Deux espaces, une seule université",
    spacesTitle: "Découvrez les espaces UNOVA",
    spacesDescription:
      "La plateforme est en cours de déploiement. Les espaces ci-dessous seront activés progressivement.",
    academic: {
      title: "UNOVA Académique",
      description:
        "Un espace dédié aux cours, aux documents, aux vidéos, aux emplois du temps et aux questions-réponses.",
      items: ["Cours", "Documents", "Vidéos", "Emplois du temps", "Questions"],
    },
    management: {
      title: "UNOVA Gestion",
      description:
        "Un espace dédié aux étudiants, aux enseignants, aux programmes et aux années universitaires.",
      items: ["Étudiants", "Enseignants", "Programmes", "Années universitaires"],
    },
  },
  auth: {
    notice: "Disponible prochainement",
    login: {
      metadataTitle: "Connexion — UNOVA",
      title: "Connexion",
      description: "Accédez à votre espace UNOVA.",
      emailLabel: "Adresse e-mail",
      emailPlaceholder: "Votre adresse e-mail",
      passwordLabel: "Mot de passe",
      passwordPlaceholder: "Votre mot de passe",
      submit: "Se connecter",
      noAccount: "Pas encore de compte ?",
      createAccount: "Créer un compte",
    },
    register: {
      metadataTitle: "Inscription — UNOVA",
      title: "Inscription",
      description: "Créez votre compte UNOVA.",
      firstNameLabel: "Prénom",
      firstNamePlaceholder: "Votre prénom",
      lastNameLabel: "Nom",
      lastNamePlaceholder: "Votre nom",
      emailLabel: "Adresse e-mail",
      emailPlaceholder: "Votre adresse e-mail",
      passwordLabel: "Mot de passe",
      passwordPlaceholder: "Choisissez un mot de passe",
      submit: "Créer mon compte",
      hasAccount: "Vous avez déjà un compte ?",
      signIn: "Se connecter",
    },
  },
  app: {
    sidebarNotice:
      "Aperçu de l'interface. L'authentification sera activée prochainement.",
    nav: {
      ariaLabel: "Navigation de l'espace UNOVA",
      items: [
        { label: "Tableau de bord", href: "/tableau-de-bord" },
        { label: "Académique", href: "/academique" },
        { label: "Programmes", href: "/programmes" },
        { label: "Cours", href: "/cours" },
        { label: "Documents", href: "/documents" },
        { label: "Vidéos", href: "/videos" },
        { label: "Emplois du temps", href: "/emplois-du-temps" },
        { label: "Questions-Réponses", href: "/questions-reponses" },
        { label: "Notifications", href: "/notifications" },
        { label: "Profil", href: "/profil" },
        { label: "Gestion", href: "/gestion" },
      ],
    },
    openMenu: "Ouvrir le menu de navigation",
    closeMenu: "Fermer le menu de navigation",
    searchLabel: "Rechercher dans UNOVA",
    searchPlaceholder: "Rechercher dans UNOVA…",
    searchUnavailable: "La recherche sera disponible prochainement.",
    profileLink: "Mon profil",
    avatarAlt: "Photo de profil",
    pages: {
      dashboard: {
        title: "Tableau de bord",
        description:
          "Votre espace personnel réunira les informations essentielles de votre parcours.",
      },
      academic: {
        title: "Académique",
        description:
          "Cet espace regroupera les résultats et le suivi académique officiels.",
      },
      programs: {
        title: "Programmes",
        description:
          "Les programmes de formation officiels de l'ESSECT seront consultables ici.",
      },
      courses: {
        title: "Cours",
        description:
          "Les cours et supports pédagogiques seront accessibles depuis cet espace.",
      },
      documents: {
        title: "Documents",
        description:
          "Vos documents administratifs et académiques seront disponibles ici.",
      },
      videos: {
        title: "Vidéos",
        description:
          "Les vidéos pédagogiques seront regroupées dans cet espace.",
      },
      schedule: {
        title: "Emplois du temps",
        description: "Les emplois du temps officiels seront publiés ici.",
      },
      qa: {
        title: "Questions-Réponses",
        description:
          "Cet espace permettra d'échanger des questions et des réponses.",
      },
      notifications: {
        title: "Notifications",
        description:
          "Vos notifications et communications institutionnelles apparaîtront ici.",
      },
      profile: {
        title: "Profil",
        description:
          "Vos informations personnelles et préférences seront gérées ici.",
      },
      management: {
        title: "Gestion",
        description:
          "L'espace de gestion sera réservé aux profils autorisés.",
      },
    },
  },
  errors: {
    title: "Une erreur est survenue",
    description:
      "Nous n'avons pas pu afficher cette page. Veuillez réessayer.",
  },
  notFound: {
    title: "Page introuvable",
    description:
      "La page que vous recherchez n'existe pas ou n'est plus disponible.",
    backHome: "Retour à l'accueil",
  },
} as const;
