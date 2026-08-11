import yardImg from "@/assets/gallery-yard.jpg";
import kugelImg from "@/assets/gallery-kugel.jpg";
import soupImg from "@/assets/gallery-soup.jpg";
import platterImg from "@/assets/gallery-platter.jpg";

export function Story() {
  return (
    <section id="story" className="bg-primary/95 py-14 text-primary-foreground md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold tracking-wide text-gold">הסיפור שלנו</p>
          <h2 className="mt-2 text-3xl md:text-4xl">חצר, שולחן, וסיר אחד גדול</h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/90">
            התחלנו כמו שמתחילים בבית: מתכונים שעברו מסבתא, סיר על אש קטנה, ושכנים
            שנכנסו לטעום. היום החצר של אייזיק היא מקום שכונתי בנתניה שבו יושבים
            בלי נעליים מצוחצחות, הילדים מתרוצצים, והצ'ולנט תמיד חם.
          </p>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/90">
            אנחנו לא רשת ולא מסעדה רשמית. אנחנו שולחן ארוך שתמיד יש בו עוד כיסא.
          </p>
        </div>

        <div id="gallery" className="grid grid-cols-2 gap-3">
          {[
            { src: yardImg, alt: "החצר עם שולחנות עץ ותאורה חמה" },
            { src: kugelImg, alt: "קוגל תפוחי אדמה זהוב בצלחת" },
            { src: soupImg, alt: "מרק עוף עם קניידלך" },
            { src: platterImg, alt: "מגש אירוח עם מנות יהודיות ביתיות" },
          ].map((img) => (
            <img
              key={img.alt}
              src={img.src}
              alt={img.alt}
              width={900}
              height={900}
              loading="lazy"
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
