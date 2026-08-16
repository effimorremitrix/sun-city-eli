/** יצירת נוסחי פוסט לפייסבוק לכל נכס (AI), נשמרים על הנכס לשימוש חוזר */

export type PostCopy = {
  variants: string[];
  hashtags: string[];
  generated_at: string;
};

const SYSTEM_PROMPT = `אתה קופירייטר נדל"ן ישראלי. כתוב נוסחי פוסט לפייסבוק עבור מודעת נכס של סוכנות תיווך בנתניה.
כללים: עברית טבעית ומזמינה, בלי הבטחות שווא, בלי להמציא פרטים שלא נמסרו, אימוג'ים במידה, קריאה לפעולה ליצירת קשר בסוף.
החזר JSON בלבד:
{"variants":[string,string,string],"hashtags":[string,...]}
כל נוסח 3-6 שורות, שונה באופיו (ענייני / חם ומשפחתי / ממוקד השקעה). 6-10 האשטגים בעברית ובאנגלית.`;

export async function generatePostCopy(listingId: string, force = false): Promise<PostCopy> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { AI_MODEL, logAiUsage } = await import("@/lib/ai-usage.server");

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .select("id, title, description, deal_type, neighborhood, address, price, rooms, size_sqm, floor, has_mamad, has_elevator, has_parking, has_balcony, post_copy")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) throw new Error("הנכס לא נמצא");

  const existing = listing.post_copy as PostCopy | null;
  if (existing?.variants?.length && !force) return existing;

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("יצירת הנוסחים אינה זמינה (חסר מפתח API)");

  const features = [
    listing.has_mamad && 'ממ"ד',
    listing.has_elevator && "מעלית",
    listing.has_parking && "חניה",
    listing.has_balcony && "מרפסת",
  ].filter(Boolean);

  const details = [
    `כותרת: ${listing.title}`,
    `עסקה: ${listing.deal_type}`,
    listing.neighborhood && `שכונה: ${listing.neighborhood}`,
    listing.address && `כתובת: ${listing.address}`,
    listing.price != null && `מחיר: ${Number(listing.price).toLocaleString("he-IL")} ש"ח`,
    listing.rooms != null && `חדרים: ${listing.rooms}`,
    listing.size_sqm != null && `שטח: ${listing.size_sqm} מ"ר`,
    listing.floor && `קומה: ${listing.floor}`,
    features.length && `יתרונות: ${features.join(", ")}`,
    listing.description && `תיאור: ${listing.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: details }],
    }),
  });
  if (!res.ok) {
    await logAiUsage({ feature: "post_copy", model: AI_MODEL, status: "error", errorMessage: `HTTP ${res.status}` });
    throw new Error("יצירת הנוסחים נכשלה. נסו שוב בעוד רגע");
  }

  const json = (await res.json()) as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  await logAiUsage({
    feature: "post_copy",
    model: AI_MODEL,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    status: "success",
  });

  const text = (json.content ?? []).map((c) => c?.text ?? "").join("\n").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let parsed: { variants?: unknown[]; hashtags?: unknown[] } = {};
  try {
    parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch {
    throw new Error("יצירת הנוסחים נכשלה. נסו שוב");
  }

  const variants = (parsed.variants ?? [])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 2000))
    .slice(0, 3);
  const hashtags = (parsed.hashtags ?? [])
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .map((h) => (h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`))
    .slice(0, 12);
  if (!variants.length) throw new Error("יצירת הנוסחים נכשלה. נסו שוב");

  const copy: PostCopy = { variants, hashtags, generated_at: new Date().toISOString() };
  await supabaseAdmin.from("listings").update({ post_copy: copy as never }).eq("id", listingId);
  return copy;
}
