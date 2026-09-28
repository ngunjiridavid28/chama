import { Link } from "@tanstack/react-router";
import { useLang, type TKey } from "@/lib/i18n";

const items: { to: string; icon: string; key: TKey }[] = [
  { to: "/nyumbani", icon: "🏠", key: "home" },
  { to: "/changia", icon: "💸", key: "contribute" },
  { to: "/mikutano", icon: "📅", key: "meetings" },
  { to: "/mikopo", icon: "🤝", key: "loans" },
  { to: "/msaada", icon: "🆘", key: "help" },
];

export function BottomNav() {
  const { t } = useLang();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-5 pb-5">
      <div className="flex items-center justify-between rounded-3xl border border-card/70 bg-card/80 px-2 py-2 shadow-[0_-10px_40px_-20px_rgba(7,54,43,0.5)] backdrop-blur-xl">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            activeProps={{ className: "bg-brand text-cream" }}
            inactiveProps={{ className: "text-foreground/60" }}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2"
          >
            <span className="text-2xl" aria-hidden="true">
              {it.icon}
            </span>
            <span className="text-[12px] font-bold">{t(it.key)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
