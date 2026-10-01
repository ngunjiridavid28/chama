import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/chama/Screen";
import { BigButton } from "@/components/chama/BigButton";
import { getHome, saveRsvp } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, getRoleWord, ksh, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/nyumbani")({
  head: () => ({
    meta: [
      { title: "Nyumbani — ChamaMkononi" },
      { name: "description", content: "Pesa ya chama, mchango wako, mkopo na mkutano ujao." },
      { property: "og:title", content: "Nyumbani — ChamaMkononi" },
      {
        property: "og:description",
        content: "Pesa ya chama, mchango wako, mkopo na mkutano ujao.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const fetchHome = useServerFn(getHome);
  const rsvpFn = useServerFn(saveRsvp);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const { data, isLoading, offline } = useChamaQuery(["home"], () => fetchHome());

  const rsvp = useMutation({
    mutationFn: (response: "coming" | "not_coming") =>
      rsvpFn({ data: { meetingId: data!.meeting!.id, response } }),
    onSuccess: () => {
      toast.success("Asante, tumeweka jibu lako.");
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("Imeshindikana. Jaribu tena."),
  });

  if (isLoading && !data) {
    return (
      <Screen>
        <p className="mt-10 text-center text-xl">{t("loading")}</p>
      </Screen>
    );
  }

  // 1. Pending Approval State
  if (data?.isPending) {
    return (
      <Screen nav={false}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600">
            <svg
              className="h-10 w-10 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="mt-6 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-700">
            {lang === "sw" ? "Maombi Yanasubiriwa" : "Pending Approval"}
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {lang === "sw" ? "Subira Kidogo..." : "Awaiting Approval..."}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {lang === "sw"
              ? "Maombi yako yamewasilishwa kwa Mwenyekiti wa kikundi. Mara tu yatakapoidhinishwa, akaunti yako itakuwa tayari kutumika."
              : "Your membership application has been submitted to the Chairperson. Once approved, you will have full access to your chama dashboard."}
          </p>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-brand py-4 font-display text-base font-bold text-cream shadow-sm"
            >
              {lang === "sw" ? "Angalia Kama Umeidhinishwa" : "Check Approval Status"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {lang === "sw" ? "Toka Kwenye Akaunti · Sign Out" : "Sign Out"}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // 2. No Chama Yet State (Fresh User onboarding)
  if (!data?.member) {
    return (
      <Screen nav={false}>
        <div className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display font-black text-cream shadow-sm">
              CM
            </div>
            <div>
              <span className="font-display text-sm font-black uppercase tracking-wider text-brand">
                Chama Mkononi
              </span>
              <p className="text-xs text-muted-foreground">
                {lang === "sw"
                  ? "Uongozi wa Kidijitali kwa Vyama"
                  : "Digital Governance for Chamas"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h1 className="font-display text-3xl font-extrabold text-foreground">
              {lang === "sw" ? "Karibu Chama Mkononi!" : "Welcome to Chama Mkononi!"}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {lang === "sw"
                ? "Bado hujaunganishwa na chama chochote. Ungependa kuanza vipi leo?"
                : "You are not connected to any Chama yet. How would you like to get started?"}
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/chama" })}
              className="group flex flex-col items-start rounded-3xl border-2 border-brand/20 bg-brand/5 p-6 text-left transition hover:border-brand/50 hover:bg-brand/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-cream shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="mt-4 font-display text-xl font-bold text-foreground">
                {lang === "sw" ? "Unda Chama Kipya" : "Create a New Chama"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "sw"
                  ? "Kwa Wenyeviti: Sajili jina la chama chako, weka kiasi cha mchango na utoe nambari ya siri ya kuwaalika wanachama."
                  : "For Chairpersons: Register your chama, set contribution targets, and get an invite code for your members."}
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-brand group-hover:underline">
                {lang === "sw" ? "Anza kusajili chama →" : "Start registration →"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/jiunge" })}
              className="group flex flex-col items-start rounded-3xl border border-border bg-card p-6 text-left transition hover:border-foreground/30 hover:bg-muted/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10 text-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <p className="mt-4 font-display text-xl font-bold text-foreground">
                {lang === "sw" ? "Jiunge na Chama Kilichopo" : "Join an Existing Chama"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "sw"
                  ? "Kwa Wanachama: Weka nambari ya chama uliyopewa na kiongozi wako ili uombe kujiunga."
                  : "For Members: Enter your invite code given by your leader to find and join your group."}
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-foreground group-hover:underline">
                {lang === "sw" ? "Weka nambari ya kujiunga →" : "Enter join code →"}
              </span>
            </button>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-center">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              {lang === "sw" ? "Toka Kwenye Akaunti · Sign Out" : "Sign Out"}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  const initials = data.member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand font-display text-lg font-extrabold text-cream">
            {data.chama.name[0]}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
              ChamaMkononi
            </p>
            <p className="font-display text-base font-bold leading-tight">{data.chama.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "sw" ? "en" : "sw")}
            className="grid size-11 place-items-center rounded-full border border-brand/20 bg-card/70 text-sm font-bold text-brand"
            aria-label="Badilisha lugha · Change language"
          >
            {lang === "sw" ? "EN" : "SW"}
          </button>
          <Link
            to="/chama"
            className="grid size-11 place-items-center rounded-full bg-foreground/5 font-display text-sm font-bold"
            aria-label={t("myChama")}
          >
            {initials}
          </Link>
        </div>
      </header>

      {offline ? (
        <p className="mt-4 rounded-2xl border border-border bg-card/70 p-3 text-center text-base font-bold">
          {t("offline")}
        </p>
      ) : null}

      <div className="mt-6">
        <p className="text-lg text-foreground/70">
          {t("greeting")}, {data.member.name} 👋 · {getRoleWord(data.member.role, lang)}
        </p>
        <div className="mt-3 rounded-3xl border border-card/70 bg-card/70 p-5 backdrop-blur-md">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand">
            {t("chamaMoney")}
          </p>
          <p className="mt-1 font-display text-4xl font-extrabold leading-none">
            {ksh(data.balance)}
          </p>
          <p className="mt-3 text-lg">
            {data.month.remaining === 0 ? (
              <span className="font-bold">✓ {t("paidAll")}</span>
            ) : (
              <>
                <span className="font-bold">{t("haveYouPaid")}</span>{" "}
                <span className="font-bold">
                  {t("stillOwe")} {ksh(data.month.remaining)}
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {t("myShare")}: {ksh(data.month.paid)} / {ksh(data.month.required)} ·{" "}
            {data.month.period}
          </p>
          <p className="mt-2 text-base">
            {t("loanOwed")}:{" "}
            <span className="font-bold">
              {data.loan.remaining === 0 ? "Hakuna · None" : ksh(data.loan.remaining)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <BigButton
          wide
          tone="brand"
          icon="💸"
          to="/changia"
          title={t("contribute")}
          subtitle={
            data.month.remaining > 0
              ? `${t("stillOwe")} ${ksh(data.month.remaining)}`
              : t("paidAll")
          }
        />
        <BigButton icon="👥" to="/chama" title={t("myChama")} subtitle="My Chama" />
        <BigButton icon="🤝" to="/mikopo" title={t("loans")} subtitle="Loans" />
        <BigButton icon="📅" to="/mikutano" title={t("meetings")} subtitle="Meetings" />
        <BigButton icon="📖" to="/kitabu" title={t("book")} subtitle="Chama Book" />
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-3xl border border-card/70 bg-card/70 p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-2xl"
              aria-hidden="true"
            >
              📍
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">
                {t("nextMeeting")}
              </p>
              {data.meeting ? (
                <>
                  <p className="font-display text-lg font-bold leading-tight">
                    {formatDay(data.meeting.meet_on, lang)} ·{" "}
                    {String(data.meeting.meet_at).slice(0, 5)}
                  </p>
                  <p className="text-base text-muted-foreground">{data.meeting.location}</p>
                </>
              ) : (
                <p className="text-lg font-bold">
                  {lang === "sw" ? "Hakuna mkutano uliopangwa bado" : "No meetings scheduled yet"}
                </p>
              )}
            </div>
          </div>
          {data.meeting ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => rsvp.mutate("coming")}
                className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                  data.myRsvp === "coming" ? "bg-brand text-cream" : "border border-border bg-card"
                }`}
              >
                ✓ {t("coming")}
              </button>
              <button
                onClick={() => rsvp.mutate("not_coming")}
                className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                  data.myRsvp === "not_coming"
                    ? "bg-ink text-cream"
                    : "border border-border bg-card"
                }`}
              >
                ✕ {t("notComing")}
              </button>
            </div>
          ) : null}
        </div>

        {data.announcement ? (
          <div className="flex items-center gap-3 rounded-3xl border border-warn/50 bg-warn-soft p-4">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn/30 text-xl"
              aria-hidden="true"
            >
              📢
            </span>
            <p className="text-base leading-snug">
              <span className="font-bold">{t("announcement")}: </span>
              {data.announcement.message}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <BigButton icon="💰" to="/pesa" title={t("money")} subtitle="Money records" />
          <BigButton icon="🆘" to="/msaada" title={t("help")} subtitle="Help" />
        </div>

        <button
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
          className="rounded-2xl border border-border bg-card py-4 text-lg font-bold"
        >
          {t("signOut")}
        </button>
      </div>
    </Screen>
  );
}
