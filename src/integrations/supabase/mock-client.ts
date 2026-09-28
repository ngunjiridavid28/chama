import { mockDbService, type MockDataStore } from "./mock-db";

export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    name?: string;
    phone?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface MockSession {
  access_token: string;
  token_type: string;
  user: MockUser;
}

const DEFAULT_USERS: MockUser[] = [
  {
    id: "user-mama-wanjiku",
    email: "wanjiku@tupendane.ke",
    user_metadata: { full_name: "Mama Wanjiku", phone: "0722000001" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-mama-akinyi",
    email: "akinyi@tupendane.ke",
    user_metadata: { full_name: "Mama Akinyi", phone: "0722000002" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-mama-njeri",
    email: "njeri@tupendane.ke",
    user_metadata: { full_name: "Mama Njeri", phone: "0722000003" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-mama-wambui",
    email: "wambui@tupendane.ke",
    user_metadata: { full_name: "Mama Wambui", phone: "0722000004" },
    created_at: "2026-01-01T00:00:00Z",
  },
];

type AuthChangeListener = (
  event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED",
  session: MockSession | null,
) => void;

class MockAuthService {
  private users: MockUser[] = [...DEFAULT_USERS];
  private currentSession: MockSession | null = null;
  private listeners: Set<AuthChangeListener> = new Set();

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("chama_mock_session");
        if (stored) {
          this.currentSession = JSON.parse(stored);
        }
      } catch {
        // Ignore unreadable session
      }
    }
  }

  private persistSession(session: MockSession | null) {
    this.currentSession = session;
    if (typeof window !== "undefined") {
      try {
        if (session) {
          localStorage.setItem("chama_mock_session", JSON.stringify(session));
        } else {
          localStorage.removeItem("chama_mock_session");
        }
      } catch {
        // Storage unavailable
      }
    }
  }

  private notify(event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED", session: MockSession | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, session);
      } catch (err) {
        console.error("Auth listener error", err);
      }
    });
  }

  public async getSession(): Promise<{ data: { session: MockSession | null }; error: null }> {
    return { data: { session: this.currentSession }, error: null };
  }

  public async getUser(): Promise<{ data: { user: MockUser | null }; error: null }> {
    return { data: { user: this.currentSession?.user ?? null }, error: null };
  }

  public async signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ data: { user: MockUser; session: MockSession }; error: null }> {
    const emailNorm = params.email.trim().toLowerCase();
    let user = this.users.find((u) => u.email.toLowerCase() === emailNorm);

    if (!user) {
      // Check if user is one of the chama members by name or auto-create demo user
      const members = mockDbService.getTable("chama_members");
      const matchedMember = members.find(
        (m) =>
          m.display_name.toLowerCase().replace(/\s+/g, "") ===
          emailNorm.split("@")[0]?.toLowerCase(),
      );

      const userId = matchedMember?.user_id || `user-custom-${Date.now()}`;
      user = {
        id: userId,
        email: params.email,
        user_metadata: {
          full_name: matchedMember?.display_name || params.email.split("@")[0] || "Mwanachama",
        },
        created_at: new Date().toISOString(),
      };
      this.users.push(user);
    }

    const session: MockSession = {
      // 3-segment token to satisfy standard JWT validators (header.payload.signature)
      access_token: `mock.jwt.${user.id}`,
      token_type: "bearer",
      user,
    };

    this.persistSession(session);
    this.notify("SIGNED_IN", session);
    return { data: { user, session }, error: null };
  }

  public async signUp(params: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string; phone?: string } };
  }): Promise<{ data: { user: MockUser; session: MockSession }; error: null }> {
    const userId = `user-reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const user: MockUser = {
      id: userId,
      email: params.email,
      user_metadata: {
        full_name:
          params.options?.data?.full_name || params.email.split("@")[0] || "Mwanachama Mpya",
        ...(params.options?.data?.phone ? { phone: params.options.data.phone } : {}),
      },
      created_at: new Date().toISOString(),
    };

    this.users.push(user);
    const session: MockSession = {
      access_token: `mock.jwt.${user.id}`,
      token_type: "bearer",
      user,
    };

    this.persistSession(session);
    this.notify("SIGNED_IN", session);
    return { data: { user, session }, error: null };
  }

  public async signInWithOAuth(params: {
    provider: string;
    options?: { redirectTo?: string; queryParams?: Record<string, string> };
  }): Promise<{ data: { provider: string; url: string | null }; error: null }> {
    const userId = `user-google-${Date.now().toString(36)}`;
    const user: MockUser = {
      id: userId,
      email: "mwanachama.google@gmail.com",
      user_metadata: {
        full_name: "Mwanachama Google",
        name: "Mwanachama Google",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser",
      },
      created_at: new Date().toISOString(),
    };

    this.users.push(user);
    const session: MockSession = {
      access_token: `mock.jwt.${user.id}`,
      token_type: "bearer",
      user,
    };

    this.persistSession(session);
    this.notify("SIGNED_IN", session);
    return {
      data: { provider: params.provider, url: params.options?.redirectTo ?? null },
      error: null,
    };
  }

  public async resetPasswordForEmail(
    _email: string,
    _options?: { redirectTo?: string },
  ): Promise<{ data: Record<string, never>; error: null }> {
    return { data: {}, error: null };
  }

  public async resend(_params: {
    type: string;
    email: string;
  }): Promise<{ data: Record<string, never>; error: null }> {
    return { data: {}, error: null };
  }

  public async signOut(): Promise<{ error: null }> {
    this.persistSession(null);
    this.notify("SIGNED_OUT", null);
    return { error: null };
  }

  public onAuthStateChange(
    callback: (
      event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED",
      session: MockSession | null,
    ) => void,
  ) {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          },
        },
      },
    };
  }

  public async getClaims(token: string): Promise<{
    data: { claims: { sub: string; email?: string } } | null;
    error: Error | null;
  }> {
    const parts = token.split(".");
    if (parts.length < 3) {
      return { data: null, error: new Error("Invalid token") };
    }
    const userId = parts[2] || parts[1] || "user-mama-wanjiku";
    const user = this.users.find((u) => u.id === userId);
    return {
      data: {
        claims: {
          sub: userId,
          email: user?.email ?? "wanjiku@tupendane.ke",
          aud: "authenticated",
          iss: "supabase",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: "authenticated",
          app_metadata: {},
          user_metadata: user?.user_metadata ?? {},
        } as unknown as any,
      },
      error: null,
    };
  }
}

export const mockAuthService = new MockAuthService();

export class MockQueryBuilder {
  private tableName: keyof MockDataStore;
  private selectedColumns: string = "*";
  private filters: Array<(row: any) => boolean> = [];
  private orderColumn?: string;
  private orderAsc: boolean = true;
  private limitCount?: number;
  private isInsert: boolean = false;
  private insertData: any = null;
  private isUpdate: boolean = false;
  private updateData: any = null;
  private isDelete: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName as keyof MockDataStore;
  }

  public select(columns: string = "*") {
    this.selectedColumns = columns;
    return this;
  }

  public insert(values: any) {
    this.isInsert = true;
    this.insertData = values;
    return this;
  }

  public update(values: any) {
    this.isUpdate = true;
    this.updateData = values;
    return this;
  }

  public delete() {
    this.isDelete = true;
    return this;
  }

  public eq(column: string, value: any) {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  public neq(column: string, value: any) {
    this.filters.push((row) => String(row[column]) !== String(value));
    return this;
  }

  public is(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  public lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  public gt(column: string, value: any) {
    this.filters.push((row) => row[column] > value);
    return this;
  }

  public lt(column: string, value: any) {
    this.filters.push((row) => row[column] < value);
    return this;
  }

  public order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  public limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private execute(): any[] {
    const table = mockDbService.getTable(this.tableName) as any[];

    if (this.isInsert && this.insertData) {
      const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const inserted: any[] = [];
      for (const item of items) {
        const row = {
          id:
            item.id || `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        };
        table.unshift(row);
        inserted.push(row);
      }
      mockDbService.save();
      return inserted;
    }

    if (this.isUpdate && this.updateData) {
      const updated: any[] = [];
      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        if (this.filters.every((f) => f(row))) {
          table[i] = { ...row, ...this.updateData };
          updated.push(table[i]);
        }
      }
      mockDbService.save();
      return updated;
    }

    if (this.isDelete) {
      const remaining = table.filter((row) => !this.filters.every((f) => f(row)));
      (mockDbService.getTable(this.tableName) as any[]).length = 0;
      (mockDbService.getTable(this.tableName) as any[]).push(...remaining);
      mockDbService.save();
      return [];
    }

    // SELECT
    let result = table.filter((row) => this.filters.every((f) => f(row)));

    if (this.orderColumn) {
      const col = this.orderColumn;
      const asc = this.orderAsc;
      result = [...result].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    // Expand joins
    return result.map((row) => this.formatRow(row));
  }

  private formatRow(row: any): any {
    const cloned = { ...row };

    // Resolve relationships
    if (this.selectedColumns.includes("chamas(")) {
      const chamas = mockDbService.getTable("chamas");
      const chama = chamas.find((c) => c.id === row.chama_id);
      cloned.chamas = chama
        ? {
            id: chama.id,
            name: chama.name,
            monthly_contribution: chama.monthly_contribution,
            join_code: chama.join_code,
          }
        : null;
    }

    if (this.selectedColumns.includes("chama_members(")) {
      const members = mockDbService.getTable("chama_members");
      const member = members.find((m) => m.id === row.member_id);
      cloned.chama_members = member
        ? { display_name: member.display_name }
        : { display_name: "Mwanachama" };
    }

    return cloned;
  }

  public async single(): Promise<{ data: any | null; error: any }> {
    const rows = this.execute();
    if (rows.length === 0) {
      return { data: null, error: { message: "Row not found" } };
    }
    return { data: rows[0], error: null };
  }

  public async maybeSingle(): Promise<{ data: any | null; error: null }> {
    const rows = this.execute();
    return { data: rows[0] ?? null, error: null };
  }

  // Promise-like then for `await sb.from(...)`
  public then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      ((value: { data: any[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const data = this.execute();
      const res = { data, error: null };
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      const res = { data: null, error: err };
      return Promise.resolve(res).then(onfulfilled, onrejected);
    }
  }
}

export function createMockSupabaseClient() {
  return {
    auth: mockAuthService,
    from: (table: string) => new MockQueryBuilder(table),
  };
}
