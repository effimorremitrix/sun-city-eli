import { useLive } from "@/lib/site-live";
import { DataSource } from "@/components/site/DataSource";
import { waProps } from "@/lib/site-data";
import { formatPrice, useLang } from "@/lib/i18n";

export function ItemsSection() {
  const { items, business, updatedAt } = useLive();
  const { lang, t } = useLang();
  if (items.length === 0) return null;

  return (
    <section id="live-items" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.items.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.items.title}</h2>
      <DataSource updatedAt={updatedAt} className="mt-2" />

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="soft-card overflow-hidden">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                loading="lazy"
                className="h-44 w-full object-cover"
              />
            )}
            <div className="p-5">
              <h3 className="text-lg font-extrabold text-primary">{item.title}</h3>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
              {(item.price != null || item.price_note) && (
                <p className="mt-3 text-base font-bold text-sun">
                  {item.price != null ? formatPrice(item.price, lang) : ""}
                  {item.price_note ? ` ${item.price_note}` : ""}
                </p>
              )}
              <a
                {...waProps(t.items.waMsg(business.name, item.title))}
                className="mt-4 block rounded-xl bg-whatsapp py-2.5 text-center text-sm font-bold text-whatsapp-foreground"
              >
                {t.items.waBtn}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
