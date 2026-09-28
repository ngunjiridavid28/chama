import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GlassField } from "./GlassField";
import { BottomNav } from "./BottomNav";
import { useLang } from "@/lib/i18n";

/** Shared page frame: glass background, phone-width column, bottom nav. */
export function Screen({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <GlassField />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-7">
        {children}
      </div>
      {nav ? <BottomNav /> : null}
    </div>
  );
}

/** Header with a back arrow and a big page title, used on every inner screen. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  const { t } = useLang();
  return (
    <header className="flex items-center gap-3">
      <Link
        to="/nyumbani"
        aria-label={t("back")}
        className="grid size-12 shrink-0 place-items-center rounded-2xl border border-card/70 bg-card/70 text-2xl text-brand-ink backdrop-blur-md"
      >
        ←
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
    </header>
  );
}
