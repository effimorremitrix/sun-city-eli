import type { Dict } from "./he";

export const en: Dict = {
  dir: "ltr",
  langName: "English",

  nav: {
    properties: "Properties",
    sellers: "Selling",
    buyers: "Buying",
    services: "Our Services",
    team: "Our Team",
    contact: "Contact",
  },

  header: {
    personalArea: "My Account",
    authArea: "Sign In",
    admin: "Site Admin",
    logout: "Sign Out",
    hello: "Hello,",
    freeValuation: "Free Valuation",
  },

  hero: {
    ctaValuation: "Get a Free Valuation",
    ctaProperties: "View Properties",
    badgeTop10: "Top 10 agencies in Netanya",
    badgeWhatsapp: "Join our WhatsApp property group",
  },

  properties: {
    label: "Properties in Netanya",
    title: "Properties for Sale and Rent",
    aiLabel: "Smart search, in your own words",
    aiPlaceholder: "e.g. 4 rooms with safe room and parking in Ir Yamim up to 2.5M",
    aiButton: "Smart Search",
    aiBusy: "Searching…",
    aiClear: "Clear smart search",
    aiDefaultExplanation: "We filtered the properties to match your request.",
    aiNote:
      "The search shows the office's properties first, and for signed-in users — also real listings from across the web with a link to the source. No invented properties.",
    filterDeal: "Deal type",
    filterRooms: "Rooms (min)",
    filterPrice: "Price range",
    filterArea: "Area in Netanya",
    all: "All",
    allAreas: "All areas",
    dealSale: "Sale",
    dealRent: "Rent",
    found: (n: number) => `${n} properties found`,
    alertsCta: "Personal agent: alerts on new properties",
    emptyTitle: "No properties match this filter",
    emptyText: "Tell us what you're looking for and we'll find a matching property for you.",
    emptyWa: "Property on demand via WhatsApp",
    yad2: "All agency listings on Yad2",
    rooms: "rooms",
    sqm: "sqm",
    floor: "Floor",
    noInfo: "N/A",
    details: "Details",
    waDetails: "Details on WhatsApp",
    agentOfListing: "Listing agent:",
    photosCount: (n: number) => `${n} photos`,
    noImage: "No image",
    modal: {
      deal: "Deal type",
      agent: "Agent",
      address: "Address",
      rooms: "Rooms",
      size: "Size",
      floor: "Floor",
      mamad: "Safe room",
      elevator: "Elevator",
      parking: "Parking",
      balcony: "Balcony",
      yes: "Yes",
      no: "No",
      interested: "I'm interested in this property",
      fullName: "Full name",
      phone: "Phone",
      sendWa: "Send via WhatsApp",
    },
    features: { mamad: "Safe room", elevator: "Elevator", parking: "Parking", balcony: "Balcony" },
    web: {
      title: "More options from the market",
      subtitle: "Real listings found across the web for your search, with a link to the source.",
      remaining: (n: number) => ` ${n} scans left today.`,
      match: "Match:",
      source: "Original listing",
      talk: "Talk to me about this",
      loginTitle: "Want us to search the whole web for you?",
      loginText:
        "Signed-in users also get a real web scan (Yad2, Madlan and more) based on their search.",
      loginCta: "Sign in for free",
      quota:
        "You've used today's web scan quota. The office's properties keep updating here, and you can scan again tomorrow.",
      unavailable:
        "The web scan didn't succeed this time. The office's properties are shown above — try again in a moment.",
      empty:
        "We scanned the web and found no additional matching listings right now. Try rephrasing, or leave your details and we'll find it for you.",
    },
  },

  team: {
    label: "People, not a company",
    title: "Our Team",
    titleOthers: "More Sun City agents",
    subtitle:
      "Choose an agent, not a company. Talk directly with the person who will take care of you — every agent has their own personal page.",
    whatsapp: "WhatsApp",
    call: "Call",
    toOffice: "Contact the office",
    toPersonalPage: (name: string) => `${name}'s personal page`,
  },

  contact: {
    label: "Contact",
    title: "Let's Talk",
    address: "Address",
    waze: "Navigate with Waze",
    maps: "Google Maps",
    phone: "Phone",
    email: "Email",
    hours: "Opening hours",
    sendWa: "Send a WhatsApp message",
    formLabel: "Contact form",
    fullName: "Full name",
    phoneField: "Phone",
    topic: "Subject",
    topicChoose: "Choose",
    topicSeller: "Seller",
    topicBuyer: "Buyer",
    topicInvestor: "Investor",
    topicOther: "Other",
    message: "Message",
    send: "Send",
  },

  footer: {
    contactDetails: "Contact details",
    links: "Links",
    properties: "Properties",
    valuation: "Free valuation",
    madlan: "Agency page on Madlan",
    team: "Our team",
    accessibility: "Accessibility statement",
    privacy: "Privacy policy",
    myArea: "My account",
    admin: "Site admin",
    license: "Real estate license:",
    rights: "All rights reserved.",
  },

  mobileBar: { whatsapp: "WhatsApp", call: "Call", properties: "Properties" },

  sections: {
    servicesLabel: "What we do",
    servicesTitle: "Our Services",
    whyLabel: "Why us",
    whyTitle: "Why Sun City",
    waDetails: "Details on WhatsApp",
    testimonialsLabel: "Client stories",
    testimonialsTitle: "Client Testimonials",
    testimonialPrev: "Previous testimonial",
    testimonialNext: "Next testimonial",
    testimonialOf: (i: number, n: number) => `${i} of ${n}`,
    faqLabel: "Questions & answers",
    faqTitle: "FAQ",
  },

  seller: {
    label: "Selling your home?",
    title: "How much is your apartment worth today?",
    subtitle:
      "A professional valuation, free of charge and with no commitment, based on real deals closed on your street.",
    formLabel: "Free valuation form",
    fullName: "Full name",
    phone: "Phone",
    address: "Property address",
    rooms: "Number of rooms",
    choose: "Choose",
    submit: "Send me a free valuation",
    note: "Your details are sent to us via WhatsApp and are not stored on the site.",
    errName: "Please enter your name",
    errAddress: "Please enter the property address",
    steps: [
      { title: "Leave your details", text: "A short form, no commitment" },
      { title: "We visit the property", text: "A professional tour" },
      { title: "Get a written valuation", text: "Within 48 hours" },
    ],
  },

  buyer: {
    label: "Buying a home?",
    title: "Properties that reach you before they reach Yad2",
    subtitle: (group: string) =>
      `Members of the "${group}" group get our new properties first. Joining is free.`,
    joinGroup: "Join the property group",
    groupFull: "Group full?",
    joinSecond: "Join the second group",
    formTitle: "Property on demand",
    formSubtitle: "Tell us what you're looking for and we'll update you when a match arrives.",
    formLabel: "Property on demand form",
    budget: "Budget",
    rooms: "Rooms",
    area: "Preferred area",
    submit: "Send details",
  },

  content: {
    about:
      "Sun City is Netanya's leading real estate agency, specializing in comprehensive real estate services. We provide our clients with professional, personal guidance throughout the entire process of buying or selling a property. With deep experience in the local market and a commitment to excellence, we are here to help you turn your real estate dream into reality.",
    story:
      "Sun City Real Estate was founded out of a passion for the real estate market and a commitment to quality service. Since our founding, we have helped hundreds of clients find the perfect property, sell their home quickly and profitably, and invest in real estate wisely.",
    values: [
      { title: "Professionalism", text: "Service at the highest professional level." },
      { title: "Transparency", text: "Full sharing of all relevant information with clients." },
      { title: "Integrity", text: "Honesty and responsibility in every action." },
    ],
    services: [
      {
        title: "Professional real estate advice",
        text: "Personal guidance at every stage of buying or selling, from valuation to a successful closing.",
      },
      {
        title: "Property valuation",
        text: "Accurate valuation based on up-to-date market data and detailed local information.",
      },
      {
        title: "Brokerage and deal management",
        text: "Finding buyers or sellers, managing negotiations and accompanying you to closing.",
      },
      {
        title: "Legal advice",
        text: "In cooperation with a real estate law expert, for full legal security in your deal.",
      },
    ],
    faq: [
      {
        q: "How much does brokerage cost?",
        a: "Payment is success-based only — you pay only when a deal closes. The fee is agreed in advance in a written agreement, according to the type and scope of the deal.",
      },
      {
        q: "How long does it take to sell an apartment in Netanya?",
        a: "In the current market, a correctly priced apartment usually sells within two weeks to three months. Accurate pricing at the start is the most significant factor.",
      },
      {
        q: "Is the valuation really free?",
        a: "Yes. The valuation is provided free of charge and with no commitment, even if you eventually decide not to sell or not to work with us.",
      },
      {
        q: "Do you work with exclusivity?",
        a: "Yes, we work exclusively only. Exclusivity lets us invest a full marketing budget in your property, control the price and how the property is presented to all buyers, and give you consistent reporting from one party responsible for the result from start to closing.",
      },
      {
        q: "Which neighborhoods do you cover?",
        a: "All of Netanya and the surrounding area: City Center, Kiryat HaSharon, Kiryat Nordau, Kiryat Sanz, Ramat Efraim, Ramat Poleg, Ir Yamim, Neot Herzl, Agamim, Pardes HaGdud, Nof HaTayelet, Ein HaTchelet and Givat HaIrusim.",
      },
      {
        q: "What should I bring to a first meeting?",
        a: "A land registry extract or rights confirmation, the apartment floor plan if available, and details of renovations and additions. If you don't have them — we'll help you obtain them.",
      },
    ],
    testimonials: [
      {
        quote:
          "I want to thank you for the excellent work selling the apartment. From the very first call I felt a real connection and confidence. I got much more than I expected, and above all — peace of mind.",
        name: "Erika S.",
        type: "Bought an apartment in Netanya",
      },
      {
        quote:
          "Professional, dedicated, relentless work. Always working, always marketing, always bringing buyers. I've met quite a few agents, but never one like her.",
        name: "Anna K.",
        type: "Sold an apartment in Netanya",
      },
      {
        quote:
          "An exceptional team. Open communication, full transparency and a feeling of confidence. We knew what was happening at every stage. Their availability was uncompromising.",
        name: "Arik",
        type: "Sold an apartment",
      },
      {
        quote:
          "Perfect guidance and negotiation management throughout. Professionalism, judgment and service at the highest possible level.",
        name: "Sarel D.",
        type: "Bought an investment apartment",
      },
      {
        quote:
          "We met several agents and chose them because they are authentic, pleasant people. They did wonderful work for us during a challenging period.",
        name: "Uriel N.",
        type: "Netanya",
      },
      {
        quote:
          "After failing to rent it out myself, I turned to the office and found a serious, honest agent who sets a goal and doesn't rest until it's achieved.",
        name: "Danny A.",
        type: "Google review",
      },
    ],
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
    soldOn: (d: string) => `Sold ${d}`,
  },

  langSwitcher: "Language",
};
