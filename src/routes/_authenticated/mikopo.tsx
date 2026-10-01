import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import {
  decideLoan,
  getLoans,
  getMerryGoRound,
  initializeMerryGoRound,
  markMerryGoRoundPayout,
  recordRepayment,
  requestLoan,
} from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mikopo")({
  head: () => ({
    meta: [
      { title: "Mikopo & Merry-Go-Round — ChamaMkononi" },
      {
        name: "description",
        content: "Omba mkopo, fanya marejesho, na uone mzunguko wa Merry-Go-Round wa chama chako.",
      },
      { property: "og:title", content: "Mikopo & Merry-Go-Round — ChamaMkononi" },
      {
        property: "og:description",
        content: "Omba mkopo, fanya marejesho, na uone mzunguko wa Merry-Go-Round wa chama chako.",
      },
    ],
  }),
  component: LoansAndMerryGoRound,
});

interface LoanRow {
  id: string;
  member_id: string;
  amount: number;
  principal: number;
  interestPct: number;
  interestAmount: number;
  totalDue: number;
  paid: number;
  remaining: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "repaid";
  due_date: string | null;
  requested_at: string;
  guarantor_id?: string | null;
  guarantorName?: string | null;
  duration_months?: number;
  mine: boolean;
  chama_members?: { display_name: string };
  repayments?: {
    amount: number;
    paid_on: string;
    method?: string;
    mpesa_reference?: string | null;
  }[];
}

interface MemberOption {
  id: string;
  display_name: string;
  phone: string | null;
  role: string;
}

