import fs from "node:fs";
import path from "node:path";

export interface MockChama {
  id: string;
  name: string;
  join_code: string;
  monthly_contribution: number;
  currency: string;
  meeting_day?: string;
  created_by?: string | null;
  created_at: string;
}

export interface MockMember {
  id: string;
  chama_id: string;
  user_id: string | null;
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
  kyc_verified_at?: string | null;
  kyc_verified_by?: string | null;
  joined_at: string;
}

export interface MockContribution {
  id: string;
  chama_id: string;
  member_id: string;
  amount: number;
  period: string;
  status: "pending" | "confirmed" | "rejected";
  method: string;
  kind?: string;
  paid_on: string;
  recorded_by?: string | null;
  confirmed_by?: string | null;
  mpesa_reference?: string | null;
  phone_number?: string | null;
}

export interface MockLedgerEntry {
  id: string;
  chama_id: string;
  kind: "in" | "out";
  category: string;
  amount: number;
  description: string;
  occurred_on: string;
  recorded_by?: string | null;
  approved_by?: string | null;
  source_table?: string | null;
  source_id?: string | null;
}

export interface MockLoan {
  id: string;
  chama_id: string;
  member_id: string;
  amount: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "repaid";
  due_date: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  requested_at: string;
}

export interface MockRepayment {
  id: string;
  loan_id: string;
  chama_id: string;
  amount: number;
  paid_on: string;
  recorded_by?: string | null;
}

export interface MockMeeting {
  id: string;
  chama_id: string;
  title: string;
  meet_on: string;
  meet_at: string;
  location: string;
  agenda: string | null;
  minutes: string | null;
  created_by?: string | null;
}

export interface MockAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  chama_id: string;
  response: "coming" | "not_coming";
  updated_at?: string;
}

export interface MockAnnouncement {
  id: string;
  chama_id: string;
  message: string;
  created_at: string;
  created_by?: string | null;
}

export interface MockAuditLog {
  id: string;
  chama_id: string | null;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: unknown;
  created_at: string;
}

export interface MockHelper {
  id: string;
  member_id: string;
  helper_member_id: string;
  can_view: boolean;
  can_record: boolean;
  created_at: string;
}

export interface MockProfile {
  id: string;
  full_name: string;
  phone: string | null;
  language: string;
  created_at: string;
}

export interface MockDataStore {
  chamas: MockChama[];
  chama_members: MockMember[];
  contributions: MockContribution[];
  ledger_entries: MockLedgerEntry[];
  loans: MockLoan[];
  loan_repayments: MockRepayment[];
  meetings: MockMeeting[];
  meeting_attendance: MockAttendance[];
  announcements: MockAnnouncement[];
  audit_logs: MockAuditLog[];
  trusted_helpers: MockHelper[];
  profiles: MockProfile[];
}

