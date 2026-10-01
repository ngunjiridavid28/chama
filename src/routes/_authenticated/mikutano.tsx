import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import {
  createMeeting,
  getMeetings,
  saveMinutes,
  saveRsvp,
  toggleAttendanceRollCall,
} from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mikutano")({
  head: () => ({
    meta: [
      { title: "Mikutano — ChamaMkononi" },
      {
        name: "description",
        content: "Mkutano ujao, mahali, ajenda, majibu ya wanachama na kumbukumbu za mkutano.",
      },
      { property: "og:title", content: "Mikutano — ChamaMkononi" },
      {
        property: "og:description",
        content: "Mkutano ujao, mahali, ajenda, majibu ya wanachama na kumbukumbu.",
      },
    ],
  }),
  component: MeetingsView,
});

interface MeetingRow {
  id: string;
  title: string;
  meet_on: string;
  meet_at: string;
  location: string;
  agenda: string | null;
  minutes: string | null;
  created_by?: string | null;
}

interface RsvpRow {
  id?: string;
  meeting_id: string;
  member_id: string;
  response: "coming" | "not_coming" | null;
  attended?: boolean | null;
  chama_members?: { display_name: string; phone?: string | null };
}

interface MemberRow {
  id: string;
  display_name: string;
  phone: string | null;
  role: string;
}

