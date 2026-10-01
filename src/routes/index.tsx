import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChamaMkononi — Kitabu cha Chama Kwenye Simu Yako" },
      {
        name: "description",
        content:
          "Mfumo wa kisasa wa kusimamia michango, mikopo, mzunguko wa Merry-Go-Round na mikutano ya chama nchini Kenya kwa uwazi kamili.",
      },
      { property: "og:title", content: "ChamaMkononi — Kitabu cha Chama Kwenye Simu Yako" },
      {
        property: "og:description",
        content:
          "Mfumo wa kisasa wa kusimamia michango, mikopo, mzunguko wa Merry-Go-Round na mikutano ya chama nchini Kenya.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/nyumbani", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand font-display text-lg font-black text-cream shadow-sm">
              CM
            </div>
            <div>
              <span className="font-display text-base font-extrabold tracking-tight text-foreground">
                ChamaMkononi
              </span>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Kenya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bilingual Switcher */}
            <div className="flex rounded-full border border-border bg-card p-1 text-xs font-bold shadow-sm">
              <button
                type="button"
                onClick={() => setLang("sw")}
                className={`rounded-full px-3 py-1 font-bold transition ${
                  lang === "sw"
                    ? "bg-brand text-cream shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kiswahili
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 font-bold transition ${
                  lang === "en"
                    ? "bg-brand text-cream shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English
              </button>
            </div>

            <Link
              to="/auth"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition"
            >
              {lang === "sw" ? "Ingia" : "Sign In"}
            </Link>

            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="hidden sm:inline-flex rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-cream shadow-sm hover:opacity-95 transition"
            >
              {lang === "sw" ? "Anza Bure" : "Get Started"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand">
                <span>🇰🇪</span>
                <span>
                  {lang === "sw"
                    ? "Mfumo Mahsusi wa Vyama Vyote vya Kenya"
                    : "Tailored for Every Kenyan Chama"}
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                {lang === "sw" ? (
                  <>
                    Chama cha Kisasa <br className="hidden sm:inline" />
                    <span className="text-brand">Kwenye Simu Yako</span>
                  </>
                ) : (
                  <>
                    Modern Chama Banking <br className="hidden sm:inline" />
                    <span className="text-brand">Right in Your Hands</span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                {lang === "sw"
                  ? "Jiunge na maelfu ya vikundi kote nchini vinavyoendesha michango ya M-Pesa, mikopo ya meza, mzunguko wa Merry-Go-Round na mikutano kwa uwazi wa 100%. Hakuna tena vitabu vilivyopotea au hesabu zinazogongana."
                  : "Smart financial transparency for investment groups, merry-go-rounds, table banking, and welfare saccos across Kenya. Track contributions, loans, and payouts with complete accountability."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 font-display text-base font-extrabold text-cream shadow-lg shadow-brand/20 transition hover:opacity-95"
                >
                  <span>{lang === "sw" ? "Anza Sasa Bure" : "Get Started Free"}</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/auth"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-4 font-display text-base font-bold text-foreground hover:bg-muted transition"
                >
                  <span>{lang === "sw" ? "Ingia Kwenye Chama" : "Sign In to Chama"}</span>
                </Link>
              </div>

              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  ✓ {lang === "sw" ? "Hakuna ada ya kujiunga" : "Free to join"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  ✓ {lang === "sw" ? "Inasaidia M-Pesa" : "M-Pesa integrated"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  ✓ {lang === "sw" ? "Salama na ya kuaminika" : "Bank-grade safe"}
                </span>
              </div>
            </div>

            {/* Right Image: Kenyans gathered under tree using smartphones */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border-2 border-brand/20 shadow-2xl bg-muted">
                <img
                  src="/src/assets/images/chama_tree_gathering_1790857476768.jpg"
                  alt="Kenyan community members gathered outdoors under an acacia tree using smartphones to manage their chama"
                  referrerPolicy="no-referrer"
                  className="w-full h-[320px] sm:h-[400px] object-cover object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                  <span className="inline-block w-fit rounded-lg bg-emerald-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    Ushirika wa Kweli
                  </span>
                  <p className="mt-1 font-display text-base font-bold">
                    {lang === "sw"
                      ? "Mikutano chini ya kivuli, hesabu zote mtandaoni."
                      : "Community meetings under the shade, all books online."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="border-y border-border/80 bg-card/60 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-brand">KSh 150M+</p>
              <p className="mt-1 text-xs text-muted-foreground font-semibold">
                {lang === "sw" ? "Michango Iliyorekodiwa" : "Contributions Tracked"}
              </p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-foreground">
                12,000+
              </p>
              <p className="mt-1 text-xs text-muted-foreground font-semibold">
                {lang === "sw" ? "Wanachama Kote Nchini" : "Members Across Kenya"}
              </p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-brand">100%</p>
              <p className="mt-1 text-xs text-muted-foreground font-semibold">
                {lang === "sw" ? "Uwazi wa M-Pesa & Hazina" : "M-Pesa Transparency"}
              </p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-foreground">0</p>
              <p className="mt-1 text-xs text-muted-foreground font-semibold">
                {lang === "sw" ? "Vitabu vya Karatasi" : "Paper Books Needed"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid (Bento) */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand">
              {lang === "sw" ? "Uwezo Kamili wa Chama" : "All-in-One Capabilities"}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
              {lang === "sw"
                ? "Kila Kitu Unachohitaji Kuendesha Chama Yako"
                : "Everything You Need to Run Your Chama"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === "sw"
                ? "Imebuniwa kulingana na desturi na mila za vyama vyetu nchini Kenya."
                : "Built purposefully for the authentic way Kenyan investment groups operate."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1: M-Pesa & Michango */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                💸
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Michango ya M-Pesa & Risiti" : "M-Pesa & Digital Receipts"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Rekodi nambari ya SMS ya M-Pesa mara moja. Mweka hazina anathibitisha na kutoa risiti ya kidijitali papo hapo."
                  : "Track M-Pesa codes directly. Treasurers reconcile payments instantly with immutable digital receipts."}
              </p>
            </div>

            {/* Feature 2: Mikopo & Wadhamini */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">
                🤝
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Mikopo ya Meza & Wadhamini" : "Table Banking & Guarantors"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Omba mkopo kwa riba nafuu ya 10%. Chagua mwanachama mdhamini (guarantor) na ufuatilie maendeleo ya kurejesha."
                  : "Apply for table banking loans with clear 10% interest rates, member guarantors, and visual repayment bars."}
              </p>
            </div>

            {/* Feature 3: Merry-Go-Round */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
                🔄
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Mzunguko wa Merry-Go-Round" : "Merry-Go-Round Rotation"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Jedwali rasmi la zamu za kupokea pesa (pot) kila mwezi. Mfumo unamkumbusha kila mwanachama wakati wake unapofika."
                  : "Automated rotation calendar. Track who receives the pooled monthly lump sum with zero confusion."}
              </p>
            </div>

            {/* Feature 4: Kitabu cha Chama */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl">
                📖
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Kitabu Kikuu & Ripoti za CSV" : "General Ledger & CSV Export"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Hesabu zote za mapato na matumizi zinarekodiwa kwa mfumo wa kisasa wa double-entry, tayari kwa ukaguzi wa AGM."
                  : "Audited double-entry books with CSV Excel export and clipboard reports ready for annual general meetings."}
              </p>
            </div>

            {/* Feature 5: Mikutano & Kumbukumbu */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl">
                📅
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Mikutano, Mahudhurio & Ajenda" : "Meetings, RSVPs & Minutes"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Ratibu mikutano, thibitisha mahudhurio ya wanachama (RSVP), fanya roll-call ya kimwili na andika kumbukumbu rasmi."
                  : "Schedule gatherings, collect digital RSVPs, conduct physical roll call, and share official minutes on WhatsApp."}
              </p>
            </div>

            {/* Feature 6: WhatsApp Integration */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3 hover:border-brand/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/10 text-2xl">
                💬
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Ujumbe wa WhatsApp" : "One-Tap WhatsApp Broadcasts"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? "Tuma ripoti za fedha, risiti za malipo, na vikumbusho vya mkutano moja kwa moja kwenye kikundi chenu cha WhatsApp."
                  : "Share receipts, treasury balances, rotation schedules, and meeting invitations directly to your WhatsApp group."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Diversity & Inclusivity Section: Chama for Everyone */}
      <section className="border-t border-border/80 bg-muted/20 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand">
              {lang === "sw" ? "Wazi kwa Wote" : "Inclusive for All"}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
              {lang === "sw" ? "Chama ya Kila Mkenya" : "Built for Every Kenyan Group"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === "sw"
                ? "Iwe ni kikundi cha biashara, kilimo, vijana, marafiki, au ustawi wa jamii — ChamaMkononi inawafaa wote."
                : "Whether you run an investment club, transport sacco, agribusiness, or community welfare group."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🌾",
                title: lang === "sw" ? "Vikundi vya Kilimo" : "Farmers & Agribusiness",
                desc:
                  lang === "sw"
                    ? "Akiba za mbolea, mbegu na mavuno"
                    : "Harvest pooling & farm inputs",
              },
              {
                icon: "🛵",
                title: lang === "sw" ? "Boda Boda & Usafiri" : "Transport & Boda Boda",
                desc:
                  lang === "sw" ? "Akiba ya matengenezo na bima" : "Maintenance & group savings",
              },
              {
                icon: "🏪",
                title: lang === "sw" ? "Wafanyabiashara wa Masoko" : "Market Traders & Retailers",
                desc:
                  lang === "sw" ? "Mikopo ya mtaji wa kila siku" : "Daily micro-loans & cashflow",
              },
              {
                icon: "💼",
                title: lang === "sw" ? "Wataalamu & Uwekezaji" : "Investment Clubs",
                desc: lang === "sw" ? "Miradi ya ardhi na hisa" : "Property & wealth development",
              },
              {
                icon: "🎓",
                title: lang === "sw" ? "Vijana & Alumni" : "Youth & Alumni Groups",
                desc: lang === "sw" ? "Kuanzisha biashara na elimu" : "Startup capital & education",
              },
              {
                icon: "🏡",
                title: lang === "sw" ? "Familia & Ustawi" : "Family & Welfare Saccos",
                desc:
                  lang === "sw" ? "Msaada wa dharura na sherehe" : "Emergency & benevolence funds",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl bg-brand p-8 sm:p-12 text-center text-cream shadow-xl space-y-6">
            <h2 className="font-display text-3xl sm:text-4xl font-black max-w-xl mx-auto">
              {lang === "sw"
                ? "Anzisha Chama Yako Kidijitali Leo"
                : "Transform Your Chama Management Today"}
            </h2>
            <p className="text-sm sm:text-base opacity-90 max-w-lg mx-auto">
              {lang === "sw"
                ? "Jiunge bila malipo. Usajili unachukua chini ya dakika 1 kuanza."
                : "Free to start. Register in less than 1 minute and invite your members."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-2xl bg-cream px-8 py-4 font-display text-base font-extrabold text-brand shadow-lg transition hover:bg-cream/90"
              >
                {lang === "sw" ? "Unda Chama Yako Bure" : "Create Your Chama Free"}
              </Link>
              <Link
                to="/auth"
                className="rounded-2xl border border-cream/40 bg-transparent px-8 py-4 font-display text-base font-bold text-cream hover:bg-cream/10 transition"
              >
                {lang === "sw" ? "Ingia Kama Mwanachama" : "Sign In As Member"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© 2026 ChamaMkononi. Haki zote zimehifadhiwa. Made for all Kenyan chamas.</p>
      </footer>
    </div>
  );
}
