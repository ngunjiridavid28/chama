import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getMembers } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/msaada")({
  head: () => ({
    meta: [
      { title: "Msaada — ChamaMkononi" },
      {
        name: "description",
        content: "Pata msaada: piga simu kwa viongozi wa chama na maswali ya kawaida.",
      },
      { property: "og:title", content: "Msaada — ChamaMkononi" },
      { property: "og:description", content: "Pata msaada kutoka kwa viongozi wa chama chako." },
    ],
  }),
  component: Help,
});

const faqs = [
  {
    q: "Nachangaje?",
    a: "Bonyeza kitufe kikubwa cha kijani kinachosema Changia, chagua kiasi, kisha bonyeza NDIO — TUMA.",
  },
  {
    q: "Nitajuaje kama nimelipa?",
    a: "Ukurasa wa kwanza unasema Umeshachanga au Umebakiza KSh ngapi.",
  },
  { q: "Mkutano ni lini?", a: "Ukurasa wa kwanza unaonyesha mkutano ujao na mahali pake." },
  {
    q: "Pesa ya chama iko wapi?",
    a: "Bonyeza Pesa kuona kila senti iliyoingia na iliyotoka, na nani aliandika.",
  },
];

interface MemberInfo {
  id: string;
  display_name: string;
  phone: string | null;
  role: string;
  user_id: string | null;
}

function Help() {
  const fetchFn = useServerFn(getMembers);
  const { t } = useLang();
  const { data } = useChamaQuery(["members"], () => fetchFn());
  const leaders = ((data?.members ?? []) as MemberInfo[]).filter((m) => m.role !== "member");

  return (
    <Screen>
      <PageHeader title={t("help")} subtitle="Help" />

      <p className="mt-6 font-display text-xl font-bold">Piga simu kwa kiongozi</p>
      <div className="mt-3 grid gap-3">
        {leaders.map((m) => (
          <a
            key={m.id}
            href={`tel:${m.phone ?? ""}`}
            className="flex items-center gap-4 rounded-3xl bg-brand px-5 py-6 text-cream"
          >
            <span className="text-3xl" aria-hidden="true">
              ☎️
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold">{m.display_name}</span>
              <span className="block text-base opacity-80">{m.phone ?? "—"}</span>
            </span>
          </a>
        ))}
      </div>

      <p className="mt-6 font-display text-xl font-bold">Maswali ya kawaida</p>
      <div className="mt-3 grid gap-3">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-card/70 bg-card/70 p-4">
            <p className="text-lg font-bold">{f.q}</p>
            <p className="mt-1 text-base">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-2xl border border-border bg-card/70 p-4 text-base text-muted-foreground">
        Kusema kwa sauti (mfano: “Nimelipa mia tano ya chama”), M-Pesa, SMS na WhatsApp bado
        hazijaunganishwa. Voice, M-Pesa, SMS and WhatsApp are not connected yet.
      </p>
    </Screen>
  );
}
