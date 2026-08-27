import { useState } from "react";
import { Home } from "lucide-react";
import logo from "@/assets/sun-city-logo-full.svg";
import { useLive } from "@/lib/site-live";
import { useLang } from "@/lib/i18n";
import { listPublicSoldProperties, type SoldPage, type SoldProperty } from "@/lib/sold.functions";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Props = { page: SoldPage };

/* ============================================================
 * פוסטר ה"נמכר" הרשמי של המשרד — משוחזר כקומפוזיציית SVG כך
 * שכל נכס מקבל את אותה תבנית, ורק התמונה בתוך השמש והכתובת
 * בסרט בפינה מתחלפות פר נכס.
 * ============================================================ */

/** מרכז השמש ורדיוס הטבעת במערכת הצירים של הפוסטר (400×400) */
const CX = 200;
const CY = 134;
const RING_R = 98;

/** קרן שמש משולשת: זווית (0 = למעלה, עם כיוון השעון), אורך, חצי-רוחב וצבע */
type Ray = { angle: number; len: number; hw: number; fill: string };

const GOLD = "#F2A700";
const GOLD_LIGHT = "#FFC53D";
const PALE = "#FFE49A";
const PALE_LIGHT = "#FFF1C9";

const RAYS: Ray[] = [
  { angle: 0, len: 60, hw: 17, fill: GOLD_LIGHT },
  { angle: 38, len: 48, hw: 13, fill: GOLD },
  { angle: 72, len: 42, hw: 12, fill: GOLD_LIGHT },
  { angle: 104, len: 30, hw: 9, fill: GOLD },
  { angle: 133, len: 34, hw: 11, fill: PALE },
  { angle: 158, len: 22, hw: 7, fill: PALE_LIGHT },
  { angle: 202, len: 22, hw: 7, fill: PALE_LIGHT },
  { angle: 227, len: 34, hw: 11, fill: PALE },
  { angle: 256, len: 30, hw: 9, fill: GOLD },
  { angle: 288, len: 42, hw: 12, fill: GOLD_LIGHT },
  { angle: 322, len: 48, hw: 13, fill: GOLD },
];

/** נקודות המשולש של קרן — בסיס צמוד לטבעת, חוד כלפי חוץ */
const rayPoints = ({ angle, len, hw }: Ray): string => {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const px = Math.cos(rad);
  const py = Math.sin(rad);
  const r0 = RING_R + 8;
  const bx = CX + r0 * dx;
  const by = CY + r0 * dy;
  const tx = CX + (r0 + len) * dx;
  const ty = CY + (r0 + len) * dy;
  return `${tx},${ty} ${bx + hw * px},${by + hw * py} ${bx - hw * px},${by - hw * py}`;
};

