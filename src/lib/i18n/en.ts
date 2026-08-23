import type { Dict } from "./he";

/* English dictionary — mirrors the Hebrew source of truth exactly. */

export const en: Dict = {
  seo: {
    title: "Netanya Real Estate | Sun City — Apartments for Sale in Netanya",
    description:
      "Sun City Real Estate, Netanya brokerage: apartments for sale and rent in Netanya, free valuation for sellers, a buyers' property group and personal guidance all the way to closing.",
    areaServed: "Netanya",
  },

  nav: {
    langsLabel: "Choose language",
    brandSuffix: "Real Estate",
    links: [
      { id: "properties", label: "Properties" },
      { id: "sellers", label: "Selling a Home" },
      { id: "sold", label: "Sold" },
      { id: "buyers", label: "For Buyers" },
      { id: "services", label: "Our Services" },
      { id: "team", label: "Our Team" },
      { id: "contact", label: "Contact" },
    ],
    logoAlt: "Sun City Real Estate logo",
    toTopAria: (name: string) => `${name} — back to top`,
    mainNavAria: "Main navigation",
    mobileNavAria: "Mobile navigation",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    callAria: (phone: string) => `Call the office at ${phone}`,
    hello: "Hello,",
    defaultUser: "User",
    myAccount: "My Account",
    authArea: "Sign In",
    logout: "Log out",
    logoutFull: "Log out",
    logoutAria: "Log out",
    freeValuation: "Free Valuation",
  },

  hero: {
    logoAlt: "Sun City Real Estate logo — an orange sun over a rooftop",
    imageAlt:
      "A bright, spacious living room in a luxury apartment with large windows and daylight",
    ctaValuation: "Get a Free Valuation",
    ctaProperties: "View Properties",
    badgeTop10: "Among Netanya's Top 10",
    badgeGroup: "Join our WhatsApp property group",
    slidesAria: "Choose a slider image",
    slideAria: (n: number) => `Go to image ${n}`,
  },

  team: {
    othersTitle: "More Sun City agents",
    kicker: "People, not a corporation",
    title: "Our Team",
    subtitle:
      "Choose an agent, not a company. Talk directly with the person who will handle your deal.",
    names: {
      "אלי כליף": "Eli Khalif",
      "עינבל קובל בוזגלו": "Inbal Kobel Bouzaglo",
      "קובי בוזגלו": "Kobi Bouzaglo",
      "ילנה גנדלין": "Yelena Gandelin",
      "אלעד אבוטבול": "Elad Abutbul",
      "קוראל בוחבוט": "Coral Bohbot",
      "דניאל מוצא": "Daniel Motza",
    } as Record<string, string>,
    roles: {
      "אלי כליף": "Partner & owner, South Netanya real-estate expert",
      "עינבל קובל בוזגלו": "Team manager & partner, second-hand apartment specialist",
      "קובי בוזגלו": "Real-estate & mortgage advisor — central and north Netanya, overseas clients",
      "ילנה גנדלין": "Real-estate expert, east and south Netanya, Russian speaker",
      "אלעד אבוטבול": "Second-hand apartment specialist, central and south Netanya",
      "קוראל בוחבוט": "Real-estate advisor, valuations and overseas-client support",
      "דניאל מוצא": "Real-estate expert, South Netanya",
    } as Record<string, string>,
    photoAlt: (name: string, role: string) => `${name} — ${role}`,
    whatsapp: "WhatsApp",
    call: "Call",
    contactOffice: "Contact the office",
    waAgentAria: (name: string) => `Send a WhatsApp message to ${name}`,
    callAria: (name: string) => `Call ${name}`,
    officeAria: (name: string) => `Contact the office about ${name}`,
    waAgent: (name: string, office: string) =>
      `Hello ${name}, I found you through the ${office} website and would love to talk.`,
    waOffice: (office: string, name: string) =>
      `Hello ${office}, I'd like to reach the office regarding ${name}.`,
  },

  properties: {
    agentOfListing: "Listing agent:",
    web: {
      title: "More options from the market",
      subtitle: "Real listings found across the web for your search, with a link to the source.",
      remaining: (n: number) => ` ${n} scans left today.`,
      match: "Match:",
      colSource: "Source",
      colTitle: "Listing",
      colPrice: "Price",
      source: "Original listing",
      talk: "Talk to me about this",
      talkMsg: (agent: string, title: string, url: string) =>
        `Hello ${agent}, I found a listing through the site that interests me — could you check it for me?\n${title}\n${url}`,
      loginTitle: "Want us to search the whole web for you?",
      loginText:
        "Signed-in users also get a real web scan (Yad2, Madlan and more) for their search.",
      loginCta: "Sign in for free",
      quota:
        "You've used today's web scan quota. The office's properties keep updating here, and you can scan again tomorrow.",
      unavailable:
        "The web scan didn't succeed this time. The office's properties are shown above — try again in a moment.",
      empty:
        "We scanned the web and found no additional matching listings right now. Try rephrasing, or leave your details and we'll find it for you.",
    },
    kicker: "Properties in Netanya",
    title: "Properties for Sale & Rent",
    aiLabel: "Smart search, in your own words",
    aiPlaceholder: "E.g.: 4 rooms with a safe room and parking in Ir Yamim, up to 2.5 million",
    aiAria: "Free-text description of the property you are looking for",
    aiSearch: "Smart Search",
    aiSearching: "Searching…",
    aiClear: "Clear smart search",
    aiFallbackExplain: "We filtered the properties according to your request.",
    aiDisclaimer:
      "The search only filters real properties that exist in the office database. No invented listings.",
    aiFailed: "Search failed",
    filterDeal: "Deal type",
    filterAll: "All",
    filterRooms: "Rooms (minimum)",
    filterPrice: "Price range",
    filterArea: "Area in Netanya",
    filterDealAria: "Deal type",
    filterRoomsAria: "Number of rooms",
    filterPriceAria: "Price range",
    filterAreaAria: "Area in Netanya",
    allAreas: "All areas",
    priceRanges: ["Up to ₪1,500,000", "₪1,500,000 – ₪2,000,000", "₪2,000,000 and up"],
    found: (n: number) => `${n} properties found`,
    sortLabel: "Sort by",
    sortOptions: {
      newest: "Date added (newest first)",
      priceAsc: "Price: low to high",
      priceDesc: "Price: high to low",
      rooms: "Rooms",
      size: "Size (sqm)",
    },
    personalAgent: "Personal agent: alerts for new properties",
    viewList: "List",
    viewMap: "Map",
    mapOpenListing: "View listing",
    mapNoLocation: "No properties with an exact location to show on the map yet.",
    mapNoLocationAdminHint:
      "Manager? You can auto-fill locations for existing listings in the admin area.",
    mapMissingCount: (n: number) =>
      `${n} properties are not on the map — they have no exact location.`,
    noResultsTitle: "No properties match these filters",
    noResultsText: "Tell us what you're looking for and we'll find a matching property for you.",
    waNoResultsBtn: "Property on demand via WhatsApp",
    waNoResultsMsg: "Hello, I'm looking for a property in Netanya. My details: ",
    yad2Btn: "All agency listings on Yad2",
    noImage: "No image",
    photosCount: (n: number) => `${n} photos`,
    roomsUnit: "rooms",
    sqm: "sqm",
    sqmValue: (n: number) => `${n} sqm`,
    floorLabel: (f: string) => `Floor ${f}`,
    detailsBtn: "Details",
    waDetailsBtn: "Details on WhatsApp",
    cardImgAlt: (title: string, hood: string) => `${title} in ${hood}`,
    waListing: (office: string, title: string, addr: string, price: string) =>
      `Hello, I found you through the ${office} website.\nI'm interested in this property:\n${title}\n${addr}\nPrice: ${price}`,
    modalAria: (title: string) => `Property details: ${title}`,
    closeModalAria: "Close property details",
    nextImgAria: "Next photo",
    prevImgAria: "Previous photo",
    showImgAria: (n: number) => `Show photo ${n}`,
    galleryImgAlt: (title: string, hood: string, i: number, total: number) =>
      `${title} in ${hood} — photo ${i} of ${total}`,
    specCaption: "Property specifications",
    specDeal: "Deal type",
    specAddress: "Address",
    specRooms: "Rooms",
    specSize: "Size",
    specFloor: "Floor",
    features: {
      mamad: "Safe room",
      elevator: "Elevator",
      parking: "Parking",
      balcony: "Balcony",
      storage: "Storage room",
    },
    yes: "Yes",
    no: "No",
    mapTitle: (hood: string, city: string) => `Area map: ${hood}, ${city}`,
    interestedTitle: "I'm interested in this property",
    fullName: "Full name",
    phone: "Phone",
    sendWa: "Send via WhatsApp",
    waInterested: (
      office: string,
      d: { title: string; hood: string; price: string; name: string; phone: string },
    ) =>
      `Hello ${office},\nI'm interested in the property: ${d.title}\nArea: ${d.hood}\nPrice: ${d.price}\nName: ${d.name}\nPhone: ${d.phone}`,
    errName: "Please enter a name",
  },

  items: {
    kicker: "From the Office",
    title: "Updates & Opportunities",
    waBtn: "Details on WhatsApp",
    waMsg: (office: string, title: string) => `Hello ${office}, I'd love details about: ${title}`,
  },

  sellers: {
    kicker: "Selling a home?",
    title: "How much is your apartment worth today?",
    text: "A professional valuation, free and with no commitment, based on real transactions closed on your street.",
    steps: [
      { title: "Leave your details", text: "A short form, no commitment" },
      { title: "We visit the property", text: "A professional visit and tour" },
      { title: "Receive a written valuation", text: "Within 48 hours" },
    ],
    formAria: "Free valuation form",
    fullName: "Full name",
    phone: "Phone",
    phonePlaceholder: "050-1234567",
    address: "Property address",
    roomsCount: "Number of rooms",
    choose: "Select",
    roomsOptions: ["2", "2.5", "3", "3.5", "4", "4.5", "5", "6+"],
    submit: "Send me a free valuation",
    privacyNote: "Your details are sent to us on WhatsApp and are not stored on the site.",
    errName: "Please enter a name",
    errAddress: "Please enter the property address",
    notSpecified: "Not specified",
    waMsg: (office: string, d: { name: string; phone: string; address: string; rooms: string }) =>
      `Hello ${office},\nI'd like a free valuation for my property.\nName: ${d.name}\nPhone: ${d.phone}\nProperty address: ${d.address}\nRooms: ${d.rooms}`,
  },

  buyers: {
    kicker: "Buying a home?",
    title: "Properties that reach you before they reach Yad2",
    text: (group: string) =>
      `Members of the "${group}" group get our new properties first. Joining is free.`,
    joinGroup: "Join the property group",
    groupFullQ: "Group full?",
    secondGroup: "Join the second group",
    formTitle: "Property on Demand",
    formText:
      "Tell us what you're looking for and we'll update you the moment a matching property arrives.",
    formAria: "Property on demand form",
    fullName: "Full name",
    phone: "Phone",
    phonePlaceholder: "050-1234567",
    budget: "Budget",
    budgetOptions: ["Up to ₪1,500,000", "₪1,500,000 – ₪2,000,000", "₪2,000,000 and up"],
    rooms: "Rooms",
    roomsOptions: ["2", "3", "3.5", "4", "5+"],
    preferredArea: "Preferred area",
    choose: "Select",
    submit: "Send details",
    errName: "Please enter a name",
    notSpecified: "Not specified",
    waMsg: (
      office: string,
      d: { name: string; phone: string; budget: string; rooms: string; area: string },
    ) =>
      `Hello ${office},\nI'm looking for a property on demand.\nName: ${d.name}\nPhone: ${d.phone}\nBudget: ${d.budget}\nRooms: ${d.rooms}\nPreferred area: ${d.area}`,
  },

  services: {
    kicker: "What we do",
    title: "Our Services",
    items: [
      {
        title: "Professional Real-Estate Consulting",
        text: "Personal guidance at every step of buying or selling, from property valuation to a successful closing.",
      },
      {
        title: "Property Valuations",
        text: "An accurate valuation based on up-to-date market data and detailed information about the surroundings.",
      },
      {
        title: "Brokerage & Deal Management",
        text: "Finding buyers or sellers, managing negotiations and accompanying you to closing.",
      },
      {
        title: "Legal Guidance",
        text: "In collaboration with a real-estate law specialist, for full legal confidence in the deal.",
      },
    ],
    waBtn: "Details on WhatsApp",
    waMsg: (office: string, subject: string) =>
      `Hello ${office}, I'd love details about: ${subject}. Name: `,
  },

  whyUs: {
    kicker: "Why us",
    title: "Why Sun City",
    about:
      "Sun City is Netanya's leading real-estate agency, specializing in comprehensive real-estate services. We give our clients professional, personal guidance throughout the entire process of buying or selling a property. With deep experience in the local market and a commitment to excellence, we are here to turn your real-estate dream into reality.",
    story:
      "Sun City Real Estate was founded out of a passion for the real-estate market and a commitment to quality service. Since our founding we have helped hundreds of clients find the perfect property, sell their apartment quickly and profitably, and invest in real estate wisely.",
    values: [
      { title: "Professionalism", text: "Professional service at the highest level." },
      { title: "Transparency", text: "Full sharing of all relevant information with clients." },
      { title: "Reliability", text: "Integrity and accountability in every action." },
    ],
    reviewsBadge: (count: number) => `Over ${count} client reviews`,
    ratingBadge: (rating: string) => `${rating} stars on Google`,
    badge: "Among Netanya's top 10 real-estate agencies, Madlan ranking 2023–2026",
    successFeeNote: "Success-based fee only — you pay only when a deal closes.",
  },

  agentProfile: {
    kicker: "This page's agent",
  },

  testimonials: {
    kicker: "Clients' stories",
    title: "Client Testimonials",
    watchVideo: "Watch the video testimonial",
    items: [
      {
        quote:
          "I want to thank you for the excellent work selling the apartment. From the very first call I felt a real connection and confidence. I got much more than I expected — and above all, peace of mind.",
        name: "Erika S.",
        type: "Buying an apartment in Netanya",
      },
      {
        quote:
          "Professional, devoted, relentless work. Always working, always marketing, always bringing buyers. I've met quite a few agents, but never one like her.",
        name: "Anna K.",
        type: "Selling an apartment in Netanya",
      },
      {
        quote:
          "An exceptional team. Open communication, full transparency and a sense of security. We knew what was happening at every stage. Their availability was uncompromising.",
        name: "Arik",
        type: "Selling an apartment",
      },
      {
        quote:
          "Perfect guidance and negotiation from start to finish. Professionalism, judgment and service at the highest possible level.",
        name: "Sar-El D.",
        type: "Buying an investment apartment",
      },
      {
        quote:
          "We met several agents and chose them because they are authentic, pleasant people. They did wonderful work for us during a challenging period.",
        name: "Uriel N.",
        type: "Netanya",
      },
      {
        quote:
          "After failing to rent the place out myself, I turned to the office and found a serious, honest agent who sets a goal and doesn't rest until it's achieved.",
        name: "Danny A.",
        type: "Google review",
      },
    ],
    prevAria: "Previous testimonial",
    nextAria: "Next testimonial",
    counter: (i: number, n: number) => `${i} of ${n}`,
  },

  faq: {
    kicker: "Questions & answers",
    title: "Frequently Asked Questions",
    items: [
      {
        q: "How much does brokerage cost?",
        a: "Payment is success-based only — you pay only when a deal closes. The fee is agreed in advance in a written agreement, according to the type and scope of the transaction.",
      },
      {
        q: "How long does it take to sell an apartment in Netanya?",
        a: "In the current market, a correctly priced apartment usually sells within two weeks to three months. Accurate pricing from the start is the most significant factor.",
      },
      {
        q: "Is the valuation really free?",
        a: "Yes. The valuation is provided free of charge and with no commitment, even if you ultimately decide not to sell or not to work with us.",
      },
      {
        q: "Do you work with exclusivity?",
        a: "We offer both exclusive marketing and regular marketing. With exclusivity we invest a larger marketing budget and more time, but the decision is always yours.",
      },
      {
        q: "Which neighborhoods do you cover?",
        a: "All of Netanya and its surroundings: City Center, Kiryat HaSharon, Kiryat Nordau, Kiryat Sanz, Ramat Efraim, Ramat Poleg, Ir Yamim, Neot Herzl, Agamim, Pardes HaGdud, Nof HaTayelet, Ein HaTchelet and Givat HaIrusim.",
      },
      {
        q: "What should I bring to a first meeting?",
        a: "A land-registry extract (Tabu) or rights confirmation, the apartment floor plan if available, and details of renovations and additions. If you don't have them — we'll help you obtain them.",
      },
    ],
  },

  contact: {
    kicker: "Contact",
    title: "Talk to Us",
    addressLabel: "Address",
    waze: "Navigate with Waze",
    gmaps: "Navigate with Google Maps",
    phoneLabel: "Office phone",
    emailLabel: "Email",
    hoursLabel: "Opening hours",
    waSend: "Send a WhatsApp message",
    waHello: (office: string) => `Hello ${office}, I'd love to get more details`,
    mapTitle: "Google map — 20 Shmuel HaNatziv St., Netanya",
    formAria: "Contact form",
    fullName: "Full name",
    phone: "Phone",
    phonePlaceholder: "050-1234567",
    topicLabel: "Topic",
    choose: "Select",
    topics: ["Seller", "Buyer", "Investor", "Other"],
    topicOther: "Other",
    message: "Message",
    submit: "Send",
    errName: "Please enter a name",
    waMsg: (office: string, d: { name: string; phone: string; topic: string; message: string }) =>
      `Hello ${office},\nName: ${d.name}\nPhone: ${d.phone}\nTopic: ${d.topic}\nMessage: ${d.message}`,
  },

  footer: {
    logoAlt: "Sun City Real Estate logo",
    ownerLine: "Eli Kalif",
    contactTitle: "Contact details",
    linksTitle: "Links",
    linksAria: "Footer links",
    properties: "Properties",
    freeValuation: "Free valuation",
    madlan: "Agency page on Madlan",
    team: "Our team",
    accessibility: "Accessibility statement",
    privacy: "Privacy policy",
    terms: "Terms of service",
    dataDeletion: "Data deletion",
    myAccount: "My account",
    facebookAria: "Our Facebook page",
    instagramAria: "Our Instagram page",
    whatsappGroupAria: "Our buyers WhatsApp group",
    whatsappGroupJoinMsg: "Hi, I'd love to join the buyers WhatsApp group 🙂",
    license: (num: string) => `Real estate license: ${num}`,
    rights: (year: number, name: string) => `© ${year} ${name}. All rights reserved.`,
  },

  mobileBar: {
    wa: "WhatsApp",
    call: "Call",
    properties: "Properties",
    waMsg: (office: string) => `Hello ${office}, I'd love to get more details 🙂`,
  },

  floatingWa: {
    aria: "Send a WhatsApp message to the office",
    waMsg: (office: string) =>
      `Hello ${office}, I found you through the website and would love more details 🙂`,
  },

  a11y: {
    title: "Accessibility",
    openAria: "Open accessibility settings",
    closeAria: "Close accessibility menu",
    groupAria: "Accessibility settings",
    bigOn: "Larger text",
    bigOff: "Reset text size",
    contrastOn: "High contrast",
    contrastOff: "Disable high contrast",
  },

  dataSource: {
    updated: "Updated:",
  },

  sold: {
    label: "Proof, not promises",
    title: "Sold by Us",
    subtitle: (n: number) =>
      n >= 3
        ? `${n} real apartments we've already sold — just like we'll sell yours.`
        : "Real apartments we've already sold — just like we'll sell yours.",
    stamp: "SOLD",
    stampPrefix: "This property was also",
    stampSuffix: "by Sun City",
    soldOn: (d: string) => `Sold ${d}`,
  },

  misc: {
    noInfo: "No info",
    phoneError: "Please enter a valid Israeli phone number (e.g. 050-1234567)",
  },

  routeErrors: {
    notLoaded: "This page didn't load",
    tryRefresh: "Try refreshing the page.",
    notFound: "Page not found",
  },

  liveDefaults: {
    name: "Sun City Real Estate",
    heroTitle: "Welcome to Sun City, your real-estate agency in Netanya",
    heroSubtitle:
      "Connecting people and properties. Personal guidance from listing to key handover.",
    tagline: "Connecting people and properties",
    subtitle: "Sales | Purchases | Rentals",
    address: "20 Shmuel HaNatziv St., Netanya, ground floor (next to Mercantile Bank)",
    hours: [
      { day: "Sunday – Thursday", value: "09:00 – 20:00" },
      { day: "Friday", value: "09:00 – 13:00" },
      { day: "Saturday", value: "Closed" },
    ],
  },

  maps: {
    deal: {
      מכירה: "For Sale",
      השכרה: "For Rent",
    } as Record<string, string>,
    tag: {
      חדש: "New",
      בלעדי: "Exclusive",
    } as Record<string, string>,
    neighborhoods: {
      "קריית השרון": "Kiryat HaSharon",
      "קריית נורדאו": "Kiryat Nordau",
      "קריית צאנז": "Kiryat Sanz",
      "רמת אפרים": "Ramat Efraim",
      "רמת פולג": "Ramat Poleg",
      "רמת ידין": "Ramat Yadin",
      "רמת חן": "Ramat Chen",
      "עיר ימים": "Ir Yamim",
      "פארק ים": "Park Yam",
      "נאות הרצל": "Neot Herzl",
      "נאות שקד": "Neot Shaked",
      "נאות גנים": "Neot Ganim",
      אגמים: "Agamim",
      "פרדס הגדוד": "Pardes HaGdud",
      "מרכז העיר": "City Center",
      "צפון מערב מרכז העיר": "Northwest City Center",
      "צפון העיר": "North of the City",
      "נוף הטיילת": "Nof HaTayelet",
      "עין התכלת": "Ein HaTchelet",
      "גבעת האירוסים": "Givat HaIrusim",
    } as Record<string, string>,
    days: {
      "ראשון – חמישי": "Sunday – Thursday",
      שישי: "Friday",
      שבת: "Saturday",
      סגור: "Closed",
    } as Record<string, string>,
    cities: {
      נתניה: "Netanya",
    } as Record<string, string>,
  },
};
