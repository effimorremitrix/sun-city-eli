export const business = {
  name: "החצר של אייזיק",
  tagline: "אוכל יהודי ביתי, כמו של פעם",
  address: "דר' ישראל בורגנסקי 6, נתניה",
  phone: "[להשלמה]",
  whatsapp: "[להשלמה]",
  kosher: "[להשלמה]",
  hours: [
    { day: "ראשון – חמישי", value: "[להשלמה]" },
    { day: "שישי", value: "[להשלמה]" },
    { day: "שבת", value: "[להשלמה]" },
  ],
  wazeUrl:
    "https://waze.com/ul?q=" + encodeURIComponent("דר' ישראל בורגנסקי 6, נתניה"),
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("דר' ישראל בורגנסקי 6, נתניה"),
};

export const whatsappLink = (text: string) =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;
