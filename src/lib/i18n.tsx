import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "sw" | "en";

/**
 * Wording rules: everyday Kenyan chama language first, never literal banking
 * translations. Add another Kenyan language by adding a key block here.
 */
const dict = {
  appName: { sw: "ChamaMkononi", en: "ChamaMkononi" },
  tagline: {
    sw: "Kitabu cha chama, kwenye simu yako",
    en: "Your chama book, on your phone",
  },
  greeting: { sw: "Habari", en: "Hello" },
  chamaMoney: { sw: "Pesa ya chama", en: "Chama money" },
  myShare: { sw: "Mchango wangu", en: "My contribution" },
  paidAll: { sw: "Umeshachanga", en: "You have paid" },
  stillOwe: { sw: "Umebakiza", en: "You still owe" },
  haveYouPaid: { sw: "Umechanga?", en: "Have you paid?" },
  contribute: { sw: "Changia", en: "Contribute" },
  myChama: { sw: "Chama Yangu", en: "My Chama" },
  loans: { sw: "Mikopo", en: "Loans" },
  meetings: { sw: "Mikutano", en: "Meetings" },
  help: { sw: "Msaada", en: "Help" },
  book: { sw: "Kitabu", en: "Chama Book" },
  money: { sw: "Pesa", en: "Money" },
  home: { sw: "Nyumbani", en: "Home" },
  nextMeeting: { sw: "Mkutano ujao", en: "Next meeting" },
  announcement: { sw: "Tangazo", en: "Announcement" },
  coming: { sw: "NITAKUJA", en: "I AM COMING" },
  notComing: { sw: "SITAKUJA", en: "I CANNOT COME" },
  loanOwed: { sw: "Mkopo unaodaiwa", en: "Loan you owe" },
  amountToPay: { sw: "Utalipa", en: "Amount to pay" },
  nextPayment: { sw: "Malipo yajayo", en: "Next payment" },
  alreadyPaid: { sw: "Umeshalipa", en: "Already paid" },
  remaining: { sw: "Imebaki", en: "Remaining" },
  yesSend: { sw: "NDIO — TUMA", en: "YES — SEND" },
  noBack: { sw: "HAPANA — RUDI", en: "NO — GO BACK" },
  confirmQuestion: { sw: "UNATAKA KUTUMA", en: "DO YOU WANT TO SEND" },
  moneyIn: { sw: "Pesa iliyoingia", en: "Money received" },
  moneyOut: { sw: "Pesa iliyotoka", en: "Money spent" },
  loansGiven: { sw: "Mikopo iliyotolewa", en: "Loans given" },
  repayments: { sw: "Marejesho", en: "Loan repayments" },
  balance: { sw: "Iliyobaki sasa", en: "Current balance" },
  recordedBy: { sw: "Aliandika", en: "Recorded by" },
  approvedBy: { sw: "Alikubali", en: "Approved by" },
  signIn: { sw: "INGIA", en: "SIGN IN" },
  signUp: { sw: "JISAJILI", en: "CREATE ACCOUNT" },
  signOut: { sw: "TOKA", en: "SIGN OUT" },
  back: { sw: "Rudi", en: "Back" },
  save: { sw: "Weka", en: "Save" },
  cancel: { sw: "Acha", en: "Cancel" },
  loading: { sw: "Inapakia…", en: "Loading…" },
  offline: {
    sw: "Hakuna mtandao — unaona taarifa za mwisho",
    en: "No internet — showing last saved info",
  },
} as const;

export type TKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LangCtx = createContext<Ctx>({ lang: "sw", setLang: () => {}, t: (k) => dict[k].sw });

let memoryLang: Lang = "sw";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "sw";
  try {
    const saved = window.localStorage.getItem("chama_lang");
    if (saved === "en" || saved === "sw") return saved;
  } catch {
    // iframe partition fallback
  }
  return memoryLang;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("chama_lang");
      if (saved === "en" || saved === "sw") {
        setLangState(saved);
        memoryLang = saved;
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    memoryLang = l;
    try {
      window.localStorage.setItem("chama_lang", l);
    } catch {
      // storage blocked in iframe
    }
    // Update html lang attribute
    try {
      if (typeof document !== "undefined") {
        document.documentElement.lang = l;
      }
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((k: TKey) => dict[k]?.[lang] ?? dict[k]?.sw ?? k, [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function ksh(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

const swMonths = [
  "Januari",
  "Februari",
  "Machi",
  "Aprili",
  "Mei",
  "Juni",
  "Julai",
  "Agosti",
  "Septemba",
  "Oktoba",
  "Novemba",
  "Desemba",
];
const swDays = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];

export function formatDay(dateStr: string | null | undefined, lang: Lang) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (lang === "sw") return `${swDays[d.getDay()]} · ${d.getDate()} ${swMonths[d.getMonth()]}`;
  return d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
}

export function getRoleWord(role: string | null | undefined, lang: Lang): string {
  const r = (role || "").toLowerCase();
  if (r === "chairperson") return lang === "sw" ? "Mwenyekiti" : "Chairperson";
  if (r === "treasurer") return lang === "sw" ? "Mweka Hazina" : "Treasurer";
  if (r === "secretary") return lang === "sw" ? "Katibu" : "Secretary";
  return lang === "sw" ? "Mwanachama" : "Member";
}