function MeetingsView() {
  const fetchFn = useServerFn(getMeetings);
  const rsvpFn = useServerFn(saveRsvp);
  const createFn = useServerFn(createMeeting);
  const minutesFn = useServerFn(saveMinutes);
  const rollCallFn = useServerFn(toggleAttendanceRollCall);

  const qc = useQueryClient();
  const { t, lang } = useLang();
  const { data } = useChamaQuery(["meetings"], () => fetchFn());

  const isOfficial = ["secretary", "chairperson", "treasurer"].includes(data?.member?.role || "");

  // Form & Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "Mkutano wa Mwezi",
    meetOn: "",
    meetAt: "17:00",
    location: "",
    agenda: "",
  });

  const [activeMinutesMeeting, setActiveMinutesMeeting] = useState<MeetingRow | null>(null);
  const [minutesText, setMinutesText] = useState("");

  const [activeRollCallMeeting, setActiveRollCallMeeting] = useState<MeetingRow | null>(null);

  const meetings = (data?.meetings ?? []) as MeetingRow[];
  const rsvps = (data?.rsvps ?? []) as RsvpRow[];
  const members = (data?.members ?? []) as MemberRow[];

  const rsvpMutation = useMutation({
    mutationFn: (v: { meetingId: string; response: "coming" | "not_coming" }) =>
      rsvpFn({ data: v }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.response === "coming"
          ? lang === "sw"
            ? "Asante! Jibu lako la kuhudhuria limerekodiwa."
            : "Thanks! Your RSVP (Attending) is recorded."
          : lang === "sw"
            ? "Jibu lako limerekodiwa."
            : "Your RSVP is recorded.",
      );
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana kuhifadhi jibu. Jaribu tena."),
  });

  const createMutation = useMutation({
    mutationFn: () => createFn({ data: createForm }),
    onSuccess: () => {
      toast.success(
        lang === "sw" ? "Mkutano mpya umeratibiwa!" : "New meeting scheduled successfully!",
      );
      setShowCreateModal(false);
      setCreateForm({
        title: "Mkutano wa Mwezi",
        meetOn: "",
        meetAt: "17:00",
        location: "",
        agenda: "",
      });
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuweka mkutano.");
    },
  });

  const minutesMutation = useMutation({
    mutationFn: () => {
      if (!activeMinutesMeeting) throw new Error("No meeting");
      return minutesFn({
        data: {
          meetingId: activeMinutesMeeting.id,
          minutes: minutesText.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success(
        lang === "sw"
          ? "Muhtasari wa mkutano umehifadhiwa!"
          : "Meeting minutes saved successfully!",
      );
      setActiveMinutesMeeting(null);
      setMinutesText("");
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuhifadhi muhtasari.");
    },
  });

  const rollCallMutation = useMutation({
    mutationFn: (vars: { meetingId: string; memberId: string; attended: boolean }) =>
      rollCallFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kusasisha mahudhurio.");
    },
  });

  function shareMeetingNoticeWhatsApp(m: MeetingRow) {
    const attendees = rsvps
      .filter((r) => r.meeting_id === m.id && r.response === "coming")
      .map((r) => r.chama_members?.display_name || "Mwanachama")
      .join(", ");

    const text =
      lang === "sw"
        ? `📅 *MKUTANO WA CHAMA — ${data?.chama?.name || "Chama"}*\n\n` +
          `📌 *Mada:* ${m.title}\n` +
          `🗓 *Tarehe:* ${formatDay(m.meet_on, lang)}\n` +
          `⏰ *Saa:* ${String(m.meet_at).slice(0, 5)}\n` +
          `📍 *Mahali:* ${m.location}\n` +
          (m.agenda ? `📋 *Ajenda:* ${m.agenda}\n\n` : "\n") +
          `👥 *Walithibitisha kuja:* ${attendees || "Bado wanathibitisha"}\n\n` +
          `_Tafadhali thibitisha kuhudhuria kupitia ChamaMkononi._`
        : `📅 *CHAMA MEETING NOTICE — ${data?.chama?.name || "Chama"}*\n\n` +
          `📌 *Title:* ${m.title}\n` +
          `🗓 *Date:* ${formatDay(m.meet_on, lang)}\n` +
          `⏰ *Time:* ${String(m.meet_at).slice(0, 5)}\n` +
          `📍 *Location:* ${m.location}\n` +
          (m.agenda ? `📋 *Agenda:* ${m.agenda}\n\n` : "\n") +
          `👥 *Confirmed coming:* ${attendees || "RSVPs pending"}\n\n` +
          `_Please confirm your attendance on ChamaMkononi._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function shareMinutesWhatsApp(m: MeetingRow) {
    const text =
      lang === "sw"
        ? `📝 *MUHTASARI WA MKUTANO — ${data?.chama?.name || "Chama"}*\n\n` +
          `📌 *Mkutano:* ${m.title}\n` +
          `🗓 *Tarehe:* ${formatDay(m.meet_on, lang)}\n` +
          `📍 *Mahali:* ${m.location}\n\n` +
          `*Maamuzi & Kumbukumbu:*\n${m.minutes || "Bado kuandikwa"}\n\n` +
          `_Imetolewa kupitia ChamaMkononi._`
        : `📝 *MEETING MINUTES — ${data?.chama?.name || "Chama"}*\n\n` +
          `📌 *Meeting:* ${m.title}\n` +
          `🗓 *Date:* ${formatDay(m.meet_on, lang)}\n` +
          `📍 *Location:* ${m.location}\n\n` +
          `*Decisions & Minutes:*\n${m.minutes || "Not recorded"}\n\n` +
          `_Issued via ChamaMkononi._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  // Find nearest upcoming meeting
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingMeeting = meetings.find((m) => m.meet_on >= todayStr) || meetings[0];
  const pastMeetings = meetings.filter((m) => m.id !== upcomingMeeting?.id);

  return (
    <Screen>
      <PageHeader title={t("meetings")} subtitle="Mikutano & Kumbukumbu" />

      {/* Official Action Bar */}
      {isOfficial ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-brand px-4 py-3 font-display text-xs font-extrabold text-cream shadow-md transition hover:opacity-95"
          >
            <span>+</span>
            <span>{lang === "sw" ? "WEKA MKUTANO MPYA" : "SCHEDULE MEETING"}</span>
          </button>
        </div>
      ) : null}

      {/* Upcoming Spotlight Meeting */}
      {upcomingMeeting ? (
        <div className="mt-5 rounded-3xl border-2 border-brand/20 bg-brand/5 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand uppercase tracking-wider">
              {upcomingMeeting.meet_on >= todayStr
                ? lang === "sw"
                  ? "Mkutano Ujao"
                  : "Next Meeting"
                : lang === "sw"
                  ? "Mkutano wa Hivi Karibuni"
                  : "Recent Meeting"}
            </span>

            <button
              type="button"
              onClick={() => shareMeetingNoticeWhatsApp(upcomingMeeting)}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
            >
              <span>WhatsApp</span>
            </button>
          </div>

          <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {upcomingMeeting.title}
          </h2>

          <div className="mt-2 space-y-1 text-sm text-foreground">
            <p className="flex items-center gap-2">
              <span>🗓</span>
              <span className="font-bold">{formatDay(upcomingMeeting.meet_on, lang)}</span>
              <span className="text-muted-foreground">
                • Saa {String(upcomingMeeting.meet_at).slice(0, 5)}
              </span>
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <span>📍</span>
              <span>{upcomingMeeting.location}</span>
            </p>
          </div>

          {upcomingMeeting.agenda ? (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "sw" ? "Ajenda ya Mkutano" : "Meeting Agenda"}
              </p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-line">
                {upcomingMeeting.agenda}
              </p>
            </div>
          ) : null}

          {/* Member RSVP Section */}
          {(() => {
            const meetingRsvps = rsvps.filter((r) => r.meeting_id === upcomingMeeting.id);
            const myRsvp = meetingRsvps.find((r) => r.member_id === data?.member?.id);
            const comingCount = meetingRsvps.filter((r) => r.response === "coming").length;
            const notComingCount = meetingRsvps.filter((r) => r.response === "not_coming").length;

            return (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                  {lang === "sw" ? "Je, utahudhuria mkutano huu?" : "Will you attend this meeting?"}
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={rsvpMutation.isPending}
                    onClick={() =>
                      rsvpMutation.mutate({ meetingId: upcomingMeeting.id, response: "coming" })
                    }
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-sm font-extrabold transition ${
                      myRsvp?.response === "coming"
                        ? "bg-brand text-cream shadow-md"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>✓</span>
                    <span>{lang === "sw" ? "Nitahudhuria" : "I will attend"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={rsvpMutation.isPending}
                    onClick={() =>
                      rsvpMutation.mutate({ meetingId: upcomingMeeting.id, response: "not_coming" })
                    }
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-sm font-extrabold transition ${
                      myRsvp?.response === "not_coming"
                        ? "bg-stone-800 text-cream shadow-md"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>✕</span>
                    <span>{lang === "sw" ? "Sitaweza" : "Cannot attend"}</span>
                  </button>
                </div>

                {/* RSVP Attendance Summary */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-emerald-700">
                    ✓ {comingCount} {lang === "sw" ? "wamethibitisha kuja" : "confirmed coming"}
                  </span>
                  {notComingCount > 0 ? (
                    <span className="text-stone-500">
                      ✕ {notComingCount} {lang === "sw" ? "hawatakuja" : "cannot make it"}
                    </span>
                  ) : null}
                </div>

                {/* Roll Call Button for Officials */}
                {isOfficial ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRollCallMeeting(upcomingMeeting)}
                      className="flex-1 rounded-xl border border-brand/30 bg-brand/10 py-2.5 text-xs font-bold text-brand hover:bg-brand/20"
                    >
                      📋{" "}
                      {lang === "sw" ? "Orodha ya Mahudhurio (Roll Call)" : "Roll Call Checklist"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMinutesMeeting(upcomingMeeting);
                        setMinutesText(upcomingMeeting.minutes || "");
                      }}
                      className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      📝 {lang === "sw" ? "Andika Kumbukumbu" : "Minutes"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* Meeting Minutes Display if Recorded */}
          {upcomingMeeting.minutes ? (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Kumbukumbu & Maamuzi" : "Minutes & Decisions"}
                </p>
                <button
                  type="button"
                  onClick={() => shareMinutesWhatsApp(upcomingMeeting)}
                  className="text-xs font-bold text-[#25D366] hover:underline"
                >
                  Tuma WhatsApp
                </button>
              </div>
              <p className="mt-1.5 text-sm text-foreground whitespace-pre-line">
                {upcomingMeeting.minutes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Past Meetings List */}
      <div className="mt-6 rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold text-foreground">
            {lang === "sw" ? "Mikutano Iliyopita" : "Past Meetings History"}
          </p>
          <span className="text-xs text-muted-foreground">
            {pastMeetings.length} {lang === "sw" ? "mikutano" : "meetings"}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {pastMeetings.map((m) => {
            const meetingRsvps = rsvps.filter((r) => r.meeting_id === m.id);
            const attendedCount = meetingRsvps.filter((r) => r.attended === true).length;
            const comingCount = meetingRsvps.filter((r) => r.response === "coming").length;

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-border p-4 bg-muted/10 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-base font-bold text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(m.meet_on, lang)} • {String(m.meet_at).slice(0, 5)} • {m.location}
                    </p>
                  </div>

                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                    {attendedCount > 0
                      ? `${attendedCount} walihudhuria`
                      : `${comingCount} walithibitisha`}
                  </span>
                </div>

                {m.minutes ? (
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground">Kumbukumbu:</span>
                      <button
                        type="button"
                        onClick={() => shareMinutesWhatsApp(m)}
                        className="text-xs text-[#25D366] font-bold"
                      >
                        WhatsApp
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.minutes}</p>
                  </div>
                ) : null}

                {isOfficial ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMinutesMeeting(m);
                        setMinutesText(m.minutes || "");
                      }}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      {m.minutes ? "Hariri Kumbukumbu" : "+ Andika Kumbukumbu"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {pastMeetings.length === 0 && !upcomingMeeting ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {lang === "sw" ? "Bado hakuna mikutano iliyorekodiwa." : "No meetings scheduled yet."}
            </p>
          ) : null}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Uongozi wa Chama" : "Officials"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {lang === "sw" ? "Ratibu Mkutano Mpya" : "Schedule New Meeting"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="mt-4 grid gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Jina / Mada ya Mkutano *" : "Meeting Title *"}
                </label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                  placeholder="Mfano: Mkutano wa Mwezi wa Oktoba"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Tarehe *" : "Date *"}
                  </label>
                  <input
                    type="date"
                    value={createForm.meetOn}
                    onChange={(e) => setCreateForm({ ...createForm, meetOn: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-border bg-card px-3.5 py-3 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Muda (Saa) *" : "Time *"}
                  </label>
                  <input
                    type="time"
                    value={createForm.meetAt}
                    onChange={(e) => setCreateForm({ ...createForm, meetAt: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-border bg-card px-3.5 py-3 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Mahali pa Mkutano *" : "Meeting Venue / Location *"}
                </label>
                <input
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  required
                  placeholder="Mfano: Nyumbani kwa Mama Wanjiku"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Ajenda za Mkutano (Hiari)" : "Agenda Items (Optional)"}
                </label>
                <textarea
                  value={createForm.agenda}
                  onChange={(e) => setCreateForm({ ...createForm, agenda: e.target.value })}
                  rows={3}
                  placeholder="1. Michango ya mwezi&#10;2. Maombi ya mikopo&#10;3. Mradi wa maji"
                  className="w-full rounded-2xl border border-border bg-card p-3 text-sm"
                />
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-2xl border border-border py-3.5 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !createForm.meetOn || !createForm.location}
                  className="flex-1 rounded-2xl bg-brand py-3.5 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {createMutation.isPending
                    ? "Inahifadhi..."
                    : lang === "sw"
                      ? "Weka Mkutano"
                      : "Save Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Minutes Editor Modal */}
      {activeMinutesMeeting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Kumbukumbu Rasmi" : "Official Minutes"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {activeMinutesMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMinutesMeeting(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {formatDay(activeMinutesMeeting.meet_on, lang)} • {activeMinutesMeeting.location}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                minutesMutation.mutate();
              }}
              className="mt-4 grid gap-3"
            >
              <textarea
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                rows={8}
                required
                placeholder={
                  lang === "sw"
                    ? "Andika kumbukumbu, maamuzi na majukumu yaliyokubaliwa kwenye mkutano..."
                    : "Enter minutes, resolutions, and action items agreed upon during the meeting..."
                }
                className="w-full rounded-2xl border border-border bg-card p-4 text-sm font-sans"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMinutesMeeting(null)}
                  className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Funga" : "Close"}
                </button>
                <button
                  type="submit"
                  disabled={minutesMutation.isPending}
                  className="flex-1 rounded-2xl bg-brand py-3 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {minutesMutation.isPending
                    ? "Inahifadhi..."
                    : lang === "sw"
                      ? "Hifadhi Kumbukumbu"
                      : "Save Minutes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Roll Call Attendance Checklist Modal */}
      {activeRollCallMeeting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Orodha ya Mahudhurio" : "Attendance Roll Call"}
                </p>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {activeRollCallMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRollCallMeeting(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Weka alama wanachama waliohudhuria mkutano kimwili:"
                : "Check off members who are physically present in the meeting:"}
            </p>

            <div className="mt-4 grid gap-2">
              {members.map((m) => {
                const meetingRsvp = rsvps.find(
                  (r) => r.meeting_id === activeRollCallMeeting.id && r.member_id === m.id,
                );
                const isAttended = meetingRsvp?.attended === true;

                return (
                  <div
                    key={m.id}
                    onClick={() =>
                      rollCallMutation.mutate({
                        meetingId: activeRollCallMeeting.id,
                        memberId: m.id,
                        attended: !isAttended,
                      })
                    }
                    className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition ${
                      isAttended
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        {m.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.role} •{" "}
                        {meetingRsvp?.response === "coming" ? "Alithibitisha kuja" : "Hakutoa jibu"}
                      </p>
                    </div>

                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold ${
                        isAttended
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-muted-foreground/30 bg-transparent text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveRollCallMeeting(null)}
              className="mt-5 w-full rounded-2xl bg-brand py-3 text-xs font-bold text-cream"
            >
              {lang === "sw" ? "Kamilisha Mahudhurio" : "Finish Roll Call"}
            </button>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
