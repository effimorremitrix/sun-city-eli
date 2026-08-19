import type { Dict } from "./he";

/* Dictionnaire français — reflète exactement la source hébraïque. */

export const fr: Dict = {
  seo: {
    title: "Immobilier à Netanya | Sun City — Appartements à vendre à Netanya",
    description:
      "Sun City Immobilier, agence à Netanya : appartements à vendre et à louer à Netanya, estimation gratuite pour les vendeurs, groupe de biens pour les acheteurs et accompagnement personnalisé jusqu'à la signature.",
    areaServed: "Netanya",
  },

  nav: {
    langsLabel: "Choisir la langue",
    brandSuffix: "Immobilier",
    links: [
      { id: "properties", label: "Biens" },
      { id: "sellers", label: "Vendre un bien" },
      { id: "buyers", label: "Acheteurs" },
      { id: "services", label: "Nos services" },
      { id: "team", label: "L'équipe" },
      { id: "contact", label: "Contact" },
    ],
    logoAlt: "Logo Sun City Immobilier",
    toTopAria: (name: string) => `${name} — retour en haut`,
    mainNavAria: "Navigation principale",
    mobileNavAria: "Navigation mobile",
    openMenu: "Ouvrir le menu de navigation",
    closeMenu: "Fermer le menu de navigation",
    callAria: (phone: string) => `Appeler l'agence au ${phone}`,
    hello: "Bonjour,",
    defaultUser: "Utilisateur",
    myAccount: "Mon espace",
    authArea: "Espace personnel",
    logout: "Déconnexion",
    logoutFull: "Se déconnecter",
    logoutAria: "Se déconnecter",
    freeValuation: "Estimation gratuite",
  },

  hero: {
    logoAlt: "Logo Sun City Immobilier — un soleil orange au-dessus d'un toit",
    imageAlt: "Un salon spacieux et lumineux dans un appartement de luxe avec de grandes fenêtres",
    ctaValuation: "Obtenez une estimation gratuite",
    ctaProperties: "Voir les biens",
    badgeTop10: "Parmi le top 10 à Netanya",
    badgeGroup: "Rejoindre notre groupe WhatsApp",
    slidesAria: "Choisir une image du carrousel",
    slideAria: (n: number) => `Aller à l'image ${n}`,
  },

  team: {
    othersTitle: "D'autres agents Sun City",
    toPersonalPage: (name: string) => `La page personnelle de ${name}`,
    kicker: "Des personnes, pas une société",
    title: "Notre équipe",
    subtitle:
      "Choisissez un agent, pas une société. Parlez directement avec la personne qui s'occupera de vous.",
    names: {
      "אלי כליף": "Eli Khalif",
      "עינבל קובל בוזגלו": "Inbal Kobel Bouzaglo",
      "קובי בוזגלו": "Kobi Bouzaglo",
      "ילנה גנדלין": "Yelena Gandelin",
      "אלעד אבוטבול": "Elad Aboutboul",
      "קוראל בוחבוט": "Coral Bohbot",
      "דניאל מוצא": "Daniel Motza",
    } as Record<string, string>,
    roles: {
      "אלי כליף": "Associé et propriétaire, expert immobilier du sud de Netanya",
      "עינבל קובל בוזגלו": "Responsable d'équipe et associée, spécialiste des appartements anciens",
      "קובי בוזגלו":
        "Conseiller immobilier et crédit — centre et nord de Netanya, clients de l'étranger",
      "ילנה גנדלין": "Experte immobilière, est et sud de Netanya, russophone",
      "אלעד אבוטבול": "Spécialiste des appartements anciens, centre et sud de Netanya",
      "קוראל בוחבוט":
        "Conseillère immobilière, estimations et accompagnement des clients de l'étranger",
      "דניאל מוצא": "Expert immobilier, sud de Netanya",
    } as Record<string, string>,
    photoAlt: (name: string, role: string) => `${name} — ${role}`,
    whatsapp: "WhatsApp",
    call: "Appeler",
    contactOffice: "Contacter l'agence",
    waAgentAria: (name: string) => `Envoyer un message WhatsApp à ${name}`,
    callAria: (name: string) => `Appeler ${name}`,
    officeAria: (name: string) => `Contacter l'agence au sujet de ${name}`,
    waAgent: (name: string, office: string) =>
      `Bonjour ${name}, je vous ai trouvé via le site de ${office} et j'aimerais échanger.`,
    waOffice: (office: string, name: string) =>
      `Bonjour ${office}, je souhaite contacter l'agence au sujet de ${name}.`,
  },

  properties: {
    agentOfListing: "Agent du bien :",
    web: {
      title: "Plus d'options sur le marché",
      subtitle:
        "De vraies annonces trouvées sur le web selon votre recherche, avec un lien vers la source.",
      remaining: (n: number) => ` ${n} analyses restantes aujourd'hui.`,
      match: "Correspondance :",
      colSource: "Source",
      colTitle: "Annonce",
      colPrice: "Prix",
      source: "Annonce originale",
      talk: "Parlez-moi de ce bien",
      talkMsg: (agent: string, title: string, url: string) =>
        `Bonjour ${agent}, j'ai trouvé via le site une annonce qui m'intéresse — pouvez-vous la vérifier pour moi ?\n${title}\n${url}`,
      loginTitle: "Vous voulez que nous cherchions aussi sur tout le web ?",
      loginText:
        "Les utilisateurs connectés bénéficient aussi d'une vraie analyse du web (Yad2, Madlan et plus).",
      loginCta: "Connexion gratuite",
      quota:
        "Vous avez utilisé votre quota d'analyses du jour. Les biens de l'agence restent à jour ici, et vous pourrez relancer demain.",
      unavailable:
        "L'analyse du web n'a pas abouti cette fois. Les biens de l'agence sont affichés ci-dessus — réessayez dans un instant.",
      empty:
        "Nous avons analysé le web sans trouver d'annonce supplémentaire correspondante pour le moment. Reformulez, ou laissez vos coordonnées.",
    },
    kicker: "Biens à Netanya",
    title: "Biens à vendre et à louer",
    aiLabel: "Recherche intelligente, avec vos mots",
    aiPlaceholder:
      "Ex. : 4 pièces avec pièce sécurisée et parking à Ir Yamim, jusqu'à 2,5 millions",
    aiAria: "Description libre du bien que vous recherchez",
    aiSearch: "Recherche intelligente",
    aiSearching: "Recherche…",
    aiClear: "Effacer la recherche intelligente",
    aiFallbackExplain: "Nous avons filtré les biens selon votre demande.",
    aiDisclaimer:
      "La recherche ne filtre que des biens réels présents dans la base de données de l'agence. Aucun bien inventé.",
    aiFailed: "La recherche a échoué",
    filterDeal: "Transaction",
    filterAll: "Tout",
    filterRooms: "Pièces (minimum)",
    filterPrice: "Fourchette de prix",
    filterArea: "Quartier de Netanya",
    filterDealAria: "Type de transaction",
    filterRoomsAria: "Nombre de pièces",
    filterPriceAria: "Fourchette de prix",
    filterAreaAria: "Quartier de Netanya",
    allAreas: "Tous les quartiers",
    priceRanges: ["Jusqu'à 1 500 000 ₪", "1 500 000 – 2 000 000 ₪", "2 000 000 ₪ et plus"],
    found: (n: number) => `${n} biens trouvés`,
    sortLabel: "Trier par",
    sortOptions: {
      newest: "Date d'ajout (plus récent d'abord)",
      priceAsc: "Prix : croissant",
      priceDesc: "Prix : décroissant",
      rooms: "Nombre de pièces",
      size: "Surface (m²)",
    },
    personalAgent: "Agent personnel : alertes pour les nouveaux biens",
    viewList: "Liste",
    viewMap: "Carte",
    mapOpenListing: "Voir l'annonce",
    mapNoLocation: "Aucun bien avec une localisation précise à afficher sur la carte.",
    mapMissingCount: (n: number) =>
      `${n} biens ne sont pas sur la carte — ils n'ont pas de localisation précise.`,
    noResultsTitle: "Aucun bien ne correspond à ces filtres",
    noResultsText: "Dites-nous ce que vous cherchez et nous trouverons le bien qui vous convient.",
    waNoResultsBtn: "Bien à la demande via WhatsApp",
    waNoResultsMsg: "Bonjour, je cherche un bien à Netanya. Mes coordonnées : ",
    yad2Btn: "Tous les biens de l'agence sur Yad2",
    noImage: "Pas de photo",
    photosCount: (n: number) => `${n} photos`,
    roomsUnit: "pièces",
    sqm: "m²",
    sqmValue: (n: number) => `${n} m²`,
    floorLabel: (f: string) => `Étage ${f}`,
    detailsBtn: "Détails",
    waDetailsBtn: "Détails sur WhatsApp",
    cardImgAlt: (title: string, hood: string) => `${title} à ${hood}`,
    waListing: (office: string, title: string, addr: string, price: string) =>
      `Bonjour, je vous ai trouvé via le site de ${office}.\nJe suis intéressé par ce bien :\n${title}\n${addr}\nPrix : ${price}`,
    modalAria: (title: string) => `Détails du bien : ${title}`,
    closeModalAria: "Fermer les détails du bien",
    nextImgAria: "Photo suivante",
    prevImgAria: "Photo précédente",
    showImgAria: (n: number) => `Afficher la photo ${n}`,
    galleryImgAlt: (title: string, hood: string, i: number, total: number) =>
      `${title} à ${hood} — photo ${i} sur ${total}`,
    specCaption: "Caractéristiques du bien",
    specDeal: "Type de transaction",
    specAddress: "Adresse",
    specRooms: "Pièces",
    specSize: "Surface",
    specFloor: "Étage",
    features: {
      mamad: "Pièce sécurisée",
      elevator: "Ascenseur",
      parking: "Parking",
      balcony: "Balcon",
      storage: "Débarras",
    },
    yes: "Oui",
    no: "Non",
    mapTitle: (hood: string, city: string) => `Carte du quartier : ${hood}, ${city}`,
    interestedTitle: "Ce bien m'intéresse",
    fullName: "Nom complet",
    phone: "Téléphone",
    sendWa: "Envoyer via WhatsApp",
    waInterested: (
      office: string,
      d: { title: string; hood: string; price: string; name: string; phone: string },
    ) =>
      `Bonjour ${office},\nJe suis intéressé par le bien : ${d.title}\nQuartier : ${d.hood}\nPrix : ${d.price}\nNom : ${d.name}\nTéléphone : ${d.phone}`,
    errName: "Veuillez saisir un nom",
  },

  items: {
    kicker: "De l'agence",
    title: "Actualités et opportunités",
    waBtn: "Détails sur WhatsApp",
    waMsg: (office: string, title: string) =>
      `Bonjour ${office}, je souhaite des détails sur : ${title}`,
  },

  sellers: {
    kicker: "Vous vendez ?",
    title: "Combien vaut votre appartement aujourd'hui ?",
    text: "Une estimation professionnelle, gratuite et sans engagement, basée sur des transactions réelles conclues dans votre rue.",
    steps: [
      { title: "Laissez vos coordonnées", text: "Un formulaire court, sans engagement" },
      { title: "Nous visitons le bien", text: "Une visite professionnelle" },
      { title: "Recevez une estimation écrite", text: "Sous 48 heures" },
    ],
    formAria: "Formulaire d'estimation gratuite",
    fullName: "Nom complet",
    phone: "Téléphone",
    phonePlaceholder: "050-1234567",
    address: "Adresse du bien",
    roomsCount: "Nombre de pièces",
    choose: "Choisir",
    roomsOptions: ["2", "2.5", "3", "3.5", "4", "4.5", "5", "6+"],
    submit: "Recevoir mon estimation gratuite",
    privacyNote:
      "Vos coordonnées nous sont envoyées via WhatsApp et ne sont pas conservées sur le site.",
    errName: "Veuillez saisir un nom",
    errAddress: "Veuillez saisir l'adresse du bien",
    notSpecified: "Non précisé",
    waMsg: (office: string, d: { name: string; phone: string; address: string; rooms: string }) =>
      `Bonjour ${office},\nJe souhaite une estimation gratuite de mon bien.\nNom : ${d.name}\nTéléphone : ${d.phone}\nAdresse du bien : ${d.address}\nPièces : ${d.rooms}`,
  },

  buyers: {
    kicker: "Vous achetez ?",
    title: "Des biens qui vous parviennent avant d'arriver sur Yad2",
    text: (group: string) =>
      `Les membres du groupe « ${group} » reçoivent nos nouveaux biens en premier. L'adhésion est gratuite.`,
    joinGroup: "Rejoindre le groupe de biens",
    groupFullQ: "Groupe complet ?",
    secondGroup: "Rejoignez le second groupe",
    formTitle: "Bien à la demande",
    formText:
      "Dites-nous ce que vous cherchez et nous vous préviendrons dès qu'un bien correspondant arrive.",
    formAria: "Formulaire bien à la demande",
    fullName: "Nom complet",
    phone: "Téléphone",
    phonePlaceholder: "050-1234567",
    budget: "Budget",
    budgetOptions: ["Jusqu'à 1 500 000 ₪", "1 500 000 – 2 000 000 ₪", "2 000 000 ₪ et plus"],
    rooms: "Pièces",
    roomsOptions: ["2", "3", "3.5", "4", "5+"],
    preferredArea: "Quartier préféré",
    choose: "Choisir",
    submit: "Envoyer",
    errName: "Veuillez saisir un nom",
    notSpecified: "Non précisé",
    waMsg: (
      office: string,
      d: { name: string; phone: string; budget: string; rooms: string; area: string },
    ) =>
      `Bonjour ${office},\nJe cherche un bien à la demande.\nNom : ${d.name}\nTéléphone : ${d.phone}\nBudget : ${d.budget}\nPièces : ${d.rooms}\nQuartier préféré : ${d.area}`,
  },

  services: {
    kicker: "Ce que nous faisons",
    title: "Nos services",
    items: [
      {
        title: "Conseil immobilier professionnel",
        text: "Un accompagnement personnalisé à chaque étape de l'achat ou de la vente, de l'estimation du bien à la signature.",
      },
      {
        title: "Estimation de biens",
        text: "Une estimation précise basée sur des données de marché actualisées et une connaissance fine du secteur.",
      },
      {
        title: "Transaction et négociation",
        text: "Recherche d'acheteurs ou de vendeurs, négociation et accompagnement jusqu'à la signature.",
      },
      {
        title: "Conseil juridique",
        text: "En collaboration avec un avocat spécialisé en immobilier, pour une sécurité juridique totale.",
      },
    ],
    waBtn: "Détails sur WhatsApp",
    waMsg: (office: string, subject: string) =>
      `Bonjour ${office}, je souhaite des détails au sujet de : ${subject}. Nom : `,
  },

  whyUs: {
    kicker: "Pourquoi nous",
    title: "Pourquoi Sun City",
    about:
      "Sun City est l'agence immobilière de référence à Netanya, spécialisée dans des services immobiliers complets. Nous offrons à nos clients un accompagnement professionnel et personnalisé tout au long du processus d'achat ou de vente. Forts d'une riche expérience du marché local et d'un engagement d'excellence, nous sommes là pour transformer votre rêve immobilier en réalité.",
    story:
      "Sun City Immobilier est née d'une passion pour le marché immobilier et d'un engagement envers un service de qualité. Depuis notre création, nous avons aidé des centaines de clients à trouver le bien parfait, à vendre leur appartement rapidement et au meilleur prix, et à investir intelligemment dans l'immobilier.",
    values: [
      { title: "Professionnalisme", text: "Un service professionnel au plus haut niveau." },
      {
        title: "Transparence",
        text: "Un partage complet de toutes les informations pertinentes avec les clients.",
      },
      { title: "Fiabilité", text: "Intégrité et responsabilité dans chaque action." },
    ],
    reviewsBadge: (count: number) => `Plus de ${count} avis clients`,
    ratingBadge: (rating: string) => `${rating} étoiles sur Google`,
    badge: "Parmi les 10 meilleures agences immobilières de Netanya, classement Madlan 2023-2026",
    successFeeNote:
      "Honoraires au succès uniquement — vous ne payez que lorsque la transaction est conclue.",
  },

  agentProfile: {
    kicker: "L'agent de cette page",
  },

  testimonials: {
    kicker: "Nos clients témoignent",
    title: "Témoignages clients",
    watchVideo: "Voir la vidéo de recommandation",
    items: [
      {
        quote:
          "Je tiens à vous remercier pour l'excellent travail lors de la vente de l'appartement. Dès le premier appel, j'ai ressenti une vraie connexion et de la confiance. J'ai reçu bien plus que ce que j'attendais — et surtout, la tranquillité d'esprit.",
        name: "Erika S.",
        type: "Achat d'un appartement à Netanya",
      },
      {
        quote:
          "Un travail professionnel, dévoué et sans relâche. Toujours au travail, toujours en train de promouvoir, toujours avec des acheteurs. J'ai connu pas mal d'agents, mais jamais une agente comme elle.",
        name: "Anna K.",
        type: "Vente d'un appartement à Netanya",
      },
      {
        quote:
          "Une équipe exceptionnelle. Communication ouverte, transparence totale et sentiment de sécurité. Nous savions à chaque étape où nous en étions. Leur disponibilité était sans compromis.",
        name: "Arik",
        type: "Vente d'un appartement",
      },
      {
        quote:
          "Un accompagnement et une négociation parfaits du début à la fin. Professionnalisme, discernement et sens du service au plus haut niveau.",
        name: "Sar-El D.",
        type: "Achat d'un appartement d'investissement",
      },
      {
        quote:
          "Nous avons rencontré plusieurs agents et nous les avons choisis parce que ce sont des personnes authentiques et agréables. Ils ont fait un travail formidable pour nous dans une période difficile.",
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
    prevAria: "Témoignage précédent",
    nextAria: "Témoignage suivant",
    counter: (i: number, n: number) => `${i} sur ${n}`,
  },

  faq: {
    kicker: "Questions et réponses",
    title: "Questions fréquentes",
    items: [
      {
        q: "Combien coûte le service d'agence ?",
        a: "Les honoraires sont au succès uniquement — vous ne payez que lorsque la transaction est conclue. Ils sont fixés à l'avance dans un accord écrit, selon le type et l'ampleur de la transaction.",
      },
      {
        q: "Combien de temps faut-il pour vendre un appartement à Netanya ?",
        a: "Dans le marché actuel, un appartement au juste prix se vend généralement entre deux semaines et trois mois. Un prix juste dès le départ est le facteur le plus déterminant.",
      },
      {
        q: "L'estimation est-elle vraiment gratuite ?",
        a: "Oui. L'estimation est fournie gratuitement et sans engagement, même si vous décidez finalement de ne pas vendre ou de ne pas travailler avec nous.",
      },
      {
        q: "Travaillez-vous en exclusivité ?",
        a: "Nous proposons à la fois un mandat exclusif et un mandat simple. En exclusivité, nous investissons un budget et un temps de commercialisation plus importants, mais la décision vous appartient toujours.",
      },
      {
        q: "Quels quartiers couvrez-vous ?",
        a: "Tout Netanya et ses environs : le centre-ville, Kiryat HaSharon, Kiryat Nordau, Kiryat Sanz, Ramat Efraim, Ramat Poleg, Ir Yamim, Neot Herzl, Agamim, Pardes HaGdud, Nof HaTayelet, Ein HaTchelet et Givat HaIrusim.",
      },
      {
        q: "Que faut-il apporter au premier rendez-vous ?",
        a: "Un extrait du registre foncier (Tabou) ou une attestation de droits, le plan de l'appartement s'il existe, et les détails des rénovations et ajouts. Si vous ne les avez pas — nous vous aiderons à les obtenir.",
      },
    ],
  },

  contact: {
    kicker: "Contact",
    title: "Parlons-en",
    addressLabel: "Adresse",
    waze: "Itinéraire avec Waze",
    gmaps: "Itinéraire avec Google Maps",
    phoneLabel: "Téléphone de l'agence",
    emailLabel: "E-mail",
    hoursLabel: "Horaires d'ouverture",
    waSend: "Envoyer un message WhatsApp",
    waHello: (office: string) => `Bonjour ${office}, je souhaite obtenir plus de détails`,
    mapTitle: "Carte Google — 20 rue Shmuel HaNatziv, Netanya",
    formAria: "Formulaire de contact",
    fullName: "Nom complet",
    phone: "Téléphone",
    phonePlaceholder: "050-1234567",
    topicLabel: "Objet",
    choose: "Choisir",
    topics: ["Vendeur", "Acheteur", "Investisseur", "Autre"],
    topicOther: "Autre",
    message: "Message",
    submit: "Envoyer",
    errName: "Veuillez saisir un nom",
    waMsg: (office: string, d: { name: string; phone: string; topic: string; message: string }) =>
      `Bonjour ${office},\nNom : ${d.name}\nTéléphone : ${d.phone}\nObjet : ${d.topic}\nMessage : ${d.message}`,
  },

  footer: {
    logoAlt: "Logo Sun City Immobilier",
    contactTitle: "Coordonnées",
    linksTitle: "Liens",
    linksAria: "Liens de bas de page",
    properties: "Biens",
    freeValuation: "Estimation gratuite",
    madlan: "Page de l'agence sur Madlan",
    team: "L'équipe",
    accessibility: "Déclaration d'accessibilité",
    privacy: "Politique de confidentialité",
    myAccount: "Mon espace",
    facebookAria: "Notre page Facebook",
    instagramAria: "Notre page Instagram",
    license: (num: string) => `Licence immobilière : ${num}`,
    rights: (year: number, name: string) => `© ${year} ${name}. Tous droits réservés.`,
  },

  mobileBar: {
    wa: "WhatsApp",
    call: "Appeler",
    properties: "Biens",
    waMsg: (office: string) => `Bonjour ${office}, je souhaite obtenir plus de détails 🙂`,
  },

  floatingWa: {
    aria: "Envoyer un message WhatsApp à l'agence",
    waMsg: (office: string) =>
      `Bonjour ${office}, je vous ai trouvé via le site et je souhaite plus de détails 🙂`,
  },

  a11y: {
    title: "Accessibilité",
    openAria: "Ouvrir les paramètres d'accessibilité",
    closeAria: "Fermer le menu d'accessibilité",
    groupAria: "Paramètres d'accessibilité",
    bigOn: "Agrandir le texte",
    bigOff: "Rétablir la taille du texte",
    contrastOn: "Contraste élevé",
    contrastOff: "Désactiver le contraste élevé",
  },

  dataSource: {
    updated: "Mis à jour :",
  },

  sold: {
    label: "Des preuves, pas des promesses",
    title: "Vendus par nous",
    subtitle: (n: number) =>
      n >= 3
        ? `${n} appartements réels déjà vendus — comme nous vendrons le vôtre.`
        : "Des appartements réels déjà vendus — comme nous vendrons le vôtre.",
    stamp: "VENDU",
    stampPrefix: "Ce bien aussi a été",
    soldOn: (d: string) => `Vendu en ${d}`,
  },

  misc: {
    noInfo: "Non renseigné",
    phoneError: "Veuillez saisir un numéro de téléphone israélien valide (ex. 050-1234567)",
  },

  routeErrors: {
    notLoaded: "Cette page n'a pas pu se charger",
    tryRefresh: "Essayez d'actualiser la page.",
    notFound: "Page introuvable",
  },

  liveDefaults: {
    name: "Sun City Immobilier",
    heroTitle: "Bienvenue chez Sun City, votre agence immobilière à Netanya",
    heroSubtitle:
      "Relier les personnes aux biens. Un accompagnement personnalisé de la mise en vente à la remise des clés.",
    tagline: "Relier les personnes aux biens",
    subtitle: "Vente | Achat | Location",
    address: "20 rue Shmuel HaNatziv, Netanya, rez-de-chaussée (à côté de la banque Mercantile)",
    hours: [
      { day: "Dimanche – jeudi", value: "09:00 – 20:00" },
      { day: "Vendredi", value: "09:00 – 13:00" },
      { day: "Samedi", value: "Fermé" },
    ],
  },

  maps: {
    deal: {
      מכירה: "À vendre",
      השכרה: "À louer",
    } as Record<string, string>,
    tag: {
      חדש: "Nouveau",
      בלעדי: "Exclusivité",
    } as Record<string, string>,
    neighborhoods: {
      "קריית השרון": "Kiryat HaSharon",
      "קריית נורדאו": "Kiryat Nordau",
      "קריית צאנז": "Kiryat Sanz",
      "רמת אפרים": "Ramat Efraim",
      "רמת פולג": "Ramat Poleg",
      "עיר ימים": "Ir Yamim",
      "נאות הרצל": "Neot Herzl",
      "נאות שקד": "Neot Shaked",
      "נאות גנים": "Neot Ganim",
      אגמים: "Agamim",
      "פרדס הגדוד": "Pardes HaGdud",
      "מרכז העיר": "Centre-ville",
      "צפון מערב מרכז העיר": "Nord-ouest du centre-ville",
      "צפון העיר": "Nord de la ville",
      "נוף הטיילת": "Nof HaTayelet",
      "עין התכלת": "Ein HaTchelet",
      "גבעת האירוסים": "Givat HaIrusim",
    } as Record<string, string>,
    days: {
      "ראשון – חמישי": "Dimanche – jeudi",
      שישי: "Vendredi",
      שבת: "Samedi",
      סגור: "Fermé",
    } as Record<string, string>,
    cities: {
      נתניה: "Netanya",
    } as Record<string, string>,
  },
};
