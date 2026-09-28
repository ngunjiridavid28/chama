import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Screen } from "@/components/chama/Screen";
import { claimSlot, listOpenSlots, requestToJoinChama } from "@/lib/chama.functions";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/jiunge")({
  validateSearch: z.object({
    code: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Jiunge na chama — ChamaMkononi" },
      { name: "description", content: "Jiunge na chama chako kwa kutumia nambari ya siri." },
      { property: "og:title", content: "Jiunge na chama — ChamaMkononi" },
      { property: "og:description", content: "Jiunge na chama chako kwa kutumia nambari ya siri." },
    ],
  }),
  component: Join,
});

function Join() {
  const { code: queryCode } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useLang();
  const slotsFn = useServerFn(listOpenSlots);
  const claimFn = useServerFn(claimSlot);
  const requestFn = useServerFn(requestToJoinChama);

  const initialCode = (queryCode ?? "").trim().toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [search, setSearch] = useState(initialCode);

  // Custom request form state
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantIdNumber, setApplicantIdNumber] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["slots", search],
    queryFn: () => slotsFn({ data: { code: search } }),
    enabled: search.length >= 3,
  });

  const claim = useMutation({
    mutationFn: (memberId: string) => claimFn({ data: { memberId } }),
    onSuccess: () => {
      toast.success(lang === "sw" ? "Umejiunga kikamilifu!" : "Successfully joined!");
      navigate({ to: "/nyumbani", replace: true });
    },
    onError: () =>
      toast.error(
        lang === "sw" ? "Imeshindikana. Jina hilo limeshachukuliwa." : "Could not claim slot.",
      ),
  });

  const requestJoin = useMutation({
    mutationFn: () =>
      requestFn({
        data: {
          code: search,
          displayName: applicantName.trim(),
          phone: applicantPhone.trim() || undefined,
          idNumber: applicantIdNumber.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        lang === "sw"
          ? `Maombi ya kujiunga na ${res.chamaName} yamewasilishwa!`
          : `Join request for ${res.chamaName} submitted!`,
      );
      navigate({ to: "/nyumbani", replace: true });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kutuma maombi.");
    },
  });

  return (
    <Screen nav={false}>
      <h1 className="font-display text-3xl font-extrabold text-foreground">
        {lang === "sw" ? "Jiunge na Chama Chako" : "Join Your Chama"}
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {lang === "sw"
          ? "Weka nambari ya siri ya chama uliyopewa na kiongozi wako."
          : "Enter the chama join code given by your leader or chairperson."}
      </p>

      <div className="mt-6 grid gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/50"
          placeholder="Mfano: TUPENDANE"
        />
        <button
          type="button"
          onClick={() => {
            if (code.length < 3) {
              toast.error(
                lang === "sw"
                  ? "Weka nambari kamili ya chama (angalau herufi 3)."
                  : "Enter a valid code (at least 3 characters).",
              );
              return;
            }
            setSearch(code);
          }}
          disabled={code.length < 3 || isFetching}
          className="rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-50"
        >
          {isFetching ? "Inatafuta..." : lang === "sw" ? "TAFUTA CHAMA" : "SEARCH CHAMA"}
        </button>
      </div>

      {isFetching ? (
        <p className="mt-6 text-center text-lg text-muted-foreground">
          {lang === "sw" ? "Inatafuta chama…" : "Searching chama…"}
        </p>
      ) : null}

      {data?.chama ? (
        <div className="mt-6 rounded-3xl border border-brand/20 bg-brand/5 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            {lang === "sw" ? "Chama Kimepatikana" : "Chama Found"}
          </p>
          <p className="font-display text-2xl font-extrabold text-foreground">{data.chama.name}</p>

          {/* Section 1: Pre-registered Slots (if any) */}
          {data.slots && data.slots.length > 0 ? (
            <div className="mt-5 border-t border-brand/10 pt-4">
              <p className="text-sm font-bold text-foreground">
                {lang === "sw"
                  ? "Chagua jina lililosajiliwa awali:"
                  : "Select your pre-registered name:"}
              </p>
              <div className="mt-3 grid gap-2">
                {data.slots.map((s: { id: string; display_name: string; role: string }) => (
                  <button
                    key={s.id}
                    onClick={() => claim.mutate(s.id)}
                    disabled={claim.isPending}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-left font-display text-base font-bold transition hover:border-brand/40"
                  >
                    <span>
                      {s.display_name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {s.role}
                      </span>
                    </span>
                    <span className="rounded-xl bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                      {lang === "sw" ? "Chukua Jina" : "Claim"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Section 2: Direct Join Application Form */}
          <div className="mt-6 border-t border-brand/10 pt-5">
            <p className="font-display text-base font-bold text-foreground">
              {data.slots && data.slots.length > 0
                ? lang === "sw"
                  ? "Au jiunge kwa majina yako mwenyewe:"
                  : "Or apply with your own details:"
                : lang === "sw"
                  ? "Tuma maombi ya kujiunga kwa Mwenyekiti:"
                  : "Submit join request to Chairperson:"}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (applicantName.trim().length < 2) {
                  toast.error(lang === "sw" ? "Weka jina lako kamili." : "Enter your full name.");
                  return;
                }
                requestJoin.mutate();
              }}
              className="mt-3 grid gap-3"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {lang === "sw" ? "Jina lako kamili *" : "Your Full Name *"}
                </label>
                <input
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                  placeholder="Mfano: Mary Wanjiru"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {lang === "sw" ? "Nambari ya Simu (M-Pesa)" : "Phone Number (M-Pesa)"}
                </label>
                <input
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  type="tel"
                  placeholder="0722 000 000"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {lang === "sw"
                    ? "Nambari ya Kitambulisho (ID - ya hiari)"
                    : "National ID Number (Optional)"}
                </label>
                <input
                  value={applicantIdNumber}
                  onChange={(e) => setApplicantIdNumber(e.target.value)}
                  placeholder="Mfano: 28456789"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={requestJoin.isPending}
                className="mt-2 w-full rounded-2xl bg-brand py-4 font-display text-base font-extrabold text-cream shadow transition hover:opacity-95 disabled:opacity-50"
              >
                {requestJoin.isPending
                  ? "Inatuma maombi..."
                  : lang === "sw"
                    ? "TUMA MAOMBI YA KUJIUNGA"
                    : "SUBMIT JOIN REQUEST"}
              </button>
            </form>
          </div>
        </div>
      ) : data && !data.chama && search ? (
        <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-center">
          <p className="font-bold text-destructive">
            {lang === "sw"
              ? `Hatujapata chama chenye nambari "${search}".`
              : `No chama found with code "${search}".`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "sw"
              ? "Tafadhali hakikisha umeingiza nambari sahihi kutoka kwa mwenyekiti wako."
              : "Please make sure you entered the correct join code from your chairperson."}
          </p>
        </div>
      ) : null}

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => navigate({ to: "/nyumbani" })}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {lang === "sw" ? "Rudi Nyumbani · Back to Home" : "Back to Home"}
        </button>
      </div>
    </Screen>
  );
}
