import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getMembers } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/msaada")({
  head: () => ({
    meta: [
      { title: "Msaada & Katiba ya Chama — ChamaMkononi" },
      {
        name: "description",
        content:
          "Mwongozo wa chama, katiba, kanuni za mikopo, mawasiliano ya viongozi na maswali ya kawaida.",
      },
      { property: "og:title", content: "Msaada & Katiba ya Chama — ChamaMkononi" },
      {
        property: "og:description",
        content:
          "Mwongozo wa chama, katiba, kanuni za mikopo, mawasiliano ya viongozi na maswali ya kawaida.",
      },
    ],
  }),
  component: HelpView,
});

interface MemberInfo {
  id: string;
  display_name: string;
  phone: string | null;
  role: string;
  user_id: string | null;
}

const faqsSw = [
  {
    q: "Jinsi gani ninaweza kulipa mchango wangu wa mwezi?",
    a: "Fungua ukurasa wa 'Changia', chagua kiasi cha mchango wako, kisha chagua njia ya malipo (M-Pesa au Pesa Mkononi). Ikiwa unalipa kwa M-Pesa, weka nambari ya muamala (SMS Code) ili mweka hazina athibitishe na upokee risiti yako ya kidijitali.",
  },
  {
    q: "Je, ninaweza kuomba mkopo lini?",
    a: "Mwanachama yeyote aliyethibitishwa na kukamilisha michango anaweza kuomba mkopo kupitia ukurasa wa 'Mikopo'. Unatakiwa kuchagua mwanachama mmoja atakayekuwa mdhamini (guarantor) wako na kueleza sababu ya mkopo. Uongozi utapitia ombi lako.",
  },
  {
    q: "Merry-Go-Round inafanyaje kazi?",
    a: "Kila mwezi michango yote ya wanachama inakusanywa na kuunda mfuko wa mkupuo (pot). Mwanachama aliyepangiwa zamu yake kwenye ratiba ya mzunguko anapokea kiasi chote kwa mwezi huo.",
  },
  {
    q: "Nitajuaje kama pesa yangu imefika salama?",
    a: "Kila senti inayolipwa inarekodiwa kwenye 'Kitabu cha Chama' na 'Pesa'. Mara malipo yanapothibitishwa, unapokea risiti rasmi na salio la hazina linaongezeka mara moja kwa uwazi kamili.",
  },
  {
    q: "Nini kitatokea nikikosa mkutano wa chama?",
    a: "Tafadhali toa taarifa mapema kupitia ukurasa wa 'Mikutano' kwa kubonyeza 'Sitaweza' kabla ya siku ya mkutano ili kuepuka faini ya kutohudhuria bila udhuru.",
  },
];

const faqsEn = [
  {
    q: "How do I pay my monthly contribution?",
    a: "Open the 'Changia' tab, pick your contribution amount, and choose your payment method (M-Pesa or Cash). If paying via M-Pesa, enter your SMS transaction code so the treasurer can reconcile it and issue your digital receipt.",
  },
  {
    q: "When can I apply for a loan?",
    a: "Any verified member in good standing can apply via the 'Mikopo' tab. You will select an active member to act as your guarantor and specify the purpose. Chama officials will review and approve.",
  },
  {
    q: "How does the Merry-Go-Round rotation work?",
    a: "Each month, member contributions pool into a single lump sum (the pot). The member whose turn is designated in the rotation schedule receives the entire payout for that month.",
  },
  {
    q: "How do I verify the chama treasury balance?",
    a: "Every transaction is logged in real-time under 'Kitabu' and 'Pesa'. Full double-entry ledgers show who recorded each transaction, ensuring complete accountability.",
  },
  {
    q: "What happens if I miss a meeting?",
    a: "Always submit your RSVP under 'Mikutano' by tapping 'Cannot attend' before the meeting date to avoid unexcused absence penalties.",
  },
];

