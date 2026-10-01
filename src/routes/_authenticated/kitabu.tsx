import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getKitabuLedger, recordExpenseEntry } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kitabu")({
  head: () => ({
    meta: [
      { title: "Kitabu cha Chama (General Ledger) — ChamaMkononi" },
      {
        name: "description",
        content: "Kitabu kikuu cha fedha, mapato, matumizi, na ukaguzi wa chama chako.",
      },
      { property: "og:title", content: "Kitabu cha Chama — ChamaMkononi" },
      {
        property: "og:description",
        content: "Kitabu kikuu cha fedha, mapato, matumizi, na ukaguzi wa chama.",
      },
    ],
  }),
  component: KitabuView,
});

interface LedgerItem {
  id: string;
  kind: "in" | "out";
  category: string;
  amount: number;
  description: string;
  occurred_on: string;
  recordedByName?: string;
  approvedByName?: string | null;
}

function KitabuView() {
  const fetchFn = useServerFn(getKitabuLedger);
  const recordExpenseFn = useServerFn(recordExpenseEntry);
  const qc = useQueryClient();
  const { t, lang } = useLang();

  const { data, isLoading } = useChamaQuery(["kitabu_ledger"], () => fetchFn());

  const isOfficial = ["treasurer", "chairperson", "secretary"].includes(data?.member?.role || "");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<"all" | "in" | "out">("all");

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    kind: "out" as "in" | "out",
    category: "gharama" as "gharama" | "adhabu" | "faida" | "mengineyo",
    amount: "",
    description: "",
    occurredOn: new Date().toISOString().slice(0, 10),
  });

  const recordExpenseMutation = useMutation({
    mutationFn: () => {
      const amt = Number(expenseForm.amount);
      if (!amt || amt <= 0) throw new Error("Weka kiasi sahihi.");
      return recordExpenseFn({
        data: {
          kind: expenseForm.kind,
          category: expenseForm.category,
          amount: amt,
          description: expenseForm.description.trim(),
          occurredOn: expenseForm.occurredOn || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(
        lang === "sw"
          ? "Muamala umerekodiwa kwenye kitabu cha chama!"
          : "Transaction recorded in general ledger!",
      );
      setShowExpenseModal(false);
      setExpenseForm({
        kind: "out",
        category: "gharama",
        amount: "",
        description: "",
        occurredOn: new Date().toISOString().slice(0, 10),
      });
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kurekodi.");
    },
  });

  const allEntries = useMemo(() => (data?.entries ?? []) as LedgerItem[], [data?.entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((e) => {
      if (selectedKind !== "all" && e.kind !== selectedKind) return false;
      if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const descMatch = e.description.toLowerCase().includes(query);
        const catMatch = e.category.toLowerCase().includes(query);
        const amtMatch = String(e.amount).includes(query);
        if (!descMatch && !catMatch && !amtMatch) return false;
      }
      return true;
    });
  }, [allEntries, selectedKind, selectedCategory, search]);

  // CSV Export
  function exportCSV() {
    if (allEntries.length === 0) {
      toast.error(lang === "sw" ? "Hakuna taarifa za kupakua." : "No records to export.");
      return;
    }

    const headers = ["Tarehe", "Aina", "Kitengo", "Maelezo", "Kiasi (KSh)", "Aliyerekodi"];
    const rows = allEntries.map((e) => [
      e.occurred_on,
      e.kind === "in" ? "Mapato (+)" : "Matumizi (-)",
      e.category,
      `"${e.description.replace(/"/g, '""')}"`,
      e.kind === "in" ? e.amount : -e.amount,
      `"${e.recordedByName || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `kitabu_cha_chama_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "sw" ? "Ripoti ya CSV imepakuliwa!" : "CSV statement downloaded!");
  }

  // Copy formatted text statement
  function copyTextStatement() {
    const totals = data?.totals ?? { in: 0, out: 0, balance: 0 };
    const dateStr = new Date().toISOString().slice(0, 10);

    const lines = [
      `📖 TAARIFA YA KITABU CHA CHAMA — ${data?.chama?.name || "Chama"}`,
      `Tarehe ya Ukaguzi: ${dateStr}`,
      `---------------------------------------`,
      `💰 Jumla ya Mapato (Inflows): ${ksh(totals.in)}`,
      `💸 Jumla ya Matumizi & Mikopo (Outflows): ${ksh(totals.out)}`,
      `🏦 Salio Lililopo (Balance): ${ksh(totals.balance)}`,
      `---------------------------------------`,
      `MIAMALA YA HIVI KARIBUNI:`,
      ...filteredEntries
        .slice(0, 15)
        .map(
          (e, i) =>
            `${i + 1}. [${e.occurred_on}] ${e.kind === "in" ? "+" : "-"}${ksh(e.amount)} (${e.category}) - ${e.description}`,
        ),
      `---------------------------------------`,
      `Imetolewa kidijitali kupitia ChamaMkononi.`,
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success(
      lang === "sw" ? "Ripoti imenakiliwa kwenye ubao!" : "Statement copied to clipboard!",
    );
  }

  const categoryLabels: Record<string, string> = {
    all: lang === "sw" ? "Zote" : "All",
    michango: lang === "sw" ? "Michango" : "Contributions",
    mkopo: lang === "sw" ? "Mikopo" : "Loans",
    marejesho: lang === "sw" ? "Marejesho" : "Repayments",
    merry_go_round: "Merry-Go-Round",
    gharama: lang === "sw" ? "Gharama" : "Expenses",
    adhabu: lang === "sw" ? "Adhabu/Faini" : "Fines",
  };

  return (
    <Screen>
      <PageHeader
        title={lang === "sw" ? "Kitabu cha Chama" : "General Ledger"}
        subtitle="Ukaguzi & Kumbukumbu za Fedha"
      />

      {/* Treasury Snapshot Cards */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
            {lang === "sw" ? "Mapato (+)" : "Inflows"}
          </p>
          <p className="mt-1 font-display text-base font-black text-emerald-950">
            {ksh(data?.totals?.in ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
            {lang === "sw" ? "Matumizi (-)" : "Outflows"}
          </p>
          <p className="mt-1 font-display text-base font-black text-amber-950">
            {ksh(data?.totals?.out ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-brand/10 p-3.5 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand">
            {lang === "sw" ? "Salio" : "Balance"}
          </p>
          <p className="mt-1 font-display text-base font-black text-foreground">
            {ksh(data?.totals?.balance ?? 0)}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted shadow-sm transition"
          >
            <span>📥</span>
            <span>CSV Excel</span>
          </button>

          <button
            type="button"
            onClick={copyTextStatement}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted shadow-sm transition"
          >
            <span>📋</span>
            <span>{lang === "sw" ? "Nakili Ripoti" : "Copy Report"}</span>
          </button>
        </div>

        {isOfficial ? (
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-cream shadow-sm hover:opacity-90 transition"
          >
            <span>+</span>
            <span>{lang === "sw" ? "REKODI GHARAMA / MAPATO" : "RECORD TRANSACTION"}</span>
          </button>
        ) : null}
      </div>

      {/* Search and Filters */}
      <div className="mt-4 space-y-3">
        {/* Search input */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === "sw"
                ? "Tafuta muamala, jina la mwanachama au nambari..."
                : "Search transaction, member or amount..."
            }
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-3.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Direction filter tabs */}
        <div className="grid grid-cols-3 rounded-xl border border-border bg-card p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedKind("all")}
            className={`py-2 rounded-lg transition ${
              selectedKind === "all" ? "bg-brand text-cream" : "text-muted-foreground"
            }`}
          >
            {lang === "sw" ? "Miamala Yote" : "All Flows"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind("in")}
            className={`py-2 rounded-lg transition ${
              selectedKind === "in" ? "bg-emerald-700 text-white" : "text-muted-foreground"
            }`}
          >
            + {lang === "sw" ? "Iliyoingia (In)" : "Inflows"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind("out")}
            className={`py-2 rounded-lg transition ${
              selectedKind === "out" ? "bg-amber-700 text-white" : "text-muted-foreground"
            }`}
          >
            - {lang === "sw" ? "Iliyotoka (Out)" : "Outflows"}
          </button>
        </div>

        {/* Category horizontal scroll chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {["all", "michango", "mkopo", "marejesho", "merry_go_round", "gharama", "adhabu"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 font-bold transition ${
                  selectedCategory === cat
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Ledger Table / List */}
      <div className="mt-4 rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-bold text-muted-foreground">
          <span>
            {filteredEntries.length} {lang === "sw" ? "Miamala Kitabuni" : "Records"}
          </span>
          <span>{lang === "sw" ? "Kiasi (KSh)" : "Amount"}</span>
        </div>

        <div className="mt-3 grid gap-2.5">
          {filteredEntries.map((e) => {
            const isIn = e.kind === "in";
            return (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-2xl border border-border p-3.5 bg-muted/10 transition hover:bg-muted/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        isIn
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {categoryLabels[e.category] || e.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDay(e.occurred_on, lang)}
                    </span>
                  </div>

                  <p className="font-display text-sm font-bold text-foreground">{e.description}</p>

                  <p className="text-[11px] text-muted-foreground">
                    {lang === "sw" ? "Msimamizi: " : "Audited by: "}
                    <span className="font-medium text-foreground">{e.recordedByName}</span>
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-display text-base font-black ${
                      isIn
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {isIn ? "+" : "-"}
                    {ksh(e.amount)}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {isIn ? "Inflow" : "Outflow"}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === "sw"
                ? "Hakuna muamala unaolingana na vigezo vilivyochaguliwa."
                : "No ledger transactions found matching filters."}
            </p>
          ) : null}
        </div>
      </div>

      {/* Record Miscellaneous Transaction Modal for Officials */}
      {showExpenseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Usimamizi wa Kitabu" : "Treasury Entry"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {lang === "sw" ? "Rekodi Muamala wa Chama" : "Record Chama Transaction"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordExpenseMutation.mutate();
              }}
              className="mt-4 grid gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Aina ya Muamala" : "Transaction Flow"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpenseForm({ ...expenseForm, kind: "out", category: "gharama" })
                    }
                    className={`rounded-xl py-2.5 text-xs font-bold transition ${
                      expenseForm.kind === "out"
                        ? "bg-amber-700 text-white shadow-sm"
                        : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    - {lang === "sw" ? "Gharama / Matumizi (Out)" : "Expense (Outflow)"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExpenseForm({ ...expenseForm, kind: "in", category: "adhabu" })
                    }
                    className={`rounded-xl py-2.5 text-xs font-bold transition ${
                      expenseForm.kind === "in"
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    + {lang === "sw" ? "Mapato / Faini (In)" : "Income / Fine (Inflow)"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Kiasi (KSh) *" : "Amount (KSh) *"}
                </label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  min={1}
                  required
                  placeholder="500"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Kitengo cha Fedha" : "Category"}
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value as any })
                  }
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <option value="gharama">Gharama za chama (Stationery, Ukumbi, n.k)</option>
                  <option value="adhabu">Adhabu / Faini ya kuchelewa</option>
                  <option value="faida">Faida / Gawio</option>
                  <option value="mengineyo">Mengineyo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Maelezo ya Muamala *" : "Description / Purpose *"}
                </label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  placeholder="Mfano: Kununua kitabu cha risiti na kalamu"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Tarehe" : "Date"}
                </label>
                <input
                  type="date"
                  value={expenseForm.occurredOn}
                  onChange={(e) => setExpenseForm({ ...expenseForm, occurredOn: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm"
                />
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={
                    recordExpenseMutation.isPending ||
                    !expenseForm.amount ||
                    !expenseForm.description
                  }
                  className="flex-1 rounded-2xl bg-brand py-3 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {recordExpenseMutation.isPending
                    ? "Inarekodi..."
                    : lang === "sw"
                      ? "Hifadhi Kwenye Kitabu"
                      : "Save to Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
