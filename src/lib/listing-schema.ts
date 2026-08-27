import { z } from "zod";

const optionalNumber = z
  .union([z.number(), z.null(), z.literal("")])
  .transform((v) => (v === "" || v === null ? null : Number(v)))
  .nullable();

export const listingInputSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2, "נדרשת כותרת").max(200),
  deal_type: z.string().trim().max(20).default("מכירה"),
  description: z.string().trim().max(2000).nullable().default(null),
  city: z.string().trim().max(60).default("נתניה"),
  neighborhood: z.string().trim().max(80).nullable().default(null),
  address: z.string().trim().max(200).nullable().default(null),
  lat: optionalNumber.default(null),
  lng: optionalNumber.default(null),
  price: optionalNumber.default(null),
  rooms: optionalNumber.default(null),
  size_sqm: optionalNumber.default(null),
  floor: z.string().trim().max(20).nullable().default(null),
  has_mamad: z.boolean().default(false),
  has_elevator: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_balcony: z.boolean().default(false),
  has_storage: z.boolean().default(false),
  storage_count: optionalNumber.default(null),
  parking_count: optionalNumber.default(null),
  tag: z.string().trim().max(20).nullable().default(null),
  image_url: z.string().trim().max(500).nullable().default(null),
  image_key: z.string().trim().max(60).nullable().default(null),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
  /** תרגומים לפי קוד שפה: { en: { title, description }, ... } */
  translations: z
    .record(
      z.object({
        title: z.string().trim().max(200).optional(),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .default({}),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

export const searchProfileSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2, "נדרש שם לפרופיל").max(80),
  deal_type: z.string().trim().max(20).default("מכירה"),
  city: z.string().trim().max(60).default("נתניה"),
  neighborhoods: z.array(z.string().trim().max(80)).max(20).default([]),
  street: z.string().trim().max(80).nullable().default(null),
  min_price: optionalNumber.default(null),
  max_price: optionalNumber.default(null),
  min_rooms: optionalNumber.default(null),
  rooms: optionalNumber.default(null),
  max_rooms: optionalNumber.default(null),
  min_size: optionalNumber.default(null),
  needs_mamad: z.boolean().default(false),
  needs_elevator: z.boolean().default(false),
  needs_parking: z.boolean().default(false),
  needs_balcony: z.boolean().default(false),
  notes: z.string().trim().max(500).nullable().default(null),
  notify_email: z.boolean().default(true),
  notify_whatsapp: z.boolean().default(false),
  whatsapp_phone: z.string().trim().max(20).nullable().default(null),
  is_active: z.boolean().default(true),
});

export type SearchProfileInput = z.infer<typeof searchProfileSchema>;

/* --------- ממליצים ושאלות נפוצות (נשמרים ב-site_content) --------- */

export const testimonialSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1, "נדרש שם ממליץ").max(80),
  type: z.string().trim().max(60).default(""),
  quote: z.string().trim().min(2, "נדרש תוכן ההמלצה").max(600),
  // כתובת חתומה של site-media היא ~340 תווים — התקרה נדיבה כדי לא לחתוך אותה
  videoUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || v.startsWith("https://"), "קישור סרטון חייב להתחיל ב-https://")
    .default(""),
});

export const faqItemSchema = z.object({
  id: z.string().trim().min(1).max(60),
  q: z.string().trim().min(2, "נדרשת שאלה").max(200),
  a: z.string().trim().min(2, "נדרשת תשובה").max(1000),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;
export type FaqItemInput = z.infer<typeof faqItemSchema>;