const guidelinesSw = [
  {
    title: "1. Uanachama & Ada za Kujiunga",
    desc: "Mwanachama mpya lazima athibitishwe na uongozi, awasilishe nakala ya kitambulisho cha taifa (KYC), na akubaliane na masharti na madhumuni ya chama.",
  },
  {
    title: "2. Michango ya Lazima ya Kila Mwezi",
    desc: "Kila mwanachama anawajibika kulipa kiasi kilichokubaliwa kabla ya tarehe 5 ya kila mwezi. Malipo yote yanatolewa risiti halali ya kidijitali.",
  },
  {
    title: "3. Kanuni za Mikopo & Riba (10%)",
    desc: "Mwanachama anaruhusiwa kukopa hadi mara 3 ya akiba zake. Mikopo inatozwa riba nafuu ya 10% kwa muda wa mwezi 1 hadi 6. Lazima kuwe na mdhamini mmoja mwenye akiba ya kutosha.",
  },
  {
    title: "4. Mzunguko wa Merry-Go-Round",
    desc: "Mfuatano wa kupokea pesa unapangwa kwa uwazi katika mkutano mkuu. Mwanachama hawezi kubadilisha zamu yake bila makubaliano rasmi na mwanachama mwingine.",
  },
  {
    title: "5. Faini & Utiifu wa Nidhamu",
    desc: "Kuchelewa kulipa mchango unatozwa faini ya KSh 100 kwa wiki. Kutohudhuria mkutano bila taarifa unatozwa faini ya KSh 200 ili kuimarisha mshikamano.",
  },
  {
    title: "6. Uwazi wa Fedha & Ukaguzi",
    desc: "Kitabu cha fedha kiko wazi kwa wanachama wote wakati wowote. Ripoti kamili ya mapato na matumizi inachapishwa kabla ya kila mkutano mkuu.",
  },
];

const guidelinesEn = [
  {
    title: "1. Membership & Registration",
    desc: "New members must be approved by officials, submit national ID KYC details, and agree to the chama constitution and collective objectives.",
  },
  {
    title: "2. Monthly Mandatory Contributions",
    desc: "Every member must remit their designated monthly contribution on or before the 5th of each month. Digital receipts are issued for all payments.",
  },
  {
    title: "3. Loan Regulations & Interest (10%)",
    desc: "Members may borrow up to 3x their accumulated savings at a 10% interest rate with a 1-6 month repayment window. At least one guarantor is mandatory.",
  },
  {
    title: "4. Merry-Go-Round Rotation",
    desc: "The rotation order is democratically set and published. Payout slots cannot be traded without formal mutual consent recorded by the secretary.",
  },
  {
    title: "5. Fines & Code of Conduct",
    desc: "Late contributions incur a KSh 100 weekly fee. Unexcused meeting absences incur a KSh 200 penalty to maintain commitment and active participation.",
  },
  {
    title: "6. Financial Transparency & Audit",
    desc: "The general ledger book is accessible to all members anytime. Full CSV statements are compiled for year-end AGM audits.",
  },
];

