import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { ConfirmSheet } from "@/components/chama/ConfirmSheet";
import { decideLoan, getLoans, recordRepayment, requestLoan } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mikopo")({
  head: () => ({
    meta: [
      { title: "Mikopo — ChamaMkononi" },
      { name: "description", content: "Omba mkopo, ona unachodaiwa na tarehe ya kulipa." },
      { property: "og:title", content: "Mikopo — ChamaMkononi" },
      { property: "og:description", content: "Omba mkopo, ona unachodaiwa na tarehe ya kulipa." },
    ],
  }),
  component: Loans,
});

function Loans() {
  const fetchFn = useServerFn(getLoans);
  const requestFn = useServerFn(requestLoan);
  const decideFn = useServerFn(decideLoan);
  const repayFn = useServerFn(recordRepayment);
  const qc = useQueryClient();
  const { t, lang } = useLang();
  const { data } = useChamaQuery(["loans"], () => fetchFn());

  const [askAmount, setAskAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmAsk, setConfirmAsk] = useState(false);

  const isOfficial = data?.member?.role === "chairperson" || data?.member?.role === "treasurer";

  const ask = useMutation({
    mutationFn: () => requestFn({ data: { amount: Number(askAmount), reason } }),
    onSuccess: () => {
      setConfirmAsk(false);
      setAskAmount("");
      setReason("");
      toast.success("Ombi lako limefika kwa kamati.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana. Jaribu tena."),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      decideFn({
        data: {
          id: v.id,
          approve: v.approve,
          dueDate: v.approve
            ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString().slice(0, 10)
            : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Imewekwa.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Huna ruhusa au imeshindikana."),
  });

  const repay = useMutation({
    mutationFn: (v: { loanId: string; amount: number }) => repayFn({ data: v }),
    onSuccess: () => {
      toast.success("Marejesho yameandikwa.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana."),
  });

  const mine = (data?.loans ?? []).filter((l: any) => l.mine);
  const others = (data?.loans ?? []).filter((l: any) => !l.mine);

  return (
    <Screen>
      <PageHeader title={t("loans")} subtitle="Loans" />

      <div className="mt-6 grid gap-3">
        {mine.map((l: any) => (
          <div key={l.id} className="rounded-3xl border border-card/70 bg-card/70 p-4">
            <p className="font-display text-xl font-extrabold">
              {t("loanOwed")}: {ksh(l.remaining)}
            </p>
            <p className="mt-1 text-base">
              {t("alreadyPaid")}: {ksh(l.paid)} · {t("amountToPay")}: {ksh(l.amount)}
            </p>
            <p className="text-base">
              {t("nextPayment")}: {l.due_date ? formatDay(l.due_date, lang) : "Bado haijapangwa"}
            </p>
            <p className="mt-1 text-base font-bold">
              {l.status === "pending"
                ? "⏳ Inasubiri kamati"
                : l.status === "approved"
                  ? "✓ Imekubaliwa"
                  : l.status === "rejected"
                    ? "✕ Imekataliwa"
                    : "✓ Imelipwa yote"}
            </p>
          </div>
        ))}
        {mine.length === 0 ? <p className="text-lg">Huna mkopo kwa sasa.</p> : null}
      </div>

      <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
        <p className="font-display text-xl font-bold">Omba mkopo · Ask for a loan</p>
        <input
          value={askAmount}
          onChange={(e) => setAskAmount(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="5000"
          className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-5 text-2xl font-bold"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sababu (mfano: biashara)"
          className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
        />
        <button
          disabled={!askAmount}
          onClick={() => setConfirmAsk(true)}
          className="mt-3 w-full rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-50"
        >
          TUMA OMBI
        </button>
      </div>

      {isOfficial ? (
        <div className="mt-6">
          <p className="font-display text-xl font-bold">Maombi ya wanachama</p>
          <div className="mt-3 grid gap-3">
            {others.map((l: any) => (
              <div key={l.id} className="rounded-3xl border border-card/70 bg-card/70 p-4">
                <p className="font-display text-lg font-bold">
                  {l.chama_members?.display_name} · {ksh(l.amount)}
                </p>
                <p className="text-base text-muted-foreground">{l.reason ?? "—"}</p>
                <p className="text-base">
                  {t("alreadyPaid")}: {ksh(l.paid)} · {t("remaining")}: {ksh(l.remaining)}
                </p>
                {l.status === "pending" ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => decide.mutate({ id: l.id, approve: true })}
                      className="rounded-2xl bg-brand py-4 font-display text-lg font-extrabold text-cream"
                    >
                      ✓ KUBALI
                    </button>
                    <button
                      onClick={() => decide.mutate({ id: l.id, approve: false })}
                      className="rounded-2xl border border-border bg-card py-4 font-display text-lg font-extrabold"
                    >
                      ✕ KATAA
                    </button>
                  </div>
                ) : l.status === "approved" ? (
                  <button
                    onClick={() => {
                      const value = window.prompt("Marejesho ya KSh ngapi?");
                      const n = Number(value);
                      if (n > 0) repay.mutate({ loanId: l.id, amount: n });
                    }}
                    className="mt-3 w-full rounded-2xl border border-border bg-card py-4 text-lg font-bold"
                  >
                    Andika marejesho
                  </button>
                ) : (
                  <p className="mt-2 text-base font-bold">✕ Imekataliwa</p>
                )}
              </div>
            ))}
            {others.length === 0 ? <p className="text-lg">Hakuna maombi mapya.</p> : null}
          </div>
        </div>
      ) : null}

      <ConfirmSheet
        open={confirmAsk}
        question={`UNATAKA KUOMBA ${ksh(Number(askAmount || 0))}?`}
        detail={reason || undefined}
        busy={ask.isPending}
        onConfirm={() => ask.mutate()}
        onCancel={() => setConfirmAsk(false)}
      />
    </Screen>
  );
}
