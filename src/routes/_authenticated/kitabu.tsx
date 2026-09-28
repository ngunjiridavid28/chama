import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { ConfirmSheet } from "@/components/chama/ConfirmSheet";
import {
  confirmContribution,
  getContributions,
  getMembers,
  recordContribution,
} from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kitabu")({
  head: () => ({
    meta: [
      { title: "Kitabu cha chama — ChamaMkononi" },
      {
        name: "description",
        content: "Kitabu cha michango: jina, kiasi, tarehe na njia ya kulipa.",
      },
      { property: "og:title", content: "Kitabu cha chama — ChamaMkononi" },
      {
        property: "og:description",
        content: "Kitabu cha michango: jina, kiasi, tarehe na njia ya kulipa.",
      },
    ],
  }),
  component: Book,
});

function Book() {
  const fetchFn = useServerFn(getContributions);
  const membersFn = useServerFn(getMembers);
  const recordFn = useServerFn(recordContribution);
  const confirmFn = useServerFn(confirmContribution);
  const qc = useQueryClient();
  const { t, lang } = useLang();

  const { data } = useChamaQuery(["contributions"], () => fetchFn());
  const { data: people } = useChamaQuery(["members"], () => membersFn());

  const [entry, setEntry] = useState<{ memberId: string; name: string; amount: string } | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOfficial = data?.member?.role === "treasurer" || data?.member?.role === "chairperson";

  const write = useMutation({
    mutationFn: () =>
      recordFn({
        data: { amount: Number(entry!.amount), memberId: entry!.memberId, method: "cash" },
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setEntry(null);
      toast.success("Imeandikwa kwenye kitabu.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Huna ruhusa au imeshindikana."),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => confirmFn({ data: v }),
    onSuccess: () => {
      toast.success("Imewekwa.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Huna ruhusa."),
  });

  const rows = isOfficial ? (data?.rows ?? []) : (data?.mine ?? []);
  const pending = (data?.rows ?? []).filter((r: any) => r.status === "pending");

  return (
    <Screen>
      <PageHeader title={t("book")} subtitle="Chama book" />

      {!isOfficial ? (
        <p className="mt-4 text-base text-muted-foreground">
          Unaona michango yako. Mweka hazina na mwenyekiti ndio wanaona ya wote.
        </p>
      ) : null}

      {isOfficial && pending.length > 0 ? (
        <div className="mt-5">
          <p className="font-display text-xl font-bold">Inasubiri kuthibitishwa</p>
          <div className="mt-3 grid gap-3">
            {pending.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-warn/50 bg-warn-soft p-4">
                <p className="text-lg font-bold">
                  {c.chama_members?.display_name} · {ksh(c.amount)}
                </p>
                <p className="text-base">
                  {formatDay(c.paid_on, lang)} ·{" "}
                  {c.method === "cash" ? "pesa mkononi" : "M-Pesa (mfano)"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => decide.mutate({ id: c.id, accept: true })}
                    className="rounded-2xl bg-brand py-4 font-display text-lg font-extrabold text-cream"
                  >
                    ✓ NDIO, IMEFIKA
                  </button>
                  <button
                    onClick={() => decide.mutate({ id: c.id, accept: false })}
                    className="rounded-2xl border border-border bg-card py-4 font-display text-lg font-extrabold"
                  >
                    ✕ HAPANA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isOfficial ? (
        <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
          <p className="font-display text-xl font-bold">Andika mchango</p>
          <div className="mt-3 grid gap-2">
            {(people?.members ?? []).map((m: any) => (
              <button
                key={m.id}
                onClick={() => setEntry({ memberId: m.id, name: m.display_name, amount: "" })}
                className={`rounded-2xl border px-4 py-4 text-left text-lg font-bold ${
                  entry?.memberId === m.id ? "border-brand bg-brand/10" : "border-border bg-card"
                }`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
          {entry ? (
            <>
              <input
                value={entry.amount}
                onChange={(e) => setEntry({ ...entry, amount: e.target.value.replace(/\D/g, "") })}
                inputMode="numeric"
                placeholder="500"
                className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-5 text-2xl font-bold"
              />
              <button
                disabled={!entry.amount}
                onClick={() => setConfirmOpen(true)}
                className="mt-3 w-full rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-50"
              >
                WEKA KWENYE KITABU
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 font-display text-xl font-bold">Michango iliyoandikwa</p>
      <div className="mt-3 grid gap-2">
        {rows.map((c: any) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-2xl border border-card/70 bg-card/70 px-4 py-3"
          >
            <div>
              <p className="text-lg font-bold">
                {c.chama_members?.display_name ?? data?.member?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDay(c.paid_on, lang)} · {c.period} ·{" "}
                {c.method === "cash" ? "pesa mkononi" : "M-Pesa"}
              </p>
            </div>
            <p className="font-display text-lg font-extrabold">
              {ksh(c.amount)}
              <span className="block text-xs font-medium text-muted-foreground">
                {c.status === "confirmed"
                  ? "✓ imethibitishwa"
                  : c.status === "pending"
                    ? "⏳ inasubiri"
                    : "✕ imekataliwa"}
              </span>
            </p>
          </div>
        ))}
      </div>

      <ConfirmSheet
        open={confirmOpen}
        question={`ANDIKA ${ksh(Number(entry?.amount ?? 0))}?`}
        detail={entry?.name}
        busy={write.isPending}
        onConfirm={() => write.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}