function LoansAndMerryGoRound() {
  const loansFn = useServerFn(getLoans);
  const merryFn = useServerFn(getMerryGoRound);
  const requestFn = useServerFn(requestLoan);
  const decideFn = useServerFn(decideLoan);
  const repayFn = useServerFn(recordRepayment);
  const payoutMerryFn = useServerFn(markMerryGoRoundPayout);
  const initMerryFn = useServerFn(initializeMerryGoRound);

  const qc = useQueryClient();
  const { t, lang } = useLang();

  const [activeTab, setActiveTab] = useState<"loans" | "merry_go_round">("loans");

  // Query Data
  const { data: loanData, isLoading: loansLoading } = useChamaQuery(["loans"], () => loansFn());
  const { data: merryData, isLoading: merryLoading } = useChamaQuery(["merry_go_round"], () =>
    merryFn(),
  );

  // Loan Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState<number | string>(5000);
  const [loanReason, setLoanReason] = useState("");
  const [guarantorId, setGuarantorId] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [interestRate, setInterestRate] = useState(10);

  // Repayment Modal State
  const [repayModalLoan, setRepayModalLoan] = useState<LoanRow | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | string>("");
  const [repayMethod, setRepayMethod] = useState<"mpesa" | "cash" | "bank">("mpesa");
  const [repayMpesaRef, setRepayMpesaRef] = useState("");

  const isOfficial = ["chairperson", "treasurer", "secretary"].includes(
    loanData?.member?.role || "",
  );
  const membersList = (loanData?.members ?? []) as MemberOption[];
  const allLoans = (loanData?.loans ?? []) as LoanRow[];

  // Loan Calculations
  const calculatedPrincipal = Number(loanAmount) || 0;
  const calculatedInterest = Math.round((calculatedPrincipal * interestRate) / 100);
  const calculatedTotalPayable = calculatedPrincipal + calculatedInterest;

  const submitLoan = useMutation({
    mutationFn: () =>
      requestFn({
        data: {
          amount: Number(loanAmount),
          reason: loanReason.trim() || undefined,
          guarantorId: guarantorId || undefined,
          durationMonths: Number(durationMonths),
          interestRate: Number(interestRate),
        },
      }),
    onSuccess: () => {
      toast.success(
        lang === "sw"
          ? "Ombi la mkopo limewasilishwa kwa uongozi wa chama!"
          : "Loan request submitted to chama officials!",
      );
      setShowRequestModal(false);
      setLoanReason("");
      setGuarantorId("");
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuomba mkopo.");
    },
  });

  const handleDecision = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      decideFn({ data: { id, approve } }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.approve
          ? lang === "sw"
            ? "Mkopo umeidhinishwa na kurekodiwa kitabuni!"
            : "Loan approved and recorded in ledger!"
          : lang === "sw"
            ? "Ombi la mkopo limekataliwa."
            : "Loan request rejected.",
      );
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kutekeleza uamuzi.");
    },
  });

  const handleRepayment = useMutation({
    mutationFn: () => {
      if (!repayModalLoan) throw new Error("No loan selected");
      const val = Number(repayAmount);
      if (!val || val <= 0)
        throw new Error(lang === "sw" ? "Weka kiasi sahihi." : "Enter valid amount.");

      return repayFn({
        data: {
          loanId: repayModalLoan.id,
          amount: val,
          method: repayMethod,
          mpesaReference: repayMpesaRef.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.isFullyRepaid
          ? lang === "sw"
            ? "Hongera! Mkopo umerejeshwa kikamilifu!"
            : "Congratulations! Loan is fully repaid!"
          : lang === "sw"
            ? "Marejesho yamerekodiwa kwenye kitabu cha fedha."
            : "Repayment recorded in ledger.",
      );
      setRepayModalLoan(null);
      setRepayAmount("");
      setRepayMpesaRef("");
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kurekodi marejesho.");
    },
  });

  const handleMerryPayout = useMutation({
    mutationFn: (slotId: string) => payoutMerryFn({ data: { slotId } }),
    onSuccess: (res) => {
      toast.success(
        lang === "sw"
          ? `Malipo ya ${ksh(res.amount)} kwa ${res.recipient} yamethibitishwa!`
          : `Payout of ${ksh(res.amount)} to ${res.recipient} confirmed!`,
      );
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kurekodi malipo.");
    },
  });

  const handleInitMerry = useMutation({
    mutationFn: () => initMerryFn({ data: { cycleNumber: 1 } }),
    onSuccess: (res) => {
      toast.success(
        lang === "sw"
          ? `Mzunguko mpya wa wanachama ${res.count} umeundwa!`
          : `New rotation cycle generated for ${res.count} members!`,
      );
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuanzisha mzunguko.");
    },
  });

  function shareMerryWhatsApp() {
    const slots = merryData?.slots || [];
    const pot = merryData?.potAmount || 0;
    const items = slots
      .map(
        (s: any) =>
          `${s.rotation_order}. ${s.displayName} (${s.payout_month}) — ${
            s.status === "paid" ? "✅ IMELIPWA" : "⏳ INASUBIRI"
          }`,
      )
      .join("\n");

    const message =
      lang === "sw"
        ? `🔄 *RATIBA YA MERRY-GO-ROUND — ${merryData?.chama?.name || "Chama"}*\n` +
          `💰 *Kiasi cha Mzunguko (Pot):* ${ksh(pot)}\n\n` +
          `*Mfuatano wa Malipo:*\n${items}\n\n` +
          `_Imetolewa kupitia ChamaMkononi._`
        : `🔄 *MERRY-GO-ROUND SCHEDULE — ${merryData?.chama?.name || "Chama"}*\n` +
          `💰 *Pot Total:* ${ksh(pot)}\n\n` +
          `*Rotation Order:*\n${items}\n\n` +
          `_Issued via ChamaMkononi._`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function shareLoanReminderWhatsApp(loan: LoanRow) {
    const borrower = loan.chama_members?.display_name || "Mwanachama";
    const text =
      lang === "sw"
        ? `Habari ${borrower}, kumbukumbu ya mkopo wako wa ${ksh(loan.principal)} kutoka kwa chama. Salio lililobaki kurejeshwa ni ${ksh(loan.remaining)}. Tarehe ya mwisho: ${loan.due_date || "Mwezi huu"}. Asante!`
        : `Hello ${borrower}, friendly reminder regarding your loan of ${ksh(loan.principal)} from chama. Remaining balance is ${ksh(loan.remaining)}. Due date: ${loan.due_date || "This month"}. Thank you!`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  const pendingLoans = allLoans.filter((l) => l.status === "pending");
  const activeLoans = allLoans.filter((l) => l.status === "approved");

  return (
    <Screen>
      <PageHeader title={t("loans")} subtitle="Mikopo & Mzunguko wa Pesa" />

      {/* Main Tab Navigation */}
      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold transition ${
            activeTab === "loans"
              ? "bg-brand text-cream shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>🤝</span>
          <span>{lang === "sw" ? "Mikopo ya Chama" : "Chama Loans"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("merry_go_round")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold transition ${
            activeTab === "merry_go_round"
              ? "bg-brand text-cream shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>🔄</span>
          <span>Merry-Go-Round</span>
        </button>
      </div>

      {activeTab === "loans" ? (
        <div className="mt-5 space-y-6">
          {/* Action Header Card */}
          <div className="rounded-3xl border-2 border-brand/20 bg-brand/5 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {lang === "sw" ? "Akiba & Mikopo" : "Table Banking"}
              </p>
              <h2 className="font-display text-xl font-extrabold text-foreground">
                {lang === "sw" ? "Unahitaji Mkopo?" : "Need a Loan?"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lang === "sw"
                  ? "Riba nafuu ya 10% · Muda wa mwezi 1 hadi 6"
                  : "10% interest rate · 1-6 months"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="rounded-2xl bg-brand px-4 py-3 font-display text-xs font-extrabold text-cream shadow-md transition hover:opacity-95"
            >
              {lang === "sw" ? "+ OMBA MKOPO" : "+ APPLY LOAN"}
            </button>
          </div>

          {/* Pending Loans Approval Queue for Officials */}
          {isOfficial && pendingLoans.length > 0 ? (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse"></span>
                  <p className="font-display text-base font-extrabold text-foreground">
                    {lang === "sw" ? "Maombi ya Mikopo Yanayosubiri" : "Pending Loan Requests"}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {pendingLoans.length}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {pendingLoans.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-base font-bold text-foreground">
                          {l.chama_members?.display_name || "Mwanachama"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lang === "sw" ? "Sababu: " : "Purpose: "}
                          <span className="text-foreground font-medium">
                            {l.reason || "Mahitaji ya binafsi"}
                          </span>
                        </p>
                        {l.guarantorName ? (
                          <p className="mt-1 text-xs text-brand font-semibold">
                            🛡 Mdhamini: {l.guarantorName}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="font-display text-lg font-extrabold text-foreground">
                          {ksh(l.principal)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          +{ksh(l.interestAmount)} riba ({l.interestPct}%)
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={handleDecision.isPending}
                        onClick={() => handleDecision.mutate({ id: l.id, approve: true })}
                        className="flex-1 rounded-xl bg-brand py-2 text-xs font-bold text-cream shadow-sm hover:opacity-90 disabled:opacity-50"
                      >
                        {lang === "sw" ? "Idhinisha (Toa Mkopo)" : "Approve & Disburse"}
                      </button>
                      <button
                        type="button"
                        disabled={handleDecision.isPending}
                        onClick={() => handleDecision.mutate({ id: l.id, approve: false })}
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

          {/* Active Loans & Progress */}
          <div className="rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Mikopo Inayoendelea" : "Active Loans"}
              </p>
              <span className="text-xs text-muted-foreground">
                {activeLoans.length} {lang === "sw" ? "mikopo" : "active"}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {activeLoans.map((l) => {
                const pct = Math.min(100, Math.round((l.paid / (l.totalDue || 1)) * 100));
                return (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-border p-4 bg-muted/10 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base font-bold text-foreground">
                            {l.chama_members?.display_name || "Mwanachama"}
                          </p>
                          {l.mine ? (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                              {lang === "sw" ? "Wako" : "Yours"}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {l.reason || "Mahitaji ya binafsi"} • Tarehe: {l.due_date || "Mwezi huu"}
                        </p>
                        {l.guarantorName ? (
                          <p className="text-xs text-muted-foreground">
                            🛡 Mdhamini: {l.guarantorName}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="font-display text-base font-extrabold text-foreground">
                          Baki: {ksh(l.remaining)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Jumla ya kulipa: {ksh(l.totalDue)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-1">
                        <span>{lang === "sw" ? `Kurejesha: ${pct}%` : `Repaid: ${pct}%`}</span>
                        <span>
                          {ksh(l.paid)} / {ksh(l.totalDue)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Official & Member Action Buttons */}
                    <div className="flex gap-2 pt-1 border-t border-border">
                      {isOfficial ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRepayModalLoan(l);
                            setRepayAmount(Math.min(l.remaining, 1000));
                          }}
                          className="flex-1 rounded-xl bg-brand py-2 text-xs font-bold text-cream shadow-sm hover:opacity-90"
                        >
                          {lang === "sw" ? "Rekodi Marejesho" : "Record Repayment"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => shareLoanReminderWhatsApp(l)}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeLoans.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {lang === "sw"
                    ? "Hakuna mkopo unaoendelea kurejeshwa kwa sasa."
                    : "No active loans currently outstanding."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* Merry-Go-Round Rotation Tab */
        <div className="mt-5 space-y-6">
          {/* Pot Card */}
          <div className="rounded-3xl border-2 border-brand/20 bg-brand/10 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Mfuko wa Mwezi Huu (Table Pot)" : "Monthly Pot"}
                </p>
                <p className="mt-1 font-display text-4xl font-black text-foreground">
                  {ksh(merryData?.potAmount ?? 0)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={shareMerryWhatsApp}
                  className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
                >
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Kila mwanachama anapokea kiasi hiki cha mkupuo kulingana na mfuatano uliopangwa."
                : "Each member receives this lump-sum payout in their designated month."}
            </p>

            {isOfficial && (merryData?.slots ?? []).length === 0 ? (
              <button
                type="button"
                disabled={handleInitMerry.isPending}
                onClick={() => handleInitMerry.mutate()}
                className="mt-4 w-full rounded-2xl bg-brand py-3 text-xs font-bold text-cream shadow-md"
              >
                {handleInitMerry.isPending
                  ? "Inatengeneza ratiba..."
                  : lang === "sw"
                    ? "ANZISHA MZUNGUKO MPYA WA WANACHAMA"
                    : "INITIALIZE ROTATION SCHEDULE"}
              </button>
            ) : null}
          </div>

          {/* Rotation Schedule List */}
          <div className="rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Mfuatano wa Kupokea Pesa" : "Rotation Payout Schedule"}
              </p>
              <span className="text-xs text-muted-foreground">
                {(merryData?.slots ?? []).length} {lang === "sw" ? "zamani" : "slots"}
              </span>
            </div>

            <div className="mt-4 grid gap-2.5">
              {(merryData?.slots ?? []).map((slot: any) => {
                const isPaid = slot.status === "paid";
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                      isPaid
                        ? "border-emerald-500/20 bg-emerald-500/5 opacity-80"
                        : "border-border bg-card shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted font-display text-sm font-extrabold text-foreground">
                        {slot.rotation_order}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base font-bold text-foreground">
                            {slot.displayName}
                          </p>
                          {slot.isMe ? (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                              {lang === "sw" ? "Wewe" : "You"}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {lang === "sw" ? "Mwezi: " : "Payout Month: "}
                          <span className="font-bold text-foreground">{slot.payout_month}</span>
                          {slot.phone ? ` • 📞 ${slot.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-display text-base font-extrabold text-foreground">
                          {ksh(slot.payout_amount)}
                        </p>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            ✓ {lang === "sw" ? "Imelipwa" : "Paid"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600">
                            ⏳ {lang === "sw" ? "Inasubiri" : "Pending"}
                          </span>
                        )}
                      </div>

                      {isOfficial && !isPaid ? (
                        <button
                          type="button"
                          disabled={handleMerryPayout.isPending}
                          onClick={() => handleMerryPayout.mutate(slot.id)}
                          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-cream hover:opacity-90 disabled:opacity-50"
                        >
                          {lang === "sw" ? "Thibitisha" : "Pay"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {(merryData?.slots ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {lang === "sw"
                    ? "Bado hakuna ratiba ya Merry-Go-Round iliyowekwa."
                    : "No Merry-Go-Round schedule created yet."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Loan Request Modal */}
      {showRequestModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Maombi ya Mkopo" : "Loan Application"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {lang === "sw" ? "Omba Mkopo wa Chama" : "Apply for Chama Loan"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLoan.mutate();
              }}
              className="mt-5 grid gap-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Kiasi cha Mkopo (KSh) *" : "Loan Principal Amount (KSh) *"}
                </label>
                <input
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  type="number"
                  min={500}
                  step={500}
                  required
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Muda (Miezi)" : "Duration (Months)"}
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full rounded-2xl border border-border bg-card px-3.5 py-3 text-sm font-bold"
                  >
                    <option value={1}>Mwezi 1 (1 mo)</option>
                    <option value={2}>Miezi 2 (2 mos)</option>
                    <option value={3}>Miezi 3 (3 mos)</option>
                    <option value={6}>Miezi 6 (6 mos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Kiwango cha Riba" : "Interest Rate"}
                  </label>
                  <input
                    value={`${interestRate}%`}
                    disabled
                    className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-3 text-sm font-bold text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Chagua Mdhamini (Guarantor)" : "Select Guarantor"}
                </label>
                <select
                  value={guarantorId}
                  onChange={(e) => setGuarantorId(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="">
                    {lang === "sw" ? "— Chagua mwanachama mdhamini —" : "— Select guarantor —"}
                  </option>
                  {membersList
                    .filter((m) => m.id !== loanData?.member?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Kusudi la Mkopo (Sababu)" : "Loan Purpose / Reason"}
                </label>
                <input
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  placeholder={
                    lang === "sw"
                      ? "Mfano: Karo ya shule, mtaji wa mboga..."
                      : "e.g. School fees, business..."
                  }
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                />
              </div>

              {/* Summary Calculation Box */}
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {lang === "sw" ? "Kiasi cha Mkopo:" : "Principal:"}
                  </span>
                  <span className="font-bold text-foreground">{ksh(calculatedPrincipal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {lang === "sw" ? "Riba (10%):" : "Interest (10%):"}
                  </span>
                  <span className="font-bold text-foreground">{ksh(calculatedInterest)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-extrabold text-foreground">
                  <span>{lang === "sw" ? "Jumla ya Kurejesha:" : "Total Repayable:"}</span>
                  <span className="font-display text-base text-brand">
                    {ksh(calculatedTotalPayable)}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 rounded-2xl border border-border py-3.5 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitLoan.isPending || calculatedPrincipal <= 0}
                  className="flex-1 rounded-2xl bg-brand py-3.5 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {submitLoan.isPending
                    ? "Inatuma..."
                    : lang === "sw"
                      ? "Wasilisha Ombi"
                      : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Repayment Modal for Officials */}
      {repayModalLoan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Ulipaji wa Mkopo" : "Loan Repayment"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {repayModalLoan.chama_members?.display_name || "Mwanachama"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRepayModalLoan(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw" ? "Salio lililobaki: " : "Remaining balance: "}
              <strong className="text-foreground">{ksh(repayModalLoan.remaining)}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRepayment.mutate();
              }}
              className="mt-4 grid gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Kiasi cha Marejesho (KSh) *" : "Repayment Amount (KSh) *"}
                </label>
                <input
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  type="number"
                  min={50}
                  required
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Njia ya Malipo" : "Payment Method"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["mpesa", "cash", "bank"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRepayMethod(m)}
                      className={`rounded-xl py-2 text-xs font-bold capitalize transition ${
                        repayMethod === m ? "bg-brand text-cream" : "border border-border bg-card"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {repayMethod === "mpesa" ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Nambari ya M-Pesa (Code)" : "M-Pesa Code"}
                  </label>
                  <input
                    value={repayMpesaRef}
                    onChange={(e) => setRepayMpesaRef(e.target.value.toUpperCase())}
                    placeholder="SH71QW89KL"
                    maxLength={12}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-sm uppercase"
                  />
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRepayModalLoan(null)}
                  className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={handleRepayment.isPending || !repayAmount}
                  className="flex-1 rounded-2xl bg-brand py-3 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {handleRepayment.isPending
                    ? "Inarekodi..."
                    : lang === "sw"
                      ? "Hifadhi Marejesho"
                      : "Save Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
