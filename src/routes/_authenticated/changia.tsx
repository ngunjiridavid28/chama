import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { confirmContribution, getContributions, recordContribution } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/changia")({
  head: () => ({
    meta: [
      { title: "Changia — ChamaMkononi" },
      {
        name: "description",
        content: "Lipa mchango wako wa mwezi, weka nambari ya M-Pesa na pata risiti.",
      },
      { property: "og:title", content: "Changia — ChamaMkononi" },
      {
        property: "og:description",
        content: "Lipa mchango wako wa mwezi, weka nambari ya M-Pesa na pata risiti.",
      },
    ],
  }),
  component: Contribute,
});

interface ContributionRow {
  id: string;
  amount: number;
  period: string;
  status: "pending" | "confirmed" | "rejected";
  method: string;
  paid_on: string;
  member_id: string;
  mpesa_reference?: string | null;
  phone_number?: string | null;
  confirmed_by?: string | null;
  chama_members?: { display_name: string };
}

function Contribute() {
  const fetchFn = useServerFn(getContributions);
  const recordFn = useServerFn(recordContribution);
  const confirmFn = useServerFn(confirmContribution);
  const qc = useQueryClient();
  const { t, lang } = useLang();
  const { data, isLoading } = useChamaQuery(["contributions"], () => fetchFn());

  const [amount, setAmount] = useState<number | string>("");
  const [method, setMethod] = useState<"mpesa" | "cash" | "bank">("mpesa");
  const [mpesaRef, setMpesaRef] = useState("");
  const [phone, setPhone] = useState("");
  const [targetMemberId, setTargetMemberId] = useState<string>("");

  // Receipt modal state
  const [receiptRecord, setReceiptRecord] = useState<ContributionRow | null>(null);

  const isOfficial = ["chairperson", "treasurer", "secretary"].includes(data?.member?.role || "");
  const monthly = data?.monthly ?? 1000;
  const quickAmounts = [monthly, 500, 1000, 2000, 5000];

  const record = useMutation({
    mutationFn: () => {
      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0) {
        throw new Error(lang === "sw" ? "Weka kiasi sahihi." : "Enter a valid amount.");
      }
      if (method === "mpesa" && mpesaRef.trim()) {
        const cleaned = mpesaRef.trim().toUpperCase();
        if (cleaned.length < 8) {
          throw new Error(
            lang === "sw"
              ? "Nambari ya M-Pesa lazima iwe na angalau herufi au nambari 8."
              : "M-Pesa reference must be at least 8 characters.",
          );
        }
      }

      return recordFn({
        data: {
          amount: numericAmount,
          method,
          mpesaReference: mpesaRef.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
          memberId: targetMemberId ? targetMemberId : undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.status === "confirmed"
          ? lang === "sw"
            ? "Mchango umethibitishwa na kuingizwa kwenye kitabu cha fedha!"
            : "Contribution confirmed and recorded in ledger!"
          : lang === "sw"
            ? "Asante! Taarifa zimewasilishwa na zinasubiri uthibitisho wa mweka hazina."
            : "Submitted! Awaiting treasurer confirmation.",
      );

      // Auto-open receipt if confirmed
      if (res.status === "confirmed") {
        setReceiptRecord({
          id: res.id,
          amount: res.amount,
          period: res.period,
          status: "confirmed",
          method,
          paid_on: new Date().toISOString(),
          member_id: targetMemberId || data?.member?.id || "",
          mpesa_reference: res.ref,
          chama_members: { display_name: res.memberName },
        });
      }

      setAmount("");
      setMpesaRef("");
      setPhone("");
      setTargetMemberId("");
      qc.invalidateQueries();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate_mpesa_reference")) {
        toast.error(
          lang === "sw"
            ? `Nambari ya M-Pesa "${mpesaRef.toUpperCase()}" ilishawahi kurekodiwa awali.`
            : `M-Pesa reference "${mpesaRef.toUpperCase()}" has already been used.`,
        );
      } else {
        toast.error(err instanceof Error ? err.message : "Imeshindikana kurekodi mchango.");
      }
    },
  });

  const handleConfirmAction = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      confirmFn({ data: { id, accept } }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.accept
          ? lang === "sw"
            ? "Mchango umethibitishwa kikamilifu!"
            : "Contribution confirmed!"
          : lang === "sw"
            ? "Mchango umekataliwa."
            : "Contribution rejected.",
      );
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuthibitisha.");
    },
  });

  function shareReceiptWhatsApp(r: ContributionRow) {
    const memberName = r.chama_members?.display_name || data?.member?.name || "Mwanachama";
    const refCode = r.mpesa_reference
      ? `M-Pesa Ref: ${r.mpesa_reference}`
      : `Njia: ${r.method.toUpperCase()}`;
    const text =
      lang === "sw"
        ? `🧾 *RISITI YA CHAMA — ${data?.chama?.name || "ChamaMkononi"}*\n\n` +
          `👤 *Mwanachama:* ${memberName}\n` +
          `💰 *Kiasi:* ${ksh(r.amount)}\n` +
          `📅 *Mwezi:* ${r.period}\n` +
          `🔖 *Kumbukumbu:* ${refCode}\n` +
          `🗓 *Tarehe:* ${formatDay(r.paid_on, lang)}\n` +
          `✅ *Hali:* IMETHIBITISHWA NA MWEKA HAZINA\n\n` +
          `_Imetolewa kupitia ChamaMkononi._`
        : `🧾 *CHAMA RECEIPT — ${data?.chama?.name || "ChamaMkononi"}*\n\n` +
          `👤 *Member:* ${memberName}\n` +
          `💰 *Amount:* ${ksh(r.amount)}\n` +
          `📅 *Period:* ${r.period}\n` +
          `🔖 *Reference:* ${refCode}\n` +
          `🗓 *Date:* ${formatDay(r.paid_on, lang)}\n` +
          `✅ *Status:* CONFIRMED BY TREASURER\n\n` +
          `_Issued via ChamaMkononi._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function copyReceiptText(r: ContributionRow) {
    const memberName = r.chama_members?.display_name || data?.member?.name || "Mwanachama";
    const refCode = r.mpesa_reference
      ? `M-Pesa Ref: ${r.mpesa_reference}`
      : `Njia: ${r.method.toUpperCase()}`;
    const text =
      `RISITI YA CHAMA: ${data?.chama?.name || "ChamaMkononi"}\n` +
      `Mwanachama: ${memberName}\n` +
      `Kiasi: ${ksh(r.amount)}\n` +
      `Mwezi: ${r.period}\n` +
      `Kumbukumbu: ${refCode}\n` +
      `Tarehe: ${formatDay(r.paid_on, lang)}\n` +
      `Hali: IMETHIBITISHWA`;
    navigator.clipboard.writeText(text);
    toast.success(lang === "sw" ? "Risiti imenakiliwa!" : "Receipt copied!");
  }

  return (
    <Screen>
      <PageHeader title={t("contribute")} subtitle={data?.chama?.name || "Chama"} />

      {/* Pending Verification Queue for Officials */}
      {isOfficial && (data?.pendingQueue ?? []).length > 0 ? (
        <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse"></span>
              <p className="font-display text-base font-extrabold text-foreground">
                {lang === "sw" ? "Michango Inayosubiri Uthibitisho" : "Pending Contributions Queue"}
              </p>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {(data?.pendingQueue ?? []).length}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {(data?.pendingQueue ?? []).map((p: ContributionRow) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-base font-bold text-foreground">
                      {p.chama_members?.display_name || "Mwanachama"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.period} •{" "}
                      {p.method === "cash"
                        ? "Pesa Mkononi"
                        : p.method === "bank"
                          ? "Benki"
                          : "M-Pesa"}
                    </p>
                    {p.mpesa_reference ? (
                      <p className="mt-1 font-mono text-xs font-bold text-brand">
                        Ref: {p.mpesa_reference}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-display text-lg font-extrabold text-foreground">
                    {ksh(p.amount)}
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={handleConfirmAction.isPending}
                    onClick={() => handleConfirmAction.mutate({ id: p.id, accept: true })}
                    className="flex-1 rounded-xl bg-brand py-2 text-xs font-bold text-cream shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {lang === "sw" ? "Thibitisha (Weka Kitabuni)" : "Confirm & Ledger"}
                  </button>
                  <button
                    type="button"
                    disabled={handleConfirmAction.isPending}
                    onClick={() => handleConfirmAction.mutate({ id: p.id, accept: false })}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {lang === "sw" ? "Kataa" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Contribution Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          record.mutate();
        }}
        className="mt-6 rounded-3xl border border-card/80 bg-card p-5 shadow-sm"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {lang === "sw" ? "Rekodi Malipo Mapya" : "Record New Payment"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-foreground">
          {lang === "sw" ? "Lipa Mchango" : "Make Contribution"}
        </h2>

        {/* Official: Select Member to Record For */}
        {isOfficial && (data?.members ?? []).length > 0 ? (
          <div className="mt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {lang === "sw" ? "Lipa kwa niaba ya nani? (Hiari)" : "Record for Member (Optional)"}
            </label>
            <select
              value={targetMemberId}
              onChange={(e) => setTargetMemberId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-base"
            >
              <option value="">{lang === "sw" ? "Mimi mwenyewe (Self)" : "Myself (Self)"}</option>
              {(data?.members ?? []).map(
                (m: { id: string; display_name: string; role: string }) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.role})
                  </option>
                ),
              )}
            </select>
          </div>
        ) : null}

        {/* Quick Amount Buttons */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {lang === "sw" ? "Kiasi (KSh) *" : "Amount (KSh) *"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Array.from(new Set(quickAmounts))
              .slice(0, 3)
              .map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`rounded-2xl border py-3 font-display text-base font-extrabold transition ${
                    Number(amount) === v
                      ? "border-brand bg-brand text-cream"
                      : "border-border bg-background text-foreground hover:bg-muted/40"
                  }`}
                >
                  {ksh(v)}
                </button>
              ))}
          </div>

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={10}
            step={50}
            required
            placeholder={lang === "sw" ? "Weka kiasi kingine..." : "Or enter custom amount..."}
            className="mt-2.5 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-lg font-bold"
          />
        </div>

        {/* Payment Method Selector */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {lang === "sw" ? "Njia ya Malipo *" : "Payment Method *"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMethod("mpesa")}
              className={`flex flex-col items-center rounded-2xl border p-3 font-display text-sm font-bold transition ${
                method === "mpesa"
                  ? "border-[#25D366] bg-[#25D366]/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-lg">📱</span>
              <span>M-Pesa</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod("cash")}
              className={`flex flex-col items-center rounded-2xl border p-3 font-display text-sm font-bold transition ${
                method === "cash"
                  ? "border-amber-500 bg-amber-500/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-lg">💵</span>
              <span>{lang === "sw" ? "Taslimu" : "Cash"}</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod("bank")}
              className={`flex flex-col items-center rounded-2xl border p-3 font-display text-sm font-bold transition ${
                method === "bank"
                  ? "border-blue-500 bg-blue-500/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-lg">🏦</span>
              <span>{lang === "sw" ? "Benki" : "Bank"}</span>
            </button>
          </div>
        </div>

        {/* M-Pesa Reference Details */}
        {method === "mpesa" ? (
          <div className="mt-4 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-3.5 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                {lang === "sw"
                  ? "Nambari ya Kumbukumbu ya M-Pesa (SMS Code)"
                  : "M-Pesa Reference Code"}
              </label>
              <input
                value={mpesaRef}
                onChange={(e) => setMpesaRef(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="Mfano: SH71QW89KL"
                maxLength={12}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-base font-bold uppercase tracking-widest text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "sw"
                  ? "Weka herufi 10 ulizotumiwa na Safaricom M-Pesa ili kuzuia malipo kurudiwa."
                  : "Enter the standard 10-character code from your Safaricom confirmation SMS."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                {lang === "sw"
                  ? "Nambari ya Simu ya Aliyetuma (Hiari)"
                  : "Sender Phone Number (Optional)"}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="0722 000 000"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={record.isPending || !amount || Number(amount) <= 0}
          className="mt-5 w-full rounded-2xl bg-brand py-4 font-display text-lg font-extrabold text-cream shadow-md transition hover:opacity-95 disabled:opacity-50"
        >
          {record.isPending
            ? "Inarekodi mchango..."
            : isOfficial
              ? lang === "sw"
                ? `REKODI NA THIBITISHA ${ksh(Number(amount) || 0)}`
                : `RECORD & CONFIRM ${ksh(Number(amount) || 0)}`
              : lang === "sw"
                ? `WASILISHA MCHANGO WA ${ksh(Number(amount) || 0)}`
                : `SUBMIT CONTRIBUTION ${ksh(Number(amount) || 0)}`}
        </button>
      </form>

      {/* History of Contributions with Tap for Receipt */}
      <div className="mt-6 rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold text-foreground">
            {lang === "sw" ? "Historia ya Michango Yangu" : "My Contribution History"}
          </p>
          <span className="text-xs text-muted-foreground">
            {(data?.mine ?? []).length} {lang === "sw" ? "rekodi" : "records"}
          </span>
        </div>

        <div className="mt-3 grid gap-2.5">
          {(data?.mine ?? []).slice(0, 10).map((c: ContributionRow) => (
            <div
              key={c.id}
              onClick={() => c.status === "confirmed" && setReceiptRecord(c)}
              className={`flex items-center justify-between rounded-2xl border border-border p-4 transition ${
                c.status === "confirmed"
                  ? "bg-muted/20 hover:border-brand/40 cursor-pointer"
                  : "bg-muted/10 opacity-80"
              }`}
            >
              <div>
                <p className="font-display text-base font-bold text-foreground">
                  {c.period} •{" "}
                  {c.method === "cash" ? "Pesa Taslimu" : c.method === "bank" ? "Benki" : "M-Pesa"}
                </p>
                {c.mpesa_reference ? (
                  <p className="font-mono text-xs font-semibold text-brand">
                    Ref: {c.mpesa_reference}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{formatDay(c.paid_on, lang)}</p>
              </div>

              <div className="text-right">
                <p className="font-display text-lg font-extrabold text-foreground">
                  {ksh(c.amount)}
                </p>
                {c.status === "confirmed" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <span>✓</span> {lang === "sw" ? "Risiti ipo" : "Receipt"}
                  </span>
                ) : c.status === "pending" ? (
                  <span className="text-xs font-bold text-amber-600">
                    ⏳ {lang === "sw" ? "Inasubiri" : "Pending"}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-destructive">
                    ✕ {lang === "sw" ? "Imekataliwa" : "Rejected"}
                  </span>
                )}
              </div>
            </div>
          ))}

          {(data?.mine ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {lang === "sw" ? "Bado hujarekodi mchango wowote." : "No contributions recorded yet."}
            </p>
          ) : null}
        </div>
      </div>

      {/* Digital Receipt Modal */}
      {receiptRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-border">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-cream font-display font-black text-lg shadow-sm">
                CM
              </div>
              <h3 className="mt-3 font-display text-xl font-extrabold text-foreground">
                {data?.chama?.name || "Chama Mkononi"}
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "sw" ? "Risiti Rasmi ya Malipo" : "Official Payment Receipt"}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {lang === "sw" ? "Mwanachama:" : "Member:"}
                </span>
                <span className="font-bold text-foreground">
                  {receiptRecord.chama_members?.display_name || data?.member?.name || "Mwanachama"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {lang === "sw" ? "Kiasi Kilicholipwa:" : "Amount Paid:"}
                </span>
                <span className="font-display text-base font-extrabold text-foreground">
                  {ksh(receiptRecord.amount)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {lang === "sw" ? "Mwezi / Kipindi:" : "Period:"}
                </span>
                <span className="font-bold text-foreground">{receiptRecord.period}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {lang === "sw" ? "Njia ya Malipo:" : "Method:"}
                </span>
                <span className="font-bold uppercase text-foreground">{receiptRecord.method}</span>
              </div>

              {receiptRecord.mpesa_reference ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">M-Pesa Code:</span>
                  <span className="font-mono font-bold text-brand">
                    {receiptRecord.mpesa_reference}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === "sw" ? "Tarehe:" : "Date:"}</span>
                <span className="text-foreground">{formatDay(receiptRecord.paid_on, lang)}</span>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="text-muted-foreground">{lang === "sw" ? "Hali:" : "Status:"}</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700">
                  ✓ IMETHIBITISHWA
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => shareReceiptWhatsApp(receiptRecord)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-1.002z" />
                </svg>
                <span>
                  {lang === "sw" ? "Tuma Risiti kwa WhatsApp" : "Share Receipt via WhatsApp"}
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyReceiptText(receiptRecord)}
                  className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-foreground hover:bg-muted"
                >
                  {lang === "sw" ? "Nakili Maandishi" : "Copy Text"}
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptRecord(null)}
                  className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  {lang === "sw" ? "Funga" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
