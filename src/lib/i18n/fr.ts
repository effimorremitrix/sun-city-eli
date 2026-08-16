import type { Dict } from "./he";

export const fr: Dict = {
  dir: "ltr",
  langName: "Français",

  nav: {
    properties: "Biens",
    sellers: "Vendre",
    buyers: "Acheter",
    services: "Nos services",
    team: "Notre équipe",
    contact: "Contact",
  },

  header: {
    personalArea: "Mon espace",
    authArea: "Connexion",
    admin: "Administration",
    logout: "Déconnexion",
    hello: "Bonjour,",
    freeValuation: "Estimation gratuite",
  },

  hero: {
    ctaValuation: "Obtenez une estimation gratuite",
    ctaProperties: "Voir les biens",
    badgeTop10: "Top 10 des agences de Netanya",
    badgeWhatsapp: "Rejoindre le groupe WhatsApp",
  },

  properties: {
    label: "Biens à Netanya",
    title: "Biens à vendre et à louer",
    aiLabel: "Recherche intelligente, avec vos mots",
    aiPlaceholder: "ex. : 4 pièces avec mamad et parking à Ir Yamim jusqu'à 2,5 M",
    aiButton: "Recherche intelligente",
    aiBusy: "Recherche…",
    aiClear: "Effacer la recherche",
    aiDefaultExplanation: "Nous avons filtré les biens selon votre demande.",
    aiNote:
      "La recherche affiche d'abord les biens de l'agence, et pour les utilisateurs connectés — aussi de vraies annonces du web avec un lien vers la source. Aucun bien inventé.",
    filterDeal: "Type de transaction",
    filterRooms: "Pièces (min)",
    filterPrice: "Fourchette de prix",
    filterArea: "Quartier de Netanya",
    all: "Tout",
    allAreas: "Tous les quartiers",
    dealSale: "Vente",
    dealRent: "Location",
    found: (n: number) => `${n} biens trouvés`,
    alertsCta: "Agent personnel : alertes sur les nouveaux biens",
    emptyTitle: "Aucun bien ne correspond à ce filtre",
    emptyText: "Dites-nous ce que vous cherchez et nous trouverons le bien qu'il vous faut.",
    emptyWa: "Bien à la demande via WhatsApp",
    yad2: "Toutes les annonces de l'agence sur Yad2",
    rooms: "pièces",
    sqm: "m²",
    floor: "Étage",
    noInfo: "N/D",
    details: "Détails",
    waDetails: "Détails sur WhatsApp",
    agentOfListing: "Agent du bien :",
    photosCount: (n: number) => `${n} photos`,
    noImage: "Pas d'image",
    modal: {
      deal: "Type de transaction",
      agent: "Agent",
      address: "Adresse",
      rooms: "Pièces",
      size: "Surface",
      floor: "Étage",
      mamad: "Mamad (abri)",
      elevator: "Ascenseur",
      parking: "Parking",
      balcony: "Balcon",
      yes: "Oui",
      no: "Non",
      interested: "Ce bien m'intéresse",
      fullName: "Nom complet",
      phone: "Téléphone",
      sendWa: "Envoyer via WhatsApp",
    },
    features: { mamad: "Mamad", elevator: "Ascenseur", parking: "Parking", balcony: "Balcon" },
    web: {
      title: "Plus d'options sur le marché",
      subtitle:
        "De vraies annonces trouvées sur le web selon votre recherche, avec un lien vers la source.",
      remaining: (n: number) => ` ${n} analyses restantes aujourd'hui.`,
      match: "Correspondance :",
      source: "Annonce originale",
      talk: "Parlez-moi de ce bien",
      loginTitle: "Vous voulez que nous cherchions aussi sur tout le web ?",
      loginText:
        "Les utilisateurs connectés bénéficient aussi d'une vraie analyse du web (Yad2, Madlan et plus) selon leur recherche.",
      loginCta: "Connexion gratuite",
      quota:
        "Vous avez utilisé votre quota d'analyses du jour. Les biens de l'agence continuent d'être mis à jour ici, et vous pourrez relancer demain.",
      unavailable:
        "L'analyse du web n'a pas abouti cette fois. Les biens de l'agence sont affichés ci-dessus — réessayez dans un instant.",
      empty:
        "Nous avons analysé le web et n'avons trouvé aucune annonce supplémentaire correspondante pour le moment. Reformulez, ou laissez vos coordonnées et nous chercherons pour vous.",
    },
  },

  team: {
    label: "Des personnes, pas une société",
    title: "Notre équipe",
    titleOthers: "D'autres agents Sun City",
    subtitle:
      "Choisissez un agent, pas une société. Parlez directement avec la personne qui s'occupera de vous — chaque agent a sa propre page personnelle.",
    whatsapp: "WhatsApp",
    call: "Appeler",
    toOffice: "Contacter l'agence",
    toPersonalPage: (name: string) => `La page personnelle de ${name}`,
  },

  contact: {
    label: "Contact",
    title: "Parlons-en",
    address: "Adresse",
    waze: "Itinéraire Waze",
    maps: "Google Maps",
    phone: "Téléphone",
    email: "E-mail",
    hours: "Horaires d'ouverture",
    sendWa: "Envoyer un message WhatsApp",
    formLabel: "Formulaire de contact",
    fullName: "Nom complet",
    phoneField: "Téléphone",
    topic: "Objet",
    topicChoose: "Choisir",
    topicSeller: "Vendeur",
    topicBuyer: "Acheteur",
    topicInvestor: "Investisseur",
    topicOther: "Autre",
    message: "Message",
    send: "Envoyer",
  },

  footer: {
    contactDetails: "Coordonnées",
    links: "Liens",
    properties: "Biens",
    valuation: "Estimation gratuite",
    madlan: "Page de l'agence sur Madlan",
    team: "Notre équipe",
    accessibility: "Déclaration d'accessibilité",
    privacy: "Politique de confidentialité",
    myArea: "Mon espace",
    admin: "Administration",
    license: "Licence immobilière :",
    rights: "Tous droits réservés.",
  },

  mobileBar: { whatsapp: "WhatsApp", call: "Appeler", properties: "Biens" },

  sections: {
    servicesLabel: "Ce que nous faisons",
    servicesTitle: "Nos services",
    whyLabel: "Pourquoi nous",
    whyTitle: "Pourquoi Sun City",
    waDetails: "Détails sur WhatsApp",
    testimonialsLabel: "Nos clients racontent",
    testimonialsTitle: "Témoignages de clients",
    testimonialPrev: "Témoignage précédent",
    testimonialNext: "Témoignage suivant",
    testimonialOf: (i: number, n: number) => `${i} sur ${n}`,
    faqLabel: "Questions & réponses",
    faqTitle: "Questions fréquentes",
  },

  seller: {
    label: "Vous vendez ?",
    title: "Combien vaut votre appartement aujourd'hui ?",
    subtitle:
      "Une estimation professionnelle, gratuite et sans engagement, basée sur de vraies transactions conclues dans votre rue.",
    formLabel: "Formulaire d'estimation gratuite",
    fullName: "Nom complet",
    phone: "Téléphone",
    address: "Adresse du bien",
    rooms: "Nombre de pièces",
    choose: "Choisir",
    submit: "Recevoir mon estimation gratuite",
    note: "Vos coordonnées nous sont envoyées via WhatsApp et ne sont pas conservées sur le site.",
    errName: "Veuillez saisir votre nom",
    errAddress: "Veuillez saisir l'adresse du bien",
    steps: [
      { title: "Laissez vos coordonnées", text: "Un court formulaire, sans engagement" },
      { title: "Nous visitons le bien", text: "Une visite professionnelle" },
      { title: "Recevez une estimation écrite", text: "Sous 48 heures" },
    ],
  },

  buyer: {
    label: "Vous achetez ?",
    title: "Des biens qui vous parviennent avant d'arriver sur Yad2",
    subtitle: (group: string) =>
      `Les membres du groupe « ${group} » reçoivent nos nouveaux biens en premier. L'adhésion est gratuite.`,
    joinGroup: "Rejoindre le groupe de biens",
    groupFull: "Groupe complet ?",
    joinSecond: "Rejoignez le second groupe",
    formTitle: "Bien à la demande",
    formSubtitle:
      "Dites-nous ce que vous cherchez et nous vous préviendrons dès qu'un bien correspondant arrive.",
    formLabel: "Formulaire bien à la demande",
    budget: "Budget",
    rooms: "Pièces",
    area: "Quartier préféré",
    submit: "Envoyer",
  },

  content: {
    about:
      "Sun City est la première agence immobilière de Netanya, spécialisée dans des services immobiliers complets. Nous offrons à nos clients un accompagnement professionnel et personnel tout au long du processus d'achat ou de vente. Forts d'une riche expérience du marché local et d'un engagement d'excellence, nous sommes là pour transformer votre rêve immobilier en réalité.",
    story:
      "Sun City Immobilier est née d'une passion pour le marché immobilier et d'un engagement envers un service de qualité. Depuis notre création, nous avons aidé des centaines de clients à trouver le bien parfait, à vendre leur appartement rapidement et au meilleur prix, et à investir intelligemment dans l'immobilier.",
    values: [
      { title: "Professionnalisme", text: "Un service professionnel au plus haut niveau." },
      { title: "Transparence", text: "Partage complet de toutes les informations pertinentes." },
      { title: "Fiabilité", text: "Intégrité et responsabilité dans chaque action." },
    ],
    services: [
      {
        title: "Conseil immobilier professionnel",
        text: "Un accompagnement personnel à chaque étape de l'achat ou de la vente, de l'estimation à la conclusion réussie.",
      },
      {
        title: "Estimation de biens",
        text: "Une estimation précise fondée sur des données de marché à jour et une connaissance fine du quartier.",
      },
      {
        title: "Courtage et gestion de transactions",
        text: "Recherche d'acheteurs ou de vendeurs, négociation et accompagnement jusqu'à la signature.",
      },
      {
        title: "Conseil juridique",
        text: "En coopération avec un avocat spécialisé en immobilier, pour une sécurité juridique totale.",
      },
    ],
    faq: [
      {
        q: "Combien coûte le service de courtage ?",
        a: "Le paiement est uniquement au succès — vous ne payez que lorsqu'une transaction est conclue. Les honoraires sont fixés à l'avance dans un accord écrit, selon le type et l'ampleur de la transaction.",
      },
      {
        q: "Combien de temps faut-il pour vendre un appartement à Netanya ?",
        a: "Dans le marché actuel, un appartement au juste prix se vend généralement en deux semaines à trois mois. Un prix juste dès le départ est le facteur le plus déterminant.",
      },
      {
        q: "L'estimation est-elle vraiment gratuite ?",
        a: "Oui. L'estimation est fournie gratuitement et sans engagement, même si vous décidez finalement de ne pas vendre ou de ne pas travailler avec nous.",
      },
      {
        q: "Travaillez-vous en exclusivité ?",
        a: "Oui, nous travaillons uniquement en exclusivité. L'exclusivité nous permet d'investir un budget marketing complet dans votre bien, de maîtriser le prix et la présentation du bien auprès de tous les acheteurs, et de vous fournir un reporting régulier et cohérent d'un seul interlocuteur responsable du résultat, du début jusqu'à la signature.",
      },
      {
        q: "Quels quartiers couvrez-vous ?",
        a: "Tout Netanya et ses environs : centre-ville, Kiryat HaSharon, Kiryat Nordau, Kiryat Sanz, Ramat Efraim, Ramat Poleg, Ir Yamim, Neot Herzl, Agamim, Pardes HaGdud, Nof HaTayelet, Ein HaTchelet et Givat HaIrusim.",
      },
      {
        q: "Que faut-il apporter au premier rendez-vous ?",
        a: "Un extrait du registre foncier (Tabou) ou une attestation de droits, le plan de l'appartement s'il existe, et les détails des rénovations et ajouts. Si vous ne les avez pas — nous vous aiderons à les obtenir.",
      },
    ],
    testimonials: [
      {
        quote:
          "Je tiens à vous remercier pour l'excellent travail lors de la vente de l'appartement. Dès le premier appel, j'ai ressenti une vraie connexion et de la confiance. J'ai reçu bien plus que ce que j'attendais, et surtout la tranquillité d'esprit.",
        name: "Erika S.",
        type: "Achat d'un appartement à Netanya",
      },
      {
        quote:
          "Un travail professionnel, dévoué et inlassable. Toujours au travail, toujours en marketing, toujours des acheteurs. J'ai connu pas mal d'agents, mais jamais une agente comme elle.",
        name: "Anna K.",
        type: "Vente d'un appartement à Netanya",
      },
      {
        quote:
          "Une équipe exceptionnelle. Communication ouverte, transparence totale et sentiment de sécurité. Nous savions à chaque étape ce qui se passait. Leur disponibilité était sans compromis.",
        name: "Arik",
        type: "Vente d'un appartement",
      },
      {
        quote:
          "Un accompagnement et une négociation parfaits du début à la fin. Professionnalisme, discernement et sens du service au plus haut niveau.",
        name: "Sarel D.",
        type: "Achat d'un appartement d'investissement",
      },
      {
        quote:
          "Nous avons rencontré plusieurs agents et les avons choisis parce que ce sont des gens authentiques et agréables. Ils ont fait un travail magnifique pour nous dans une période difficile.",
        name: "Uriel N.",
        type: "Netanya",
      },
      {
        quote:
          "Après avoir échoué à louer par moi-même, je me suis adressé à l'agence et j'ai trouvé un agent sérieux et honnête qui se fixe un objectif et ne s'arrête pas avant de l'atteindre.",
        name: "Danny A.",
        type: "Avis Google",
      },
    ],
  },

  langSwitcher: "Langue",
};
