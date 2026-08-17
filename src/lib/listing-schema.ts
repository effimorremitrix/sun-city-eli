import { z } from "zod";

const optionalNumber = z
  .union([z.number(), z.null(), z.literal("")])
  .transform((v) => (v === "" || v === null ? null : Number(v)))
  .nullable();

export const listingInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "נדרשת כותרת").max(200),
  deal_type: z.string().trim().max(20).default("מכירה"),
  description: z.string().trim().max(2000).nullable().default(null),
  city: z.string().trim().max(60).default("נתניה"),
  neighborhood: z.string().trim().max(80).nullable().default(null),
  address: z.string().trim().max(200).nullable().default(null),
  price: optionalNumber.default(null),
  rooms: optionalNumber.default(null),
  size_sqm: optionalNumber.default(null),
  floor: z.string().trim().max(20).nullable().default(null),
  has_mamad: z.boolean().default(false),
  has_elevator: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_balcony: z.boolean().default(false),
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
  min_price: optionalNumber.default(null),
  max_price: optionalNumber.default(null),
  min_rooms: optionalNumber.default(null),
  min_size: optionalNumber.default(null),
  needs_mamad: z.boolean().default(false),
  needs_elevator: z.boolean().default(false),
  needs_parking: z.boolean().default(false),
  needs_balcony: z.boolean().default(false),
  notes: z.string().trim().max(500).nullable().default(null),
  notify_email: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export type SearchProfileInput = z.infer<typeof searchProfileSchema>;
