import { Link } from "@tanstack/react-router";
import { Globe, MessageCircle } from "lucide-react";
import { waProps } from "@/lib/site-data";
import { formatListingPrice } from "@/lib/listings";
import { mapValue, useLang } from "@/lib/i18n";
import { detectPropertyType } from "@/lib/property-type";
import type { AiSearchResult } from "@/lib/ai-search.functions";

/* ============================================================
 * תוצאות הסריקה החיה של הלוחות — מוצגות באזור האישי בלבד (הסוכן החכם).
 * באתר הציבורי מוצגים נכסי SUN CITY בלבד, ולכן הקומפוננטה עברה לכאן
 * ממדור הנכסים הציבורי.
 * ============================================================ */

/** מודעות אמיתיות מהאינטרנט שנמצאו בסריקה — עם קישור למקור וניתוב לסוכן המטפל */
export function WebCandidates({
  web,
  agentPhone,
  agentName,
}: {
  web: AiSearchResult["web"];
  agentPhone: string;
  agentName: string;
}) {
  const { t, lang } = useLang();
  const w = t.properties.web;

  /**
   * המודעות מגיעות מהלוחות בעברית. הכותרת נבנית מחדש מהשדות המובנים
   * בשפת הדף (סוג נכס + חדרים + כתובת), ונימוק ההתאמה — שנכתב בעברית על
   * ידי המודל — אינו מוצג בשפה אחרת במקום להציג טקסט לא מתורגם.
   */
  const titleOf = (c: AiSearchResult["web"]["candidates"][number]): string => {
    if (lang === "he") return c.title;
    const head = t.maps.propertyType[detectPropertyType(c.title, c.raw_summary)] ?? "";
    const rooms = c.rooms != null ? `${c.rooms} ${t.properties.roomsUnit}` : null;
    const where = [c.address, mapValue(t.maps.neighborhoods, c.neighborhood)]
      .filter(Boolean)
      .join(", ");
    const head2 = [head, rooms].filter(Boolean).join(" · ");
    return (where ? `${head2}, ${where}` : head2) || c.title;
  };

  // הסריקה החיה לא רצה כלל (למשל חיפוש בלי אינטרנט) — אין מה להציג
  if (web.status === "skipped") return null;

  if (web.status === "login_required") {
    return (
      <div className="soft-card mt-6 p-5">
        <p className="flex items-center gap-1.5 font-bold text-primary">
          <Globe className="size-4 text-sun" aria-hidden="true" />
          {w.loginTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{w.loginText}</p>
        <Link
          to="/auth"
          className="mt-3 inline-block rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground"
        >
          {w.loginCta}
        </Link>
      </div>
    );
  }

  if (web.status === "quota_exceeded") {
    return <p className="soft-card mt-6 p-5 text-sm text-muted-foreground">{w.quota}</p>;
  }

  if (web.status === "unavailable") {
    return <p className="soft-card mt-6 p-5 text-sm text-muted-foreground">{w.unavailable}</p>;
  }

  // תקציר הסריקה — שקיפות: כמה נסרק וכמה נפסל (סריקה "ריקה" אינה תקלה)
  const summaryLine = web.summary
    ? w.scanSummary(web.summary.scanned, web.candidates.length, web.summary.rejected)
    : null;

  if (web.candidates.length === 0) {
    return (
      <div className="soft-card mt-6 p-5 text-sm text-muted-foreground">
        <p>{w.empty}</p>
        {summaryLine && web.summary && web.summary.scanned > 0 && (
          <p className="mt-1 text-xs">{summaryLine}</p>
        )}
      </div>
    );
  }

  return (
    <section className="mt-8" aria-label={w.title}>
      <h3 className="flex items-center gap-1.5 text-xl font-extrabold text-primary">
        <Globe className="size-5 text-sun" aria-hidden="true" />
        {w.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {w.subtitle}
        {web.remaining != null && w.remaining(web.remaining)}
      </p>
      {summaryLine && <p className="mt-1 text-xs text-muted-foreground">{summaryLine}</p>}
      {/* תצוגה טבלאית של המודעות מהרשת */}
      <div className="soft-card mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border text-start">
              {[
                w.colSource,
                w.colTitle,
                w.colPrice,
                t.properties.filterRooms,
                t.properties.sqm,
                w.match,
                "",
              ].map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-3 py-2.5 text-start text-xs font-bold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {web.candidates.map((c) => (
              <tr key={c.source_url} className="align-top">
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                    {c.source_site}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-bold text-primary">{titleOf(c)}</p>
                  {c.neighborhood && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {mapValue(t.maps.neighborhoods, c.neighborhood)}
                    </p>
                  )}
                  {lang === "he" && c.match_reason && (
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      {c.match_reason}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {c.price != null ? formatListingPrice(c.price) : t.misc.noInfo}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{c.rooms ?? t.misc.noInfo}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{c.size_sqm ?? t.misc.noInfo}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-sun">
                  {c.match_score}%
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-2">
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                    >
                      {w.source}
                    </a>
                    <a
                      {...waProps(w.talkMsg(agentName, c.title, c.source_url), agentPhone)}
                      className="flex items-center gap-1 whitespace-nowrap rounded-xl bg-whatsapp px-3 py-1.5 text-xs font-bold text-whatsapp-foreground"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {w.talk}
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