function getInitialData(): MockDataStore {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    chamas: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Tupendane Women Group",
        join_code: "TUPENDANE",
        monthly_contribution: 500,
        currency: "KSh",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    chama_members: [
      {
        id: "21111111-1111-1111-1111-111111111111",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-mama-wanjiku",
        display_name: "Mama Wanjiku",
        phone: "0722000001",
        role: "chairperson",
        status: "approved",
        id_number: "22345678",
        id_type: "national_id",
        dob: "1982-05-14",
        sex: "female",
        kyc_verified: true,
        kyc_verified_at: "2026-01-02T10:00:00Z",
        joined_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-mama-akinyi",
        display_name: "Mama Akinyi",
        phone: "0722000002",
        role: "treasurer",
        status: "approved",
        id_number: "24890123",
        id_type: "national_id",
        dob: "1985-09-22",
        sex: "female",
        kyc_verified: true,
        kyc_verified_at: "2026-01-02T10:30:00Z",
        joined_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "23333333-3333-3333-3333-333333333333",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-mama-njeri",
        display_name: "Mama Njeri",
        phone: "0722000003",
        role: "secretary",
        status: "approved",
        id_number: "26781290",
        id_type: "national_id",
        dob: "1988-12-03",
        sex: "female",
        kyc_verified: true,
        kyc_verified_at: "2026-01-02T11:00:00Z",
        joined_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "24444444-4444-4444-4444-444444444444",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-mama-wambui",
        display_name: "Mama Wambui",
        phone: "0722000004",
        role: "member",
        status: "approved",
        id_number: "29102938",
        id_type: "national_id",
        dob: "1990-03-18",
        sex: "female",
        kyc_verified: false,
        joined_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "25555555-5555-5555-5555-555555555555",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: null,
        display_name: "Mama Atieno",
        phone: "0722000005",
        role: "member",
        status: "approved",
        id_number: null,
        kyc_verified: false,
        joined_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "26666666-6666-6666-6666-666666666666",
        chama_id: "11111111-1111-1111-1111-111111111111",
        user_id: null,
        display_name: "Asha Bakari",
        phone: "0722000006",
        role: "member",
        status: "approved",
        id_number: null,
        kyc_verified: false,
        joined_at: "2026-01-01T00:00:00Z",
      },
    ],
    contributions: [
      {
        id: "c1",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "21111111-1111-1111-1111-111111111111",
        amount: 500,
        period: currentPeriod,
        status: "confirmed",
        method: "mpesa_mock",
        paid_on: todayStr,
      },
      {
        id: "c2",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "22222222-2222-2222-2222-222222222222",
        amount: 500,
        period: currentPeriod,
        status: "confirmed",
        method: "cash",
        paid_on: todayStr,
      },
      {
        id: "c3",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "23333333-3333-3333-3333-333333333333",
        amount: 500,
        period: currentPeriod,
        status: "confirmed",
        method: "mpesa_mock",
        paid_on: todayStr,
      },
      {
        id: "c4",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "24444444-4444-4444-4444-444444444444",
        amount: 300,
        period: currentPeriod,
        status: "confirmed",
        method: "cash",
        paid_on: todayStr,
      },
    ],
    ledger_entries: [
      {
        id: "l1",
        chama_id: "11111111-1111-1111-1111-111111111111",
        kind: "in",
        category: "michango",
        amount: 86500,
        description: "Michango ya miezi iliyopita",
        occurred_on: "2026-06-30",
      },
      {
        id: "l2",
        chama_id: "11111111-1111-1111-1111-111111111111",
        kind: "in",
        category: "michango",
        amount: 1800,
        description: "Michango ya sasa",
        occurred_on: todayStr,
      },
      {
        id: "l3",
        chama_id: "11111111-1111-1111-1111-111111111111",
        kind: "out",
        category: "mkopo",
        amount: 20000,
        description: "Mkopo kwa Mama Wambui",
        occurred_on: "2026-07-20",
      },
      {
        id: "l4",
        chama_id: "11111111-1111-1111-1111-111111111111",
        kind: "in",
        category: "marejesho",
        amount: 5000,
        description: "Marejesho ya mkopo - Mama Wambui",
        occurred_on: "2026-08-20",
      },
    ],
    loans: [
      {
        id: "31111111-1111-1111-1111-111111111111",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "24444444-4444-4444-4444-444444444444",
        amount: 20000,
        reason: "Biashara ya mboga",
        status: "approved",
        due_date: "2026-12-20",
        decided_at: "2026-07-20",
        requested_at: "2026-07-15",
      },
      {
        id: "32222222-2222-2222-2222-222222222222",
        chama_id: "11111111-1111-1111-1111-111111111111",
        member_id: "21111111-1111-1111-1111-111111111111",
        amount: 10000,
        reason: "Karo ya shule",
        status: "pending",
        due_date: null,
        decided_at: null,
        requested_at: todayStr,
      },
    ],
    loan_repayments: [
      {
        id: "lr1",
        loan_id: "31111111-1111-1111-1111-111111111111",
        chama_id: "11111111-1111-1111-1111-111111111111",
        amount: 5000,
        paid_on: "2026-08-20",
      },
    ],
    meetings: [
      {
        id: "41111111-1111-1111-1111-111111111111",
        chama_id: "11111111-1111-1111-1111-111111111111",
        title: "Mkutano wa mwezi huu",
        meet_on: "2026-10-14",
        meet_at: "17:00",
        location: "Nyumbani kwa Mama Njeri",
        agenda: "Michango ya mwezi, mikopo, na mradi wa maji",
        minutes: null,
      },
    ],
    meeting_attendance: [
      {
        id: "ma1",
        meeting_id: "41111111-1111-1111-1111-111111111111",
        member_id: "21111111-1111-1111-1111-111111111111",
        chama_id: "11111111-1111-1111-1111-111111111111",
        response: "coming",
      },
    ],
    announcements: [
      {
        id: "a1",
        chama_id: "11111111-1111-1111-1111-111111111111",
        message:
          "Mikopo ya mwezi huu itafunguliwa tarehe 20. Tafadhali lipa michango kabla ya Jumapili.",
        created_at: todayStr,
        created_by: "user-mama-wanjiku",
      },
    ],
    audit_logs: [],
    trusted_helpers: [],
    profiles: [],
  };
}

const STORAGE_FILE = path.join(process.cwd(), ".chama_mock_db.json");

class MockDatabaseService {
  private data: MockDataStore;

  constructor() {
    this.data = this.load();
  }

  private load(): MockDataStore {
    try {
      if (typeof window === "undefined" && fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return getInitialData();
  }

  public save(): void {
    try {
      if (typeof window === "undefined") {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.data, null, 2), "utf-8");
      }
    } catch {
      // Ignore write errors in readonly environments
    }
  }

  public getTable<K extends keyof MockDataStore>(name: K): MockDataStore[K] {
    if (!this.data[name]) {
      (this.data[name] as unknown[]) = [];
    }
    return this.data[name];
  }
}

// Global singleton to preserve state across requests
const globalWithDb = globalThis as unknown as { __chamaMockDb?: MockDatabaseService };
if (!globalWithDb.__chamaMockDb) {
  globalWithDb.__chamaMockDb = new MockDatabaseService();
}

export const mockDbService = globalWithDb.__chamaMockDb;
