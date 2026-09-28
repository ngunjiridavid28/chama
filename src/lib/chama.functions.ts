import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * All chama business logic lives here, on the server.
 * Balances and loan figures are always calculated from stored records —
 * never stored as a hard-coded number, never trusted from the client.
 */

const OFFICIALS = ["chairperson", "treasurer"] as const;

type Sb = { from: (t: string) => any };

async function currentMember(sb: Sb, userId: string) {
  const { data, error } = await sb
    .from("chama_members")
    .select(
      "id, chama_id, display_name, phone, role, status, id_number, id_type, dob, sex, id_document_url, kyc_verified, chamas(id, name, monthly_contribution, join_code)",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as null | {
    id: string;
    chama_id: string;
    display_name: string;
    phone: string | null;
    role: "chairperson" | "treasurer" | "secretary" | "member";
    status?: "pending" | "approved" | "rejected";
    id_number?: string | null;
    id_type?: string | null;
    dob?: string | null;
    sex?: string | null;
    id_document_url?: string | null;
    kyc_verified?: boolean;
    chamas: { id: string; name: string; monthly_contribution: number; join_code: string };
  };
}

function period(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sum(rows: { amount: number | string }[]) {
  return rows.reduce((a, r) => a + Number(r.amount), 0);
}

function authCtx(context: unknown): { sb: Sb; userId: string } {
  const ctx = context as { supabase?: Sb; userId?: string } | undefined;
  if (!ctx?.supabase || !ctx?.userId) {
    throw new Error("unauthorized");
  }
  return { sb: ctx.supabase, userId: ctx.userId };
}

/* ------------------------------------------------------------------ */
/* Membership                                                          */
/* ------------------------------------------------------------------ */

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const m = await currentMember(sb, userId);
    const state: "NO_CHAMA" | "PENDING_CHAMA" | "APPROVED_MEMBER" = !m
      ? "NO_CHAMA"
      : m.status === "pending"
        ? "PENDING_CHAMA"
        : "APPROVED_MEMBER";
    return { member: m, state };
  });

/** Names in a chama that nobody has claimed yet — used when joining. */
export const listOpenSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: chama } = await supabaseAdmin
      .from("chamas")
      .select("id, name")
      .eq("join_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (!chama) return { chama: null, slots: [] };
    const { data: slots } = await supabaseAdmin
      .from("chama_members")
      .select("id, display_name, role")
      .eq("chama_id", chama.id)
      .is("user_id", null)
      .order("display_name");
    return { chama, slots: slots ?? [] };
  });

export const claimSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await currentMember(sb, userId);
    if (existing) throw new Error("already_member");
    const { data: row, error } = await supabaseAdmin
      .from("chama_members")
      .update({ user_id: userId, status: "approved" })
      .eq("id", data.memberId)
      .is("user_id", null)
      .select("id, chama_id, display_name")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("slot_taken");
    await supabaseAdmin.from("audit_logs").insert({
      chama_id: row.chama_id,
      actor_id: userId,
      action: "JOIN",
      entity: "chama_members",
      entity_id: row.id,
      details: { display_name: row.display_name },
    });
    return { ok: true };
  });

