import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import {
  createChama,
  decideMember,
  getMembers,
  postAnnouncement,
  removeTrustedHelper,
  setTrustedHelper,
  submitMemberKYC,
  updateMemberRole,
  verifyMemberKYC,
} from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { ksh, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chama")({
  head: () => ({
    meta: [
      { title: "Chama Yangu — ChamaMkononi" },
      {
        name: "description",
        content: "Usimamizi wa chama, uthibitishaji wa vitambulisho (KYC) na wanachama.",
      },
      { property: "og:title", content: "Chama Yangu — ChamaMkononi" },
      {
        property: "og:description",
        content: "Usimamizi wa chama, uthibitishaji wa vitambulisho (KYC) na wanachama.",
      },
    ],
  }),
  component: MyChama,
});

const roleWords: Record<string, string> = {
  chairperson: "Mwenyekiti · Chairperson",
  treasurer: "Mweka Hazina · Treasurer",
  secretary: "Katibu · Secretary",
  member: "Mwanachama · Member",
};

const idTypeNames: Record<string, string> = {
  national_id: "Kitambulisho cha Taifa (National ID)",
  passport: "Pasi ya Kusafiria (Passport)",
  alien_id: "Kitambulisho cha Mgeni (Alien ID)",
};

interface MemberRow {
  id: string;
  display_name: string;
  phone: string | null;
  role: "chairperson" | "treasurer" | "secretary" | "member";
  user_id: string | null;
  status?: string;
  id_number?: string | null;
  id_type?: string | null;
  dob?: string | null;
  sex?: string | null;
  id_document_url?: string | null;
  kyc_verified?: boolean;
  kyc_verified_at?: string | null;
  joined_at?: string;
}

