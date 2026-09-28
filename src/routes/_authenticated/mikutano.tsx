import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { createMeeting, getMeetings, saveMinutes, saveRsvp } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mikutano")({
  head: () => ({
    meta: [
      { title: "Mikutano — ChamaMkononi" },
      { name: "description", content: "Mkutano ujao, mahali, ajenda na majibu ya wanachama." },
      { property: "og:title", content: "Mikutano — ChamaMkononi" },
      {
        property: "og:description",
        content: "Mkutano ujao, mahali, ajenda na majibu ya wanachama.",
      },
    ],
  }),
  component: Meetings,
});

function Meetings() {
  const fetchFn = useServerFn(getMeetings);
  const rsvpFn = useServerFn(saveRsvp);
  const createFn = useServerFn(createMeeting);
  const minutesFn = useServerFn(saveMinutes);
  const qc = useQueryClient();
  const { t, lang } = useLang();
  const { data } = useChamaQuery(["meetings"], () => fetchFn());

  const [form, setForm] = useState({
    title: "Mkutano wa mwezi",
    meetOn: "",
    meetAt: "17:00",
    location: "",
    agenda: "",
  });
  const canCreate = data?.member?.role === "secretary" || data?.member?.role === "chairperson";

  const rsvp = useMutation({
    mutationFn: (v: { meetingId: string; response: "coming" | "not_coming" }) =>
      rsvpFn({ data: v }),
    onSuccess: () => {
      toast.success("Asante, jibu lako limewekwa.");
      qc.invalidateQueries();
    },
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Mkutano umewekwa.");
      setForm({ ...form, meetOn: "", location: "", agenda: "" });
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana. Angalia tarehe na mahali."),
  });

  const minutes = useMutation({
    mutationFn: (v: { meetingId: string; minutes: string }) => minutesFn({ data: v }),
    onSuccess: () => {
      toast.success("Kumbukumbu zimewekwa.");
      qc.invalidateQueries();
    },
  });

  return (
    <Screen>
      <PageHeader title={t("meetings")} subtitle="Meetings" />

      <div className="mt-6 grid gap-3">
        {(data?.meetings ?? []).map((m: any) => {
          const answers = (data?.rsvps ?? []).filter((r: any) => r.meeting_id === m.id);
          const mine = answers.find((r: any) => r.member_id === data?.member?.id);
          return (
            <div key={m.id} className="rounded-3xl border border-card/70 bg-card/70 p-4">
              <p className="font-display text-xl font-extrabold">{m.title}</p>
              <p className="text-lg">
                {formatDay(m.meet_on, lang)} · {String(m.meet_at).slice(0, 5)}
              </p>
              <p className="text-base text-muted-foreground">📍 {m.location}</p>
              {m.agenda ? <p className="mt-2 text-base">Ajenda: {m.agenda}</p> : null}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  onClick={() => rsvp.mutate({ meetingId: m.id, response: "coming" })}
                  className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                    mine?.response === "coming"
                      ? "bg-brand text-cream"
                      : "border border-border bg-card"
                  }`}
                >
                  ✓ {t("coming")}
                </button>
                <button
                  onClick={() => rsvp.mutate({ meetingId: m.id, response: "not_coming" })}
                  className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                    mine?.response === "not_coming"
                      ? "bg-ink text-cream"
                      : "border border-border bg-card"
                  }`}
                >
                  ✕ {t("notComing")}
                </button>
              </div>

              <p className="mt-3 text-base">
                Watakaokuja: {answers.filter((a: any) => a.response === "coming").length} ·{" "}
                {answers
                  .filter((a: any) => a.response === "coming")
                  .map((a: any) => a.chama_members?.display_name)
                  .join(", ") || "—"}
              </p>

              {m.minutes ? <p className="mt-2 text-base">Kumbukumbu: {m.minutes}</p> : null}
              {canCreate ? (
                <button
                  onClick={() => {
                    const value = window.prompt("Kumbukumbu za mkutano:", m.minutes ?? "");
                    if (value) minutes.mutate({ meetingId: m.id, minutes: value });
                  }}
                  className="mt-3 w-full rounded-2xl border border-border bg-card py-4 text-lg font-bold"
                >
                  Andika kumbukumbu
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {canCreate ? (
        <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
          <p className="font-display text-xl font-bold">Weka mkutano mpya</p>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
            placeholder="Jina la mkutano"
          />
          <input
            type="date"
            value={form.meetOn}
            onChange={(e) => setForm({ ...form, meetOn: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
          />
          <input
            type="time"
            value={form.meetAt}
            onChange={(e) => setForm({ ...form, meetAt: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
          />
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
            placeholder="Mahali"
          />
          <input
            value={form.agenda}
            onChange={(e) => setForm({ ...form, agenda: e.target.value })}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
            placeholder="Ajenda"
          />
          <button
            disabled={!form.meetOn || !form.location || create.isPending}
            onClick={() => create.mutate()}
            className="mt-3 w-full rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-50"
          >
            WEKA MKUTANO
          </button>
        </div>
      ) : null}
    </Screen>
  );
}
