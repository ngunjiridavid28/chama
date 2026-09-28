import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GlassField } from "@/components/chama/GlassField";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChamaMkononi — Kitabu cha chama kwenye simu yako" },
      {
        name: "description",
        content:
          "Rahisi kutumia: michango, mikopo, mikutano na hesabu za chama kwa lugha ya Kiswahili. Simple chama record-keeping for Kenyan groups.",
      },
      { property: "og:title", content: "ChamaMkononi — Kitabu cha chama kwenye simu yako" },
      {
        property: "og:description",
        content: "Michango, mikopo, mikutano na hesabu za chama — kwa Kiswahili na Kiingereza.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/nyumbani", replace: true });
    });
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <GlassField />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 py-10">
        <div className="flex justify-end">
          <div className="flex overflow-hidden rounded-full border border-border bg-card/70">
            {(["sw", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 text-base font-bold ${lang === l ? "bg-brand text-cream" : "text-foreground/60"}`}
              >
                {l === "sw" ? "Kiswahili" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="grid size-16 place-items-center rounded-3xl bg-brand font-display text-2xl font-extrabold text-cream">
            C
          </div>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">ChamaMkononi</h1>
          <p className="mt-3 text-xl text-muted-foreground">{t("tagline")}</p>
          <ul className="mt-6 space-y-3 text-lg">
            <li className="flex gap-3">
              <span aria-hidden="true">💸</span> Michango · Contributions
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">🤝</span> Mikopo · Loans
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">📅</span> Mikutano · Meetings
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">📖</span> Kitabu cha chama · Chama book
            </li>
          </ul>
        </div>

        <div className="grid gap-3">
          <Link
            to="/auth"
            className="rounded-3xl bg-brand py-6 text-center font-display text-2xl font-extrabold text-cream"
          >
            {t("signIn")}
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-3xl border border-border bg-card py-6 text-center font-display text-2xl font-extrabold"
          >
            {t("signUp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
