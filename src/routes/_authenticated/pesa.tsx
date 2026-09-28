import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getMoney } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/pesa")({
  head: () => ({
    meta: [
      { title: "Pesa ya Chama — ChamaMkononi" },
      {
        name: "description",
        content: "Hesabu za fedha, kitabu cha mapato na matumizi — uwazi kamili.",
      },
      { property: "og:title", content: "Pesa ya Chama — ChamaMkononi" },
      {
        property: "og:description",
        content: "Hesabu za fedha, kitabu cha mapato na matumizi — uwazi kamili.",
      },
    ],
  }),
  component: Money,
});

interface LedgerEntryItem {
  id: string;
  kind: "in" | "out";
  amount: number;
  category: string;
  description: string;
  occurred_on: string;
  recorded_by: string | null;
  approved_by: string | null;
}

function Money() {
  const fetchFn = useServerFn(getMoney);
  const { t, lang } = useLang();
  const { data, isLoading } = useChamaQuery(["money"], () => fetchFn());
  const totals = data?.totals;

  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const entries = ((data?.entries ?? []) as LedgerEntryItem[]).filter((e) => {
    if (filter === "in") return e.kind === "in";
    if (filter === "out") return e.kind === "out";
    return true;
  });

  function shareFinancialSummary() {
    const balance = totals?.balance ?? 0;
    const totalIn = totals?.in ?? 0;
    const totalOut = totals?.out ?? 0;
    const loans = totals?.loans ?? 0;
    const repayments = totals?.repayments ?? 0;

    const summaryText =
      lang === "sw"
        ? `📊 *RIPOTI YA FEDHA ZA CHAMA*\n\n` +
          `💵 *Salio la Sasa:* ${ksh(balance)}\n` +
          `⬇ *Jumla Iliyoingia:* ${ksh(totalIn)}\n` +
          `⬆ *Jumla Iliyotoka:* ${ksh(totalOut)}\n` +
          `🤝 *Mikopo Iliyotolewa:* ${ksh(loans)}\n` +
          `🔄 *Marejesho Yaliyopokelewa:* ${ksh(repayments)}\n\n` +
          `_Imetolewa kupitia ChamaMkononi._`
        : `📊 *CHAMA FINANCIAL REPORT*\n\n` +
          `💵 *Current Net Balance:* ${ksh(balance)}\n` +
          `⬇ *Total Inflow:* ${ksh(totalIn)}\n` +
          `⬆ *Total Outflow:* ${ksh(totalOut)}\n` +
          `🤝 *Loans Disbursed:* ${ksh(loans)}\n` +
          `🔄 *Loan Repayments:* ${ksh(repayments)}\n\n` +
          `_Generated via ChamaMkononi._`;

    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, "_blank");
  }

  function copySummary() {
    const balance = totals?.balance ?? 0;
    const summaryText =
      `RIPOTI YA FEDHA ZA CHAMA:\n` +
      `Salio la Sasa: ${ksh(balance)}\n` +
      `Jumla Iliyoingia: ${ksh(totals?.in ?? 0)}\n` +
      `Jumla Iliyotoka: ${ksh(totals?.out ?? 0)}\n` +
      `Mikopo: ${ksh(totals?.loans ?? 0)}`;
    navigator.clipboard.writeText(summaryText);
    toast.success(lang === "sw" ? "Ripoti imenakiliwa!" : "Summary copied!");
  }

  return (
    <Screen>
      <PageHeader title={t("money")} subtitle="Hesabu za Fedha · Treasury Ledger" />

      {/* Main Treasury Balance Card */}
      <div className="mt-5 rounded-3xl border-2 border-brand/20 bg-brand/10 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {lang === "sw" ? "Salio Kamili la Hazina" : "Total Net Balance"}
        </p>
        <p className="mt-1 font-display text-4xl font-black text-foreground">
          {ksh(totals?.balance ?? 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "sw"
            ? "Fedha zote zilizothibitishwa kwenye kitabu cha chama."
            : "All confirmed entries recorded in the chama ledger."}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={shareFinancialSummary}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
          >
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={copySummary}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {lang === "sw" ? "Nakili" : "Copy"}
          </button>
        </div>
      </div>

      {/* Financial Breakdown Cards */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-card/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            {lang === "sw" ? "Pesa Iliyoingia" : "Total Inflow"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground">
            {ksh(totals?.in ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-card/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
            {lang === "sw" ? "Pesa Iliyotoka" : "Total Outflow"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground">
            {ksh(totals?.out ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-card/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {lang === "sw" ? "Mikopo Iliyotolewa" : "Loans Given"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground">
            {ksh(totals?.loans ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-card/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
            {lang === "sw" ? "Marejesho" : "Repayments"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground">
            {ksh(totals?.repayments ?? 0)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex items-center justify-between">
        <p className="font-display text-xl font-bold text-foreground">
          {lang === "sw" ? "Kitabu cha Hesabu" : "Ledger Entries"}
        </p>

        <div className="flex rounded-xl border border-border bg-card p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 transition ${filter === "all" ? "bg-brand text-cream" : "text-muted-foreground"}`}
          >
            {lang === "sw" ? "Zote" : "All"}
          </button>
          <button
            type="button"
            onClick={() => setFilter("in")}
            className={`rounded-lg px-2.5 py-1 transition ${filter === "in" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}
          >
            {lang === "sw" ? "Mapato" : "In"}
          </button>
          <button
            type="button"
            onClick={() => setFilter("out")}
            className={`rounded-lg px-2.5 py-1 transition ${filter === "out" ? "bg-amber-600 text-white" : "text-muted-foreground"}`}
          >
            {lang === "sw" ? "Matumizi" : "Out"}
          </button>
        </div>
      </div>

      {/* Ledger Feed */}
      <div className="mt-3 grid gap-2.5">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-2xl border border-card/80 bg-card p-4 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    e.kind === "in"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {e.kind === "in" ? "⬇ IN" : "⬆ OUT"}
                </span>
                <p className="font-display text-base font-bold text-foreground">
                  {e.description || e.category}
                </p>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {formatDay(e.occurred_on, lang)} • {t("recordedBy")}:{" "}
                <span className="font-medium text-foreground">{nameOf(data, e.recorded_by)}</span>
              </p>
            </div>

            <p
              className={`font-display text-lg font-extrabold ${
                e.kind === "in" ? "text-emerald-700" : "text-foreground"
              }`}
            >
              {e.kind === "in" ? "+" : "-"}
              {ksh(e.amount)}
            </p>
          </div>
        ))}

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {lang === "sw" ? "Hakuna taarifa za fedha bado." : "No ledger entries found."}
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

function nameOf(
  data: { names?: { user_id: string | null; display_name: string }[] } | null | undefined,
  userId: string | null,
) {
  if (!userId) return "—";
  const found = (data?.names ?? []).find((n) => n.user_id === userId);
  return found?.display_name ?? "mwanachama";
}