function HelpView() {
  const fetchFn = useServerFn(getMembers);
  const { t, lang, setLang } = useLang();
  const { data } = useChamaQuery(["members"], () => fetchFn());

  const [activeTab, setActiveTab] = useState<"leaders" | "guidelines" | "faqs">("leaders");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const leaders = ((data?.members ?? []) as MemberInfo[]).filter(
    (m) => m.role === "chairperson" || m.role === "treasurer" || m.role === "secretary",
  );

  const faqs = lang === "sw" ? faqsSw : faqsEn;
  const guidelines = lang === "sw" ? guidelinesSw : guidelinesEn;

  function getRoleLabel(role: string) {
    if (role === "chairperson") return lang === "sw" ? "Mwenyekiti" : "Chairperson";
    if (role === "treasurer") return lang === "sw" ? "Mweka Hazina" : "Treasurer";
    if (role === "secretary") return lang === "sw" ? "Katibu" : "Secretary";
    return role;
  }

  function openWhatsApp(phone: string | null, name: string) {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `254${cleanPhone.slice(1)}` : cleanPhone;

    const msg =
      lang === "sw"
        ? `Habari ${name}, ninahitaji usaidizi kuhusu huduma za chama kwenye ChamaMkononi.`
        : `Hello ${name}, I need assistance regarding our chama on ChamaMkononi.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <Screen>
      <PageHeader
        title={lang === "sw" ? "Msaada & Mwongozo" : "Help & Guidelines"}
        subtitle="Mwongozo wa Chama, Katiba & Viongozi"
      />

      {/* Language Toggle Bar */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-sm">
        <span className="text-xs font-bold text-muted-foreground">
          {lang === "sw" ? "Lugha / Language:" : "Language / Lugha:"}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setLang("sw")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              lang === "sw"
                ? "bg-brand text-cream shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Kiswahili
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              lang === "en"
                ? "bg-brand text-cream shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-3 rounded-2xl border border-border bg-card p-1 text-xs font-bold shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("leaders")}
          className={`py-2.5 rounded-xl transition ${
            activeTab === "leaders" ? "bg-brand text-cream shadow-sm" : "text-muted-foreground"
          }`}
        >
          {lang === "sw" ? "☎️ Viongozi" : "☎️ Leaders"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guidelines")}
          className={`py-2.5 rounded-xl transition ${
            activeTab === "guidelines" ? "bg-brand text-cream shadow-sm" : "text-muted-foreground"
          }`}
        >
          {lang === "sw" ? "📜 Katiba" : "📜 Rules"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`py-2.5 rounded-xl transition ${
            activeTab === "faqs" ? "bg-brand text-cream shadow-sm" : "text-muted-foreground"
          }`}
        >
          {lang === "sw" ? "❓ Maswali" : "❓ FAQs"}
        </button>
      </div>

      {/* Tab 1: Leaders & Direct Emergency Contacts */}
      {activeTab === "leaders" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
            <p className="font-display text-base font-bold text-foreground">
              {lang === "sw" ? "Wasiliana na Viongozi wa Chama" : "Chama Official Contacts"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Wapigie simu moja kwa moja au zungumza nao kupitia WhatsApp kwa usaidizi wa haraka."
                : "Call directly or chat on WhatsApp for fast official assistance."}
            </p>

            <div className="mt-4 grid gap-3">
              {leaders.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-border p-4 bg-muted/10"
                >
                  <div>
                    <span className="inline-block rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand">
                      {getRoleLabel(m.role)}
                    </span>
                    <p className="mt-1 font-display text-base font-bold text-foreground">
                      {m.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">📞 {m.phone || "—"}</p>
                  </div>

                  <div className="flex gap-2">
                    {m.phone ? (
                      <>
                        <a
                          href={`tel:${m.phone}`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-cream shadow-sm transition hover:opacity-90"
                          title="Piga Simu"
                        >
                          <span className="text-sm">📞</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => openWhatsApp(m.phone, m.display_name)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm transition hover:opacity-90"
                          title="WhatsApp"
                        >
                          <span className="text-sm font-bold">WA</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}

              {leaders.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {lang === "sw"
                    ? "Hakuna viongozi walioteuliwa bado."
                    : "No officials assigned yet."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Chama Guidelines & Constitution */}
      {activeTab === "guidelines" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
            <p className="font-display text-base font-bold text-foreground">
              {lang === "sw" ? "Katiba & Kanuni za Chama" : "Chama Constitution & Rules"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Miongozo ya kuendesha chama kwa nidhamu, haki na uaminifu."
                : "Official rules governing contributions, lending, rotation and discipline."}
            </p>

            <div className="mt-4 grid gap-3">
              {guidelines.map((g, i) => (
                <div key={i} className="rounded-2xl border border-border p-4 bg-muted/10 space-y-1">
                  <p className="font-display text-sm font-bold text-foreground">{g.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: FAQs Accordion */}
      {activeTab === "faqs" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
            <p className="font-display text-base font-bold text-foreground">
              {lang === "sw" ? "Maswali Yanayoulizwa Mara kwa Mara" : "Frequently Asked Questions"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Majibu ya maswali ya kawaida kuhusu michango, mikopo na usalama wa fedha."
                : "Quick answers to help you navigate your chama effortlessly."}
            </p>

            <div className="mt-4 grid gap-2.5">
              {faqs.map((f, i) => {
                const isOpen = expandedFaq === i;
                return (
                  <div
                    key={i}
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="cursor-pointer rounded-2xl border border-border p-4 bg-muted/10 transition hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-bold text-foreground pr-2">{f.q}</p>
                      <span className="text-muted-foreground font-bold text-base">
                        {isOpen ? "−" : "+"}
                      </span>
                    </div>

                    {isOpen ? (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
                        {f.a}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
