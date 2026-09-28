import { useLang } from "@/lib/i18n";

type Props = {
  open: boolean;
  question: string;
  detail?: string | undefined;
  busy?: boolean | undefined;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Every money action passes through this sheet. Words, not colour, carry the
 * meaning: NDIO — TUMA / HAPANA — RUDI.
 */
export function ConfirmSheet({ open, question, detail, busy, onConfirm, onCancel }: Props) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onCancel} />
      <div className="absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 rounded-t-3xl border border-card/70 bg-background px-5 pb-8 pt-4">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-foreground/15" />
        <h2 className="text-center font-display text-2xl font-extrabold leading-tight">
          {question}
        </h2>
        {detail ? <p className="mt-2 text-center text-lg text-muted-foreground">{detail}</p> : null}
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-60"
          >
            {busy ? t("loading") : t("yesSend")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-border bg-card py-5 font-display text-xl font-extrabold text-foreground"
          >
            {t("noBack")}
          </button>
        </div>
      </div>
    </div>
  );
}