export const createChama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(3).max(80),
        monthlyContribution: z.number().positive(),
        meetingDay: z.string().optional(),
        customJoinCode: z.string().min(3).max(12).optional(),
        chairpersonName: z.string().min(2).max(60),
        chairpersonPhone: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await currentMember(sb, userId);
    if (existing && existing.status === "approved") {
      throw new Error("already_member");
    }

    // Generate or clean join code
    let joinCode = data.customJoinCode
      ? data.customJoinCode
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
      : data.name
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 6)
          .toUpperCase();
    if (!joinCode || joinCode.length < 3) {
      joinCode = `CHAMA${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 1. Insert Chama
    const { data: chamaRow, error: chamaErr } = await supabaseAdmin
      .from("chamas")
      .insert({
        name: data.name.trim(),
        monthly_contribution: data.monthlyContribution,
        join_code: joinCode,
        currency: "KES",
        meeting_day: data.meetingDay || "Jumapili ya kwanza ya mwezi",
        created_by: userId,
      })
      .select("id, name, join_code, monthly_contribution")
      .single();

    if (chamaErr) throw new Error(chamaErr.message);

    // 2. Insert Chairperson as First Member (Approved)
    const { data: memberRow, error: memberErr } = await supabaseAdmin
      .from("chama_members")
      .insert({
        chama_id: chamaRow.id,
        user_id: userId,
        display_name: data.chairpersonName.trim(),
        phone: data.chairpersonPhone?.trim() || null,
        role: "chairperson",
        status: "approved",
      })
      .select("id, role, display_name")
      .single();

    if (memberErr) throw new Error(memberErr.message);

    // 3. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      chama_id: chamaRow.id,
      actor_id: userId,
      action: "CREATE_CHAMA",
      entity: "chamas",
      entity_id: chamaRow.id,
      details: { name: chamaRow.name, join_code: chamaRow.join_code },
    });

    return { chama: chamaRow, member: memberRow };
  });

export const requestToJoinChama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        code: z.string().min(3),
        displayName: z.string().min(2).max(60),
        phone: z.string().optional(),
        idNumber: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up chama
    const { data: chama, error: findErr } = await supabaseAdmin
      .from("chamas")
      .select("id, name, join_code")
      .eq("join_code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (findErr) throw new Error(findErr.message);
    if (!chama) throw new Error("chama_not_found");

    // Check if user already has an active membership or pending request
    const existing = await currentMember(sb, userId);
    if (existing) {
      if (existing.status === "approved") throw new Error("already_approved_member");
      if (existing.status === "pending") throw new Error("already_pending");
    }

    // Insert pending member
    const { data: memberRow, error: insertErr } = await supabaseAdmin
      .from("chama_members")
      .insert({
        chama_id: chama.id,
        user_id: userId,
        display_name: data.displayName.trim(),
        phone: data.phone?.trim() || null,
        id_number: data.idNumber?.trim() || null,
        role: "member",
        status: "pending",
      })
      .select("id, status, display_name")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      chama_id: chama.id,
      actor_id: userId,
      action: "REQUEST_JOIN",
      entity: "chama_members",
      entity_id: memberRow.id,
      details: { display_name: memberRow.display_name },
    });

    return { ok: true, chamaName: chama.name };
  });

/* ------------------------------------------------------------------ */
/* Home screen                                                         */
/* ------------------------------------------------------------------ */

export const getHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || me.status === "pending") {
      return { member: null, isPending: me?.status === "pending" } as const;
    }

    const today = new Date().toISOString().slice(0, 10);
    const [ledger, mine, loans, repayments, meeting, announcement] = await Promise.all([
      sb.from("ledger_entries").select("kind, amount").eq("chama_id", me.chama_id),
      sb
        .from("contributions")
        .select("amount, status")
        .eq("member_id", me.id)
        .eq("period", period())
        .eq("status", "confirmed"),
      sb.from("loans").select("id, amount, status").eq("member_id", me.id).eq("status", "approved"),
      sb.from("loan_repayments").select("amount, loan_id").eq("chama_id", me.chama_id),
      sb
        .from("meetings")
        .select("id, title, meet_on, meet_at, location, agenda")
        .eq("chama_id", me.chama_id)
        .gte("meet_on", today)
        .order("meet_on")
        .limit(1)
        .maybeSingle(),
      sb
        .from("announcements")
        .select("message, created_at")
        .eq("chama_id", me.chama_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const entries = (ledger.data ?? []) as { kind: "in" | "out"; amount: number }[];
    const balance =
      sum(entries.filter((e) => e.kind === "in")) - sum(entries.filter((e) => e.kind === "out"));

    const required = Number(me.chamas.monthly_contribution);
    const paid = sum((mine.data ?? []) as { amount: number }[]);

    const myLoans = (loans.data ?? []) as { id: string; amount: number }[];
    const paidPerLoan = ((repayments.data ?? []) as { amount: number; loan_id: string }[]).filter(
      (r) => myLoans.some((l) => l.id === r.loan_id),
    );
    const loanTotal = sum(myLoans);
    const loanPaid = sum(paidPerLoan);

    let myRsvp: string | null = null;
    if (meeting.data) {
      const { data: rsvp } = await sb
        .from("meeting_attendance")
        .select("response")
        .eq("meeting_id", meeting.data.id)
        .eq("member_id", me.id)
        .maybeSingle();
      myRsvp = rsvp?.response ?? null;
    }

    return {
      member: { id: me.id, name: me.display_name, role: me.role },
      chama: { id: me.chama_id, name: me.chamas.name, joinCode: me.chamas.join_code },
      balance,
      month: { required, paid, remaining: Math.max(required - paid, 0), period: period() },
      loan: { total: loanTotal, paid: loanPaid, remaining: Math.max(loanTotal - loanPaid, 0) },
      meeting: meeting.data ?? null,
      myRsvp,
      announcement: announcement.data ?? null,
    } as const;
  });

/* ------------------------------------------------------------------ */
/* Contributions + chama book                                          */
/* ------------------------------------------------------------------ */

export const getContributions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) return { member: null, rows: [], mine: [], pendingQueue: [], members: [] } as const;

    const isOfficial = (OFFICIALS as readonly string[]).includes(me.role);

    const [contribRes, membersRes] = await Promise.all([
      sb
        .from("contributions")
        .select(
          "id, amount, period, status, method, paid_on, member_id, mpesa_reference, phone_number, confirmed_by, chama_members(display_name)",
        )
        .eq("chama_id", me.chama_id)
        .order("paid_on", { ascending: false })
        .limit(150),
      sb
        .from("chama_members")
        .select("id, display_name, phone, role")
        .eq("chama_id", me.chama_id)
        .neq("status", "pending")
        .order("display_name"),
    ]);

    const rows = (contribRes.data ?? []) as any[];
    const members = (membersRes.data ?? []) as any[];

    return {
      member: { id: me.id, role: me.role, name: me.display_name },
      chama: { name: me.chamas.name, monthly: Number(me.chamas.monthly_contribution) },
      monthly: Number(me.chamas.monthly_contribution),
      rows,
      mine: rows.filter((r) => r.member_id === me.id),
      pendingQueue: isOfficial ? rows.filter((r) => r.status === "pending") : [],
      members,
    } as const;
  });

export const recordContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        memberId: z.string().uuid().optional(),
        method: z.enum(["mpesa", "cash", "bank"]).default("mpesa"),
        mpesaReference: z.string().optional(),
        phoneNumber: z.string().optional(),
        period: z.string().optional(),
        kind: z.string().default("monthly"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) throw new Error("not_a_member");

    const forOther = data.memberId && data.memberId !== me.id;
    const isOfficial = (OFFICIALS as readonly string[]).includes(me.role);
    if (forOther && !isOfficial) throw new Error("not_allowed");

    const targetMemberId = data.memberId ?? me.id;

    // Fetch target member's name for receipt and ledger audit
    const { data: targetMember } = await sb
      .from("chama_members")
      .select("display_name")
      .eq("id", targetMemberId)
      .maybeSingle();

    const targetName = targetMember?.display_name || me.display_name;

    // Format & validate M-Pesa reference if provided
    let cleanRef: string | null = null;
    if (data.mpesaReference && data.mpesaReference.trim()) {
      cleanRef = data.mpesaReference.trim().toUpperCase();
      // Check duplicate reference in the chama to prevent double-crediting
      const { data: existingRef } = await sb
        .from("contributions")
        .select("id, mpesa_reference")
        .eq("chama_id", me.chama_id)
        .eq("mpesa_reference", cleanRef)
        .maybeSingle();

      if (existingRef) {
        throw new Error("duplicate_mpesa_reference");
      }
    }

    // An official recording directly in the chama book confirms immediately.
    // A regular member paying for themselves is marked 'pending' for treasurer review.
    const status = isOfficial ? "confirmed" : "pending";
    const contributionPeriod = data.period || period();

    const { data: row, error } = await sb
      .from("contributions")
      .insert({
        chama_id: me.chama_id,
        member_id: targetMemberId,
        amount: data.amount,
        period: contributionPeriod,
        kind: data.kind,
        method: data.method,
        mpesa_reference: cleanRef,
        phone_number: data.phoneNumber?.trim() || null,
        status,
        recorded_by: userId,
        confirmed_by: status === "confirmed" ? userId : null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // If confirmed immediately, write into ledger_entries (double-entry accounting)
    if (status === "confirmed") {
      const description = `Mchango - ${targetName} (${cleanRef ? `M-Pesa: ${cleanRef}` : data.method})`;
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "in",
        category: "michango",
        amount: data.amount,
        description,
        recorded_by: userId,
        approved_by: userId,
        source_table: "contributions",
        source_id: row.id,
      });
    }

    // Audit log
    await sb.from("audit_logs").insert({
      chama_id: me.chama_id,
      actor_id: userId,
      action: "RECORD_CONTRIBUTION",
      entity: "contributions",
      entity_id: row.id,
      details: {
        amount: data.amount,
        method: data.method,
        period: contributionPeriod,
        mpesa_reference: cleanRef,
        status,
      },
    });

    return {
      ok: true,
      status,
      id: row.id,
      amount: data.amount,
      period: contributionPeriod,
      ref: cleanRef,
      memberName: targetName,
    };
  });

export const confirmContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");

    const { data: row, error } = await sb
      .from("contributions")
      .update({ status: data.accept ? "confirmed" : "rejected", confirmed_by: userId })
      .eq("id", data.id)
      .eq("chama_id", me.chama_id)
      .select("id, amount, member_id, method, mpesa_reference, chama_members(display_name)")
      .single();

    if (error) throw new Error(error.message);

    const memberName = (row as any)?.chama_members?.display_name || "Mwanachama";

    if (data.accept) {
      // Reconcile into double-entry ledger
      const refDetail = row.mpesa_reference ? `M-Pesa: ${row.mpesa_reference}` : row.method;
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "in",
        category: "michango",
        amount: row.amount,
        description: `Mchango umethibitishwa - ${memberName} (${refDetail})`,
        recorded_by: userId,
        approved_by: userId,
        source_table: "contributions",
        source_id: row.id,
      });

      await sb.from("audit_logs").insert({
        chama_id: me.chama_id,
        actor_id: userId,
        action: "CONFIRM_CONTRIBUTION",
        entity: "contributions",
        entity_id: row.id,
        details: { amount: row.amount, member: memberName, reference: row.mpesa_reference },
      });
    } else {
      await sb.from("audit_logs").insert({
        chama_id: me.chama_id,
        actor_id: userId,
        action: "REJECT_CONTRIBUTION",
        entity: "contributions",
        entity_id: row.id,
        details: { amount: row.amount, member: memberName },
      });
    }

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

export const getLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) return { member: null, loans: [] } as const;
    const [{ data: loans }, { data: reps }] = await Promise.all([
      sb
        .from("loans")
        .select(
          "id, amount, reason, status, due_date, requested_at, member_id, chama_members(display_name)",
        )
        .eq("chama_id", me.chama_id)
        .order("requested_at", { ascending: false }),
      sb.from("loan_repayments").select("loan_id, amount, paid_on").eq("chama_id", me.chama_id),
    ]);
    const repayments = (reps ?? []) as { loan_id: string; amount: number }[];
    const withTotals = ((loans ?? []) as any[]).map((l) => {
      const paid = sum(repayments.filter((r) => r.loan_id === l.id));
      return {
        ...l,
        paid,
        remaining: Math.max(Number(l.amount) - paid, 0),
        mine: l.member_id === me.id,
      };
    });
    return { member: { id: me.id, role: me.role }, loans: withTotals } as const;
  });

export const requestLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        reason: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) throw new Error("not_a_member");
    const { error } = await sb.from("loans").insert({
      chama_id: me.chama_id,
      member_id: me.id,
      amount: data.amount,
      reason: data.reason ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ id: z.string().uuid(), approve: z.boolean(), dueDate: z.string().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");
    const { data: row, error } = await sb
      .from("loans")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_by: userId,
        decided_at: new Date().toISOString(),
        due_date: data.approve ? (data.dueDate ?? null) : null,
      })
      .eq("id", data.id)
      .select("id, amount")
      .single();
    if (error) throw new Error(error.message);
    if (data.approve) {
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "out",
        category: "mkopo",
        amount: row.amount,
        description: "Mkopo umetolewa",
        recorded_by: userId,
        approved_by: userId,
        source_table: "loans",
        source_id: row.id,
      });
    }
    return { ok: true };
  });

export const recordRepayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ loanId: z.string().uuid(), amount: z.number().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");
    const { data: row, error } = await sb
      .from("loan_repayments")
      .insert({
        loan_id: data.loanId,
        chama_id: me.chama_id,
        amount: data.amount,
        recorded_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("ledger_entries").insert({
      chama_id: me.chama_id,
      kind: "in",
      category: "marejesho",
      amount: data.amount,
      description: "Marejesho ya mkopo",
      recorded_by: userId,
      approved_by: userId,
      source_table: "loan_repayments",
      source_id: row.id,
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Meetings                                                            */
/* ------------------------------------------------------------------ */

export const getMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) return { member: null, meetings: [] } as const;
    const { data } = await sb
      .from("meetings")
      .select("id, title, meet_on, meet_at, location, agenda, minutes")
      .eq("chama_id", me.chama_id)
      .order("meet_on", { ascending: false })
      .limit(30);
    const { data: rsvps } = await sb
      .from("meeting_attendance")
      .select("meeting_id, member_id, response, chama_members(display_name)")
      .eq("chama_id", me.chama_id);
    return {
      member: { id: me.id, role: me.role },
      meetings: (data ?? []) as any[],
      rsvps: (rsvps ?? []) as any[],
    } as const;
  });

export const saveRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ meetingId: z.string().uuid(), response: z.enum(["coming", "not_coming"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) throw new Error("not_a_member");
    const { data: existing } = await sb
      .from("meeting_attendance")
      .select("id")
      .eq("meeting_id", data.meetingId)
      .eq("member_id", me.id)
      .maybeSingle();
    if (existing) {
      await sb
        .from("meeting_attendance")
        .update({ response: data.response, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await sb.from("meeting_attendance").insert({
        meeting_id: data.meetingId,
        member_id: me.id,
        chama_id: me.chama_id,
        response: data.response,
      });
    }
    return { ok: true };
  });

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(2).max(120),
        meetOn: z.string(),
        meetAt: z.string().default("17:00"),
        location: z.string().min(2).max(160),
        agenda: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !["secretary", "chairperson"].includes(me.role)) throw new Error("not_allowed");
    const { error } = await sb.from("meetings").insert({
      chama_id: me.chama_id,
      title: data.title,
      meet_on: data.meetOn,
      meet_at: data.meetAt,
      location: data.location,
      agenda: data.agenda ?? null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMinutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ meetingId: z.string().uuid(), minutes: z.string().max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !["secretary", "chairperson"].includes(me.role)) throw new Error("not_allowed");
    const { error } = await sb
      .from("meetings")
      .update({ minutes: data.minutes })
      .eq("id", data.meetingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Money transparency + members                                        */
/* ------------------------------------------------------------------ */

export const getMoney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) return { member: null, entries: [] } as const;
    const { data } = await sb
      .from("ledger_entries")
      .select("id, kind, category, amount, description, occurred_on, recorded_by, approved_by")
      .eq("chama_id", me.chama_id)
      .order("occurred_on", { ascending: false })
      .limit(100);
    const entries = ((data ?? []) as any[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    const totals = {
      in: sum(entries.filter((e) => e.kind === "in")),
      out: sum(entries.filter((e) => e.kind === "out")),
      loans: sum(entries.filter((e) => e.category === "mkopo")),
      repayments: sum(entries.filter((e) => e.category === "marejesho")),
    };
    const { data: names } = await sb
      .from("chama_members")
      .select("user_id, display_name")
      .eq("chama_id", me.chama_id);
    return {
      member: { id: me.id, role: me.role },
      entries,
      totals: { ...totals, balance: totals.in - totals.out },
      names: (names ?? []) as { user_id: string | null; display_name: string }[],
    } as const;
  });

export const getMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) return { member: null, members: [], pendingRequests: [] } as const;

    const isOfficial = (OFFICIALS as readonly string[]).includes(me.role);

    const [membersRes, helpersRes, pendingRes] = await Promise.all([
      sb
        .from("chama_members")
        .select(
          "id, display_name, phone, role, user_id, status, id_number, id_type, dob, sex, id_document_url, kyc_verified, kyc_verified_at",
        )
        .eq("chama_id", me.chama_id)
        .neq("status", "pending")
        .order("role"),
      sb.from("trusted_helpers").select("*").eq("member_id", me.id),
      isOfficial
        ? sb
            .from("chama_members")
            .select(
              "id, display_name, phone, role, id_number, id_type, dob, sex, id_document_url, status, joined_at, kyc_verified",
            )
            .eq("chama_id", me.chama_id)
            .eq("status", "pending")
        : Promise.resolve({ data: [] }),
    ]);

    return {
      member: {
        id: me.id,
        role: me.role,
        name: me.display_name,
        phone: me.phone,
        id_number: me.id_number,
        id_type: me.id_type,
        dob: me.dob,
        sex: me.sex,
        id_document_url: me.id_document_url,
        kyc_verified: me.kyc_verified ?? false,
      },
      chama: {
        id: me.chamas.id,
        name: me.chamas.name,
        joinCode: me.chamas.join_code,
        monthly: Number(me.chamas.monthly_contribution),
      },
      members: (membersRes.data ?? []) as any[],
      helpers: (helpersRes.data ?? []) as any[],
      pendingRequests: (pendingRes.data ?? []) as any[],
    } as const;
  });

export const submitMemberKYC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idNumber: z.string().min(4).max(20),
        idType: z.enum(["national_id", "passport", "alien_id"]).default("national_id"),
        dob: z.string().optional(),
        sex: z.enum(["female", "male", "other"]).optional(),
        idDocumentUrl: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) throw new Error("not_a_member");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("chama_members")
      .update({
        id_number: data.idNumber.trim(),
        id_type: data.idType,
        dob: data.dob || null,
        sex: data.sex || null,
        id_document_url: data.idDocumentUrl || null,
      })
      .eq("id", me.id)
      .select("id, id_number, kyc_verified")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      chama_id: me.chama_id,
      actor_id: userId,
      action: "SUBMIT_KYC",
      entity: "chama_members",
      entity_id: me.id,
      details: { id_number: data.idNumber, id_type: data.idType },
    });

    return { ok: true, member: updated };
  });

export const verifyMemberKYC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        memberId: z.string().uuid(),
        verified: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) {
      throw new Error("officials_only");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from("chama_members")
      .update({
        kyc_verified: data.verified,
        kyc_verified_at: data.verified ? now : null,
        kyc_verified_by: data.verified ? userId : null,
      })
      .eq("id", data.memberId)
      .eq("chama_id", me.chama_id)
      .select("id, display_name, kyc_verified")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      chama_id: me.chama_id,
      actor_id: userId,
      action: data.verified ? "VERIFY_KYC" : "REVOKE_KYC",
      entity: "chama_members",
      entity_id: data.memberId,
      details: { display_name: updated?.display_name, verified: data.verified },
    });

    return { ok: true };
  });

export const decideMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.approve) {
      const { data: updated, error } = await supabaseAdmin
        .from("chama_members")
        .update({ status: "approved" })
        .eq("id", data.memberId)
        .eq("chama_id", me.chama_id)
        .select("id, display_name")
        .single();
      if (error) throw new Error(error.message);

      await supabaseAdmin.from("audit_logs").insert({
        chama_id: me.chama_id,
        actor_id: userId,
        action: "APPROVE_MEMBER",
        entity: "chama_members",
        entity_id: data.memberId,
        details: { display_name: updated?.display_name },
      });
    } else {
      const { error } = await supabaseAdmin
        .from("chama_members")
        .delete()
        .eq("id", data.memberId)
        .eq("chama_id", me.chama_id);
      if (error) throw new Error(error.message);

      await supabaseAdmin.from("audit_logs").insert({
        chama_id: me.chama_id,
        actor_id: userId,
        action: "REJECT_MEMBER",
        entity: "chama_members",
        entity_id: data.memberId,
      });
    }

    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        memberId: z.string().uuid(),
        role: z.enum(["chairperson", "treasurer", "secretary", "member"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || me.role !== "chairperson") throw new Error("chairperson_only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("chama_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("chama_id", me.chama_id)
      .select("id, display_name, role")
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      chama_id: me.chama_id,
      actor_id: userId,
      action: "UPDATE_ROLE",
      entity: "chama_members",
      entity_id: data.memberId,
      details: { display_name: updated?.display_name, new_role: data.role },
    });

    return { ok: true };
  });

export const setTrustedHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ helperMemberId: z.string().uuid(), canRecord: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me) throw new Error("not_a_member");
    if (data.helperMemberId === me.id) throw new Error("cannot_help_self");
    // A helper may look and may write things down. A helper can never approve
    // loans, move money out, or change who owns the account.
    const { error } = await sb.from("trusted_helpers").insert({
      member_id: me.id,
      helper_member_id: data.helperMemberId,
      can_view: true,
      can_record: data.canRecord,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTrustedHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const { error } = await sb.from("trusted_helpers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, userId };
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ message: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const { sb, userId } = authCtx(context);
    const me = await currentMember(sb, userId);
    if (!me || me.role === "member") throw new Error("not_allowed");
    const { error } = await sb
      .from("announcements")
      .insert({ chama_id: me.chama_id, message: data.message, created_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