/** הפוסטר של נכס בודד — תמונה בשמש, חותמת "נמכר" וכתובת בסרט */
function SoldPoster({ item }: { item: SoldProperty }) {
  const { business } = useLive();
  const { t } = useLang();

  // מזהי גרדיאנט ייחודיים פר נכס — כמה פוסטרים חיים יחד באותו עמוד
  const ringId = `sold-ring-${item.id}`;
  const stampId = `sold-stamp-${item.id}`;
  // חותמת ארוכה (למשל "ПРОДАНО") מוקטנת כדי להישאר בגבולות הפוסטר
  const stampSize = Math.min(82, Math.round(300 / (0.62 * t.sold.stamp.length)));
  // גם סיומת ארוכה ("агентством Sun City") מוקטנת כדי להישאר בתוך הפס
  const suffixSize = Math.min(20, Math.round(210 / (0.6 * t.sold.stampSuffix.length)));

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-white shadow-lift">
      {/* התמונה בתוך השמש (מתחת לטבעת, כדי שהטבעת תכסה את השוליים) */}
      {item.url ? (
        <img
          src={item.url}
          alt={`${t.sold.stamp} — ${item.address}`}
          width={400}
          height={400}
          loading="lazy"
          className="absolute left-1/2 top-[33.5%] aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
        />
      ) : (
        <div className="absolute left-1/2 top-[33.5%] flex aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFF1C9]">
          <Home className="size-1/3 text-sun" aria-hidden="true" />
        </div>
      )}

      {/* קרני השמש, הטבעת והכיתוב — סקאלה אחידה לפי ה-viewBox */}
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={ringId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD84D" />
            <stop offset="1" stopColor="#E99B00" />
          </linearGradient>
          <linearGradient id={stampId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFDD55" />
            <stop offset="1" stopColor="#F2A700" />
          </linearGradient>
        </defs>

        {RAYS.map((ray) => (
          <polygon key={ray.angle} points={rayPoints(ray)} fill={ray.fill} />
        ))}

        {/* הטבעת: מסגרת זהב עם קו פנימי בהיר לתחושת נפח */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R}
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={14}
        />
        <circle cx={CX} cy={CY} r={RING_R - 6.5} fill="none" stroke="#FFF3CE" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={RING_R + 7} fill="none" stroke="#C87F00" strokeWidth={1.5} />

        {/* "גם הנכס הזה" — לבן עם קו-מתאר כהה, בהטיה קלה */}
        <text
          x={CX}
          y={244}
          textAnchor="middle"
          className="font-display"
          fontSize={24}
          fontWeight={800}
          fill="#FFFFFF"
          stroke="#2A2F45"
          strokeWidth={6}
          paintOrder="stroke"
          transform={`rotate(-4 ${CX} 244)`}
        >
          {t.sold.stampPrefix}
        </text>

        {/* "נמכר" — צהוב ענק עם קו-מתאר חום-אדום וצל תלת-ממד */}
        <text
          x={CX + 3}
          y={312}
          textAnchor="middle"
          className="font-display"
          fontSize={stampSize}
          fontWeight={900}
          fill="#7A2410"
          transform={`rotate(-3 ${CX} 308)`}
        >
          {t.sold.stamp}
        </text>
        <text
          x={CX}
          y={308}
          textAnchor="middle"
          className="font-display"
          fontSize={stampSize}
          fontWeight={900}
          fill={`url(#${stampId})`}
          stroke="#5C1508"
          strokeWidth={9}
          paintOrder="stroke"
          transform={`rotate(-3 ${CX} 308)`}
        >
          {t.sold.stamp}
        </text>

        {/* 'ע"י סאן סיטי' — על פס קרם. באותה הטיה כמו חותמת ה"נמכר" (סרטים
            מקבילים = מרווח קבוע), וגבוה ומוצר מספיק כדי שסרט הכתובת בפינה
            לא יטפס עליו ויסתיר את הטקסט. */}
        <g transform={`rotate(-3 ${CX} 331)`}>
          <rect x={CX - 116} y={316} width={232} height={30} rx={11} fill="#F3EAD3" />
          <text
            x={CX}
            y={337}
            textAnchor="middle"
            className="font-display"
            fontSize={suffixSize}
            fontWeight={800}
            fill="#23283B"
          >
            {t.sold.stampSuffix}
          </text>
        </g>
      </svg>

      {/* הלוגו — קבוע בפינה השמאלית-תחתונה, כמו בפוסטר המקורי */}
      <img
        src={business.logoUrl || logo}
        alt=""
        width={120}
        height={131}
        loading="lazy"
        className="absolute bottom-[3%] left-[4%] h-[17%] w-auto object-contain"
      />

      {/* הכתובת — סרט צהוב נטוי בפינה הימנית-תחתונה, מתעדכן פר נכס.
          נמוך ודק מספיק כדי לא לחפוף את פס "ע"י סאן סיטי" שמעליו. */}
      <div className="absolute bottom-[2.5%] right-[4%] max-w-[58%] -rotate-2 skew-x-[-8deg] rounded-md border-b-4 border-[#B97B00] bg-gradient-to-b from-[#FFCE45] to-[#F0A400] px-4 py-1 shadow-md">
        <p className="skew-x-[8deg] truncate font-display text-sm font-extrabold text-[#1F2430] sm:text-base">
          {item.address}
        </p>
      </div>
    </div>
  );
}

/**
 * מדור "נמכר על ידינו" — הוכחה חברתית בתבנית פוסטר ה"נמכר"
 * הרשמי של המשרד: שמש עם התמונה בפנים, חותמת "נמכר" והכתובת בסרט.
 */
export function SoldSection({ page }: Props) {
  const { dir, t } = useLang();
  // עמודים נוספים שנטענו דרך "הצג עוד" — מעבר לעמוד הראשון שהגיע מה-loader
  const [extra, setExtra] = useState<SoldProperty[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const items = [...page.items, ...extra];
  const remaining = page.total - items.length;

  const loadMore = async () => {
    if (loadingMore || remaining <= 0) return;
    setLoadingMore(true);
    try {
      const next = await listPublicSoldProperties({ data: { offset: items.length } });
      setExtra((prev) => [...prev, ...next.items]);
    } catch (e) {
      console.error("load more sold failed", e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (items.length === 0) return null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("he-IL", { month: "2-digit", year: "numeric" });
  };

  return (
    <section id="sold" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.sold.label}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.sold.title}</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        {t.sold.subtitle(page.total)}
      </p>

      {/* קרוסלה: היסטוריית המכירות של כל המשרד ארוכה מדי לרשת סטטית */}
      <Carousel
        className="mt-8"
        opts={{
          direction: dir === "rtl" ? "rtl" : "ltr",
          align: "start",
          loop: items.length > 3,
        }}
        dir={dir}
      >
        <CarouselContent>
          {items.map((s) => (
            <CarouselItem key={s.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
              <article className="text-center">
                <SoldPoster item={s} />
                <p className="mt-3 text-sm text-muted-foreground">
                  {[
                    s.neighborhood,
                    s.sold_at && fmtDate(s.sold_at) ? t.sold.soldOn(fmtDate(s.sold_at)!) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {s.note && <p className="mt-1 text-sm font-semibold text-sun">{s.note}</p>}
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        {items.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>

      {remaining > 0 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-bold shadow-sm transition hover:bg-muted disabled:opacity-60"
          >
            {loadingMore ? t.sold.loadingMore : t.sold.showMore(remaining)}
          </button>
        </div>
      )}
    </section>
  );
}