function MyChama() {
  const fetchFn = useServerFn(getMembers);
  const helperFn = useServerFn(setTrustedHelper);
  const removeFn = useServerFn(removeTrustedHelper);
  const announceFn = useServerFn(postAnnouncement);
  const decideFn = useServerFn(decideMember);
  const updateRoleFn = useServerFn(updateMemberRole);
  const createFn = useServerFn(createChama);
  const submitKycFn = useServerFn(submitMemberKYC);
  const verifyKycFn = useServerFn(verifyMemberKYC);

  const qc = useQueryClient();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const { data, isLoading } = useChamaQuery(["members"], () => fetchFn());
  const [message, setMessage] = useState("");

  // Role edit modal state
  const [roleModalMember, setRoleModalMember] = useState<MemberRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "chairperson" | "treasurer" | "secretary" | "member"
  >("member");

  // KYC inspect modal state for leadership
  const [inspectKycMember, setInspectKycMember] = useState<MemberRow | null>(null);

  // Self KYC modal state
  const [showSelfKycModal, setShowSelfKycModal] = useState(false);
  const [selfIdType, setSelfIdType] = useState<"national_id" | "passport" | "alien_id">(
    "national_id",
  );
  const [selfIdNumber, setSelfIdNumber] = useState("");
  const [selfDob, setSelfDob] = useState("");
  const [selfSex, setSelfSex] = useState<"female" | "male" | "other">("female");
  const [selfDocPreview, setSelfDocPreview] = useState<string | null>(null);

  // Chama creation wizard state (for users who don't have a chama yet)
  const [newName, setNewName] = useState("");
  const [newMonthly, setNewMonthly] = useState(1000);
  const [newMeetingDay, setNewMeetingDay] = useState("Jumapili ya kwanza ya mwezi");
  const [newJoinCode, setNewJoinCode] = useState("");
  const [newChairName, setNewChairName] = useState("");
  const [newChairPhone, setNewChairPhone] = useState("");

  const addHelper = useMutation({
    mutationFn: (helperMemberId: string) => helperFn({ data: { helperMemberId, canRecord: true } }),
    onSuccess: () => {
      toast.success(lang === "sw" ? "Msaidizi amewekwa." : "Helper assigned.");
      qc.invalidateQueries();
    },
    onError: () => toast.error(lang === "sw" ? "Imeshindikana." : "Failed to set helper."),
  });

  const dropHelper = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success(lang === "sw" ? "Msaidizi ameondolewa." : "Helper removed.");
      qc.invalidateQueries();
    },
  });

  const announce = useMutation({
    mutationFn: () => announceFn({ data: { message } }),
    onSuccess: () => {
      setMessage("");
      toast.success(
        lang === "sw" ? "Tangazo limetumwa kwa wanachama wote." : "Announcement broadcasted.",
      );
      qc.invalidateQueries();
    },
    onError: () => toast.error(lang === "sw" ? "Huna ruhusa ya kutangaza." : "Permission denied."),
  });

  const handleDecision = useMutation({
    mutationFn: ({ memberId, approve }: { memberId: string; approve: boolean }) =>
      decideFn({ data: { memberId, approve } }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.approve
          ? lang === "sw"
            ? "Mwanachama ameidhinishwa!"
            : "Member approved!"
          : lang === "sw"
            ? "Maombi yamekataliwa."
            : "Join request rejected.",
      );
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kutekeleza uamuzi.");
    },
  });

  const handleRoleChange = useMutation({
    mutationFn: () => {
      if (!roleModalMember) throw new Error("No member selected");
      return updateRoleFn({ data: { memberId: roleModalMember.id, role: selectedRole } });
    },
    onSuccess: () => {
      toast.success(
        lang === "sw" ? "Cheo kimebadilishwa kikamilifu." : "Role updated successfully.",
      );
      setRoleModalMember(null);
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kubadilisha cheo.");
    },
  });

  const handleCreateChama = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: newName.trim(),
          monthlyContribution: Number(newMonthly),
          meetingDay: newMeetingDay.trim(),
          customJoinCode: newJoinCode.trim() || undefined,
          chairpersonName: newChairName.trim(),
          chairpersonPhone: newChairPhone.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        lang === "sw"
          ? `Chama "${res.chama.name}" kimeundwa kikamilifu!`
          : `Chama "${res.chama.name}" successfully created!`,
      );
      qc.invalidateQueries();
      navigate({ to: "/nyumbani" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuunda chama.");
    },
  });

  const handleSaveSelfKyc = useMutation({
    mutationFn: () =>
      submitKycFn({
        data: {
          idNumber: selfIdNumber.trim(),
          idType: selfIdType,
          dob: selfDob || undefined,
          sex: selfSex,
          idDocumentUrl: selfDocPreview || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(
        lang === "sw"
          ? "Taarifa zako za kitambulisho zimewasilishwa!"
          : "Your KYC details have been saved!",
      );
      setShowSelfKycModal(false);
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kuhifadhi kitambulisho.");
    },
  });

  const handleVerifyMember = useMutation({
    mutationFn: ({ memberId, verified }: { memberId: string; verified: boolean }) =>
      verifyKycFn({ data: { memberId, verified } }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.verified
          ? lang === "sw"
            ? "Mwanachama amethibitishwa kikamilifu!"
            : "Member verified successfully!"
          : lang === "sw"
            ? "Uthibitisho umeondolewa."
            : "Verification revoked.",
      );
      setInspectKycMember(null);
      qc.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kubadilisha uthibitisho.");
    },
  });

  function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === "sw" ? "Picha isizidi 5MB." : "File must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelfDocPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  // 1. Loading State
  if (isLoading && !data) {
    return (
      <Screen>
        <p className="mt-10 text-center text-xl">{t("loading")}</p>
      </Screen>
    );
  }

  // 2. Chama Creation Wizard (User without Chama)
  if (!data?.member) {
    return (
      <Screen nav={false}>
        <div className="pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/nyumbani" })}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border text-foreground hover:bg-muted"
            >
              ←
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {lang === "sw" ? "Usajili wa Kiongozi" : "Leadership Setup"}
              </p>
              <h1 className="font-display text-2xl font-extrabold text-foreground">
                {lang === "sw" ? "Unda Chama Kipya" : "Create New Chama"}
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "sw"
              ? "Kama Mwenyekiti, sajili taarifa za msingi za kikundi chako. Utapata nambari ya siri ya kuwaalika wanachama wako wote papo hapo."
              : "As Chairperson, register your group fundamentals. You will receive an invite code to share with all members immediately."}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim().length < 3) {
                toast.error(lang === "sw" ? "Weka jina la chama." : "Enter chama name.");
                return;
              }
              if (newChairName.trim().length < 2) {
                toast.error(
                  lang === "sw"
                    ? "Weka jina lako kama mwenyekiti."
                    : "Enter your chairperson name.",
                );
                return;
              }
              handleCreateChama.mutate();
            }}
            className="mt-6 grid gap-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                {lang === "sw" ? "Jina la Chama *" : "Chama Name *"}
              </label>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newJoinCode) {
                    setNewJoinCode(
                      e.target.value
                        .replace(/[^A-Za-z0-9]/g, "")
                        .slice(0, 8)
                        .toUpperCase(),
                    );
                  }
                }}
                required
                placeholder="Mfano: Tumaini Women Group"
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                {lang === "sw" ? "Mchango wa Kila Mwezi (KSh) *" : "Monthly Contribution (KSh) *"}
              </label>
              <input
                value={newMonthly}
                onChange={(e) => setNewMonthly(Number(e.target.value))}
                type="number"
                min={50}
                step={50}
                required
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                {lang === "sw" ? "Siku ya Mkutano · Meeting Schedule" : "Meeting Schedule"}
              </label>
              <input
                value={newMeetingDay}
                onChange={(e) => setNewMeetingDay(e.target.value)}
                placeholder="Mfano: Jumapili ya kwanza ya mwezi"
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                {lang === "sw" ? "Nambari ya Siri ya Chama (Join Code) *" : "Chama Join Code *"}
              </label>
              <input
                value={newJoinCode}
                onChange={(e) => setNewJoinCode(e.target.value.toUpperCase().trim())}
                required
                maxLength={12}
                placeholder="TUMAINI"
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg font-mono font-bold tracking-widest uppercase"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === "sw"
                  ? "Wanachama watatumia nambari hii kujiunga na kikundi chako."
                  : "Members will use this code to join your chama."}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                {lang === "sw" ? "Taarifa Zako (Mwenyekiti)" : "Your Details (Chairperson)"}
              </p>
              <div className="mt-3 grid gap-3">
                <input
                  value={newChairName}
                  onChange={(e) => setNewChairName(e.target.value)}
                  required
                  placeholder={lang === "sw" ? "Jina lako kamili *" : "Your full name *"}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base"
                />
                <input
                  value={newChairPhone}
                  onChange={(e) => setNewChairPhone(e.target.value)}
                  type="tel"
                  placeholder={lang === "sw" ? "Nambari ya Simu (M-Pesa)" : "Phone number (M-Pesa)"}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={handleCreateChama.isPending}
              className="mt-2 w-full rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream shadow-md transition hover:opacity-95 disabled:opacity-50"
            >
              {handleCreateChama.isPending
                ? "Inasajili chama..."
                : lang === "sw"
                  ? "UNDA CHAMA SASA"
                  : "CREATE CHAMA NOW"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/jiunge" })}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {lang === "sw"
                ? "Unataka kujiunga badala ya kuunda? Bonyeza hapa →"
                : "Looking to join instead? Tap here →"}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // 3. Active Chama Management Hub
  const isChairperson = data.member.role === "chairperson";
  const isOfficial = ["chairperson", "treasurer", "secretary"].includes(data.member.role);
  const pendingList = (data.pendingRequests ?? []) as MemberRow[];
  const memberList = (data.members ?? []) as MemberRow[];
  const joinCode = data.chama?.joinCode || "";
  const chamaName = data.chama?.name || "Chama";

  // Share message
  const shareText =
    lang === "sw"
      ? `Habari! Jiunge na chama chetu cha "${chamaName}" kwenye Chama Mkononi. Nambari ya siri ya chama chetu ni: ${joinCode}. Bofya hapa kujiunga: ${window.location.origin}/jiunge?code=${joinCode}`
      : `Hello! Join our chama "${chamaName}" on Chama Mkononi. Our join code is: ${joinCode}. Tap here to join: ${window.location.origin}/jiunge?code=${joinCode}`;

  function copyCode() {
    navigator.clipboard.writeText(joinCode);
    toast.success(
      lang === "sw"
        ? `Nambari ya chama "${joinCode}" imenakiliwa!`
        : `Join code "${joinCode}" copied!`,
    );
  }

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  }

  function openSelfKyc() {
    setSelfIdType((data?.member?.id_type as any) || "national_id");
    setSelfIdNumber(data?.member?.id_number || "");
    setSelfDob(data?.member?.dob || "");
    setSelfSex((data?.member?.sex as any) || "female");
    setSelfDocPreview(data?.member?.id_document_url || null);
    setShowSelfKycModal(true);
  }

  return (
    <Screen>
      <PageHeader title={t("myChama")} subtitle={data.chama?.name} />

      {/* Invite & Join Code Banner */}
      <div className="mt-5 rounded-3xl border-2 border-brand/30 bg-brand/5 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              {lang === "sw" ? "Nambari ya Kujiunga" : "Invite Code"}
            </span>
            <p className="font-mono text-3xl font-black tracking-widest text-foreground">
              {joinCode}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground shadow-sm transition hover:bg-muted"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>{lang === "sw" ? "Nakili" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-1.002z" />
              </svg>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {lang === "sw" ? "Mchango wa kila mwezi ni " : "Monthly contribution is "}
          <strong className="text-foreground">{ksh(data.chama?.monthly ?? 0)}</strong>.{" "}
          {lang === "sw" ? "Kazi yako: " : "Your role: "}
          <strong className="text-brand">{roleWords[data.member.role]}</strong>
        </p>
      </div>

      {/* Member Self-Service KYC Card */}
      <div className="mt-5 rounded-3xl border border-card/80 bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {lang === "sw" ? "Uthibitisho wa Utambulisho (KYC)" : "Identity Verification (KYC)"}
            </span>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {data.member.name}
            </p>
            {data.member.id_number ? (
              <p className="text-xs text-muted-foreground">
                {idTypeNames[data.member.id_type || "national_id"]}:{" "}
                <span className="font-mono font-bold text-foreground">{data.member.id_number}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-medium">
                {lang === "sw"
                  ? "Bado hujaweka nambari ya kitambulisho."
                  : "National ID not yet submitted."}
              </p>
            )}
          </div>

          <div>
            {data.member.kyc_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {lang === "sw" ? "Imethibitishwa" : "Verified"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {lang === "sw" ? "Inasubiri" : "Pending"}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openSelfKyc}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 py-3 text-xs font-bold text-foreground transition hover:bg-muted/70"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span>
            {data.member.id_number
              ? lang === "sw"
                ? "Hariri Taarifa za Kitambulisho"
                : "Update ID Details"
              : lang === "sw"
                ? "Weka Nambari ya Kitambulisho (KYC)"
                : "Complete KYC Verification"}
          </span>
        </button>
      </div>

      {/* Pending Join Requests Queue (Chairperson & Officials) */}
      {isOfficial ? (
        <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-500"></span>
              <p className="font-display text-lg font-bold text-foreground">
                {lang === "sw" ? "Maombi ya Kujiunga" : "Pending Join Requests"}
              </p>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {pendingList.length}
            </span>
          </div>

          {pendingList.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {lang === "sw"
                ? "Hakuna maombi mapya yanayosubiri idhini kwa sasa."
                : "No pending join requests at this time."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {pendingList.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-base font-bold text-foreground">
                        {p.display_name}
                      </p>
                      {p.phone ? (
                        <p className="text-sm text-muted-foreground">📞 {p.phone}</p>
                      ) : null}
                      {p.id_number ? (
                        <p className="text-xs font-medium text-foreground">
                          ID: <span className="font-mono">{p.id_number}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Bila Kitambulisho</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={handleDecision.isPending}
                      onClick={() => handleDecision.mutate({ memberId: p.id, approve: true })}
                      className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-cream shadow-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {lang === "sw" ? "Kubali (Idhinisha)" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={handleDecision.isPending}
                      onClick={() => handleDecision.mutate({ memberId: p.id, approve: false })}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {lang === "sw" ? "Kataa" : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Member Roster & Role / KYC Management */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold text-foreground">
            {lang === "sw" ? "Wanachama Waliosajiliwa" : "Registered Members"}
          </p>
          <span className="text-xs font-bold text-muted-foreground">
            {memberList.length} {lang === "sw" ? "wanachama" : "members"}
          </span>
        </div>

        <div className="mt-3 grid gap-2.5">
          {memberList.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border border-card/80 bg-card p-4 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-bold text-foreground">
                    {m.display_name}
                  </p>
                  {m.id === data.member.id ? (
                    <span className="text-xs text-muted-foreground">
                      ({lang === "sw" ? "Wewe" : "You"})
                    </span>
                  ) : null}
                  {m.kyc_verified ? (
                    <span
                      title={lang === "sw" ? "Kitambulisho Kimethibitishwa" : "KYC Verified"}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]"
                    >
                      ✓
                    </span>
                  ) : null}
                </div>

                <p className="text-xs font-semibold text-brand">{roleWords[m.role]}</p>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {m.phone ? (
                    <a href={`tel:${m.phone}`} className="hover:underline">
                      📞 {m.phone}
                    </a>
                  ) : null}
                  {m.id_number ? (
                    <span>
                      • ID: <span className="font-mono">{m.id_number}</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      • {lang === "sw" ? "Bila ID" : "No ID"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isOfficial ? (
                  <button
                    type="button"
                    onClick={() => setInspectKycMember(m)}
                    className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    KYC
                  </button>
                ) : null}

                {isChairperson && m.id !== data.member.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRoleModalMember(m);
                      setSelectedRole(m.role);
                    }}
                    className="rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    {lang === "sw" ? "Cheo" : "Role"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Service KYC Modal */}
      {showSelfKycModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Utambulisho" : "Identification"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {lang === "sw" ? "Taarifa za Kitambulisho (KYC)" : "Member KYC Verification"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSelfKycModal(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Kulingana na miongozo ya vyama vya Kenya, taarifa za kitambulisho husaidia kulinda akiba na kuhakikisha usalama wa wanachama wote."
                : "According to Kenyan group regulations, ID details secure group funds and ensure member identity transparency."}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selfIdNumber.trim().length < 4) {
                  toast.error(
                    lang === "sw"
                      ? "Weka nambari sahihi ya kitambulisho."
                      : "Enter a valid ID number.",
                  );
                  return;
                }
                handleSaveSelfKyc.mutate();
              }}
              className="mt-5 grid gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Aina ya Kitambulisho *" : "Document Type *"}
                </label>
                <select
                  value={selfIdType}
                  onChange={(e) => setSelfIdType(e.target.value as any)}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base"
                >
                  <option value="national_id">Kitambulisho cha Taifa (National ID)</option>
                  <option value="passport">Pasi ya Kusafiria (Passport)</option>
                  <option value="alien_id">Kitambulisho cha Mgeni (Alien ID)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Nambari ya Kitambulisho *" : "ID / Document Number *"}
                </label>
                <input
                  value={selfIdNumber}
                  onChange={(e) => setSelfIdNumber(e.target.value)}
                  required
                  placeholder="Mfano: 28456789"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"}
                  </label>
                  <input
                    value={selfDob}
                    onChange={(e) => setSelfDob(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Jinsia" : "Gender / Sex"}
                  </label>
                  <select
                    value={selfSex}
                    onChange={(e) => setSelfSex(e.target.value as any)}
                    className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm"
                  >
                    <option value="female">{lang === "sw" ? "Mwanamke" : "Female"}</option>
                    <option value="male">{lang === "sw" ? "Mwanamume" : "Male"}</option>
                    <option value="other">{lang === "sw" ? "Nyingine" : "Other"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  {lang === "sw" ? "Picha ya Kitambulisho (Mbele)" : "ID Photo (Front Page)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDocumentUpload}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand hover:file:bg-brand/20"
                />
                {selfDocPreview ? (
                  <div className="mt-2 relative rounded-2xl overflow-hidden border border-border max-h-40">
                    <img
                      src={selfDocPreview}
                      alt="ID Preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setSelfDocPreview(null)}
                      className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
                    >
                      ✕ Ondoa
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSelfKycModal(false)}
                  className="flex-1 rounded-2xl border border-border py-3.5 text-xs font-bold text-muted-foreground"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={handleSaveSelfKyc.isPending}
                  className="flex-1 rounded-2xl bg-brand py-3.5 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {handleSaveSelfKyc.isPending
                    ? "Inahifadhi..."
                    : lang === "sw"
                      ? "Hifadhi Kitambulisho"
                      : "Save ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Leadership KYC Inspection Modal */}
      {inspectKycMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {lang === "sw" ? "Ukaguzi wa Kitambulisho" : "KYC Inspection"}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {inspectKycMember.display_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectKycMember(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-muted/30 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cheo / Role:</span>
                <span className="font-bold text-foreground">
                  {roleWords[inspectKycMember.role]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Simu / Phone:</span>
                <span className="font-bold text-foreground">{inspectKycMember.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aina ya ID / Type:</span>
                <span className="font-bold text-foreground">
                  {idTypeNames[inspectKycMember.id_type || "national_id"]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nambari ya ID:</span>
                <span className="font-mono font-bold text-foreground">
                  {inspectKycMember.id_number || "Bado haijawekwa"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarehe ya Kuzaliwa:</span>
                <span className="font-bold text-foreground">{inspectKycMember.dob || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jinsia / Sex:</span>
                <span className="font-bold text-foreground capitalize">
                  {inspectKycMember.sex || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-muted-foreground">Hali / Status:</span>
                <span
                  className={`font-bold ${inspectKycMember.kyc_verified ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {inspectKycMember.kyc_verified
                    ? "✓ Imethibitishwa (Verified)"
                    : "⚠️ Inasubiri Uthibitisho (Unverified)"}
                </span>
              </div>
            </div>

            {inspectKycMember.id_document_url ? (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground mb-1.5">
                  {lang === "sw" ? "Picha ya Kitambulisho:" : "ID Photo:"}
                </p>
                <div className="rounded-2xl border border-border overflow-hidden">
                  <img
                    src={inspectKycMember.id_document_url}
                    alt="ID Document"
                    className="w-full max-h-52 object-contain bg-black/5"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setInspectKycMember(null)}
                className="flex-1 rounded-2xl border border-border py-3 text-xs font-bold text-muted-foreground"
              >
                {lang === "sw" ? "Funga" : "Close"}
              </button>

              {inspectKycMember.kyc_verified ? (
                <button
                  type="button"
                  disabled={handleVerifyMember.isPending}
                  onClick={() =>
                    handleVerifyMember.mutate({
                      memberId: inspectKycMember.id,
                      verified: false,
                    })
                  }
                  className="flex-1 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {handleVerifyMember.isPending
                    ? "Inabatilisha..."
                    : lang === "sw"
                      ? "Ondoa Uthibitisho"
                      : "Revoke Verification"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={handleVerifyMember.isPending}
                  onClick={() =>
                    handleVerifyMember.mutate({
                      memberId: inspectKycMember.id,
                      verified: true,
                    })
                  }
                  className="flex-1 rounded-2xl bg-brand py-3 text-xs font-bold text-cream disabled:opacity-50"
                >
                  {handleVerifyMember.isPending
                    ? "Inathibitisha..."
                    : lang === "sw"
                      ? "Thibitisha Kitambulisho"
                      : "Verify Member"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Change Role Dialog/Modal */}
      {roleModalMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl border border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              {lang === "sw" ? "Usimamizi wa Cheo" : "Role Management"}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-foreground">
              {roleModalMember.display_name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "sw"
                ? "Chagua cheo kipya kwa ajili ya mwanachama huyu:"
                : "Select a new role for this member:"}
            </p>

            <div className="mt-4 grid gap-2">
              {(["member", "treasurer", "secretary", "chairperson"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-left transition ${
                    selectedRole === r
                      ? "bg-brand text-cream"
                      : "border border-border bg-card text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span>{roleWords[r]}</span>
                  {selectedRole === r ? <span>✓</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRoleModalMember(null)}
                className="flex-1 rounded-xl border border-border py-3 text-xs font-bold text-muted-foreground"
              >
                {lang === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={handleRoleChange.isPending}
                onClick={() => handleRoleChange.mutate()}
                className="flex-1 rounded-xl bg-brand py-3 text-xs font-bold text-cream"
              >
                {handleRoleChange.isPending
                  ? "Inasasisha..."
                  : lang === "sw"
                    ? "Hifadhi Cheo"
                    : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Trusted Helper Section */}
      <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
        <p className="font-display text-xl font-bold">
          {lang === "sw" ? "Msaidizi wa Kuaminika" : "Trusted Helper"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "sw"
            ? "Msaidizi anaweza kuona taarifa zako na kukusaidia kuandika. Hawezi kutoa pesa, kukubali mkopo, wala kubadilisha akaunti yako."
            : "A trusted helper can view records and assist you with entries. They cannot withdraw funds, approve loans, or alter your account."}
        </p>
        <div className="mt-3 grid gap-2">
          {(data.helpers ?? []).map((h: any) => {
            const person = memberList.find((m) => m.id === h.helper_member_id);
            return (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="text-base font-bold">{person?.display_name ?? "Msaidizi"}</span>
                <button
                  type="button"
                  onClick={() => dropHelper.mutate(h.id)}
                  className="text-xs font-bold text-destructive underline"
                >
                  {lang === "sw" ? "Ondoa" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2">
          {memberList
            .filter(
              (m) =>
                m.id !== data.member.id &&
                !(data.helpers ?? []).some((h: any) => h.helper_member_id === m.id),
            )
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addHelper.mutate(m.id)}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-muted/40"
              >
                +{" "}
                {lang === "sw"
                  ? `Mpe ${m.display_name} ruhusa ya kunisaidia`
                  : `Grant ${m.display_name} helper access`}
              </button>
            ))}
        </div>
      </div>

      {/* Broadcast Announcement (Chairperson/Officials) */}
      {isOfficial ? (
        <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
          <p className="font-display text-xl font-bold">
            {lang === "sw" ? "Tuma Tangazo Rasmi" : "Post Official Announcement"}
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base"
            placeholder={
              lang === "sw"
                ? "Habari wanachama! Kumbukumbu ya mkutano..."
                : "Notice to all members regarding upcoming meeting..."
            }
          />
          <button
            type="button"
            disabled={message.length < 3 || announce.isPending}
            onClick={() => announce.mutate()}
            className="mt-3 w-full rounded-2xl bg-brand py-4 font-display text-base font-extrabold text-cream disabled:opacity-50"
          >
            {announce.isPending
              ? "Inatuma..."
              : lang === "sw"
                ? "TUMA TANGAZO KWA WOTE"
                : "BROADCAST ANNOUNCEMENT"}
          </button>
        </div>
      ) : null}

      {/* Sign Out */}
      <div className="mt-8 mb-6">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-2xl border border-destructive/30 bg-destructive/10 py-4 font-display text-base font-bold text-destructive transition hover:bg-destructive/20"
        >
          {lang === "sw" ? "Toka kwenye akaunti · Sign out" : "Sign out"}
        </button>
      </div>
    </Screen>
  );
}
