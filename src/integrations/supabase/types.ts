export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          chama_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          message: string;
        };
        Insert: {
          chama_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message: string;
        };
        Update: {
          chama_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          chama_id: string | null;
          created_at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          chama_id?: string | null;
          created_at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          chama_id?: string | null;
          created_at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      chama_members: {
        Row: {
          chama_id: string;
          display_name: string;
          id: string;
          joined_at: string;
          phone: string | null;
          role: Database["public"]["Enums"]["chama_role"];
          user_id: string | null;
          status: "pending" | "approved" | "rejected";
          id_number: string | null;
          id_type: string | null;
          dob: string | null;
          sex: string | null;
          id_document_url: string | null;
          kyc_verified: boolean;
          kyc_verified_at: string | null;
          kyc_verified_by: string | null;
        };
        Insert: {
          chama_id: string;
          display_name: string;
          id?: string;
          joined_at?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["chama_role"];
          user_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          id_number?: string | null;
          id_type?: string | null;
          dob?: string | null;
          sex?: string | null;
          id_document_url?: string | null;
          kyc_verified?: boolean;
          kyc_verified_at?: string | null;
          kyc_verified_by?: string | null;
        };
        Update: {
          chama_id?: string;
          display_name?: string;
          id?: string;
          joined_at?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["chama_role"];
          user_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          id_number?: string | null;
          id_type?: string | null;
          dob?: string | null;
          sex?: string | null;
          id_document_url?: string | null;
          kyc_verified?: boolean;
          kyc_verified_at?: string | null;
          kyc_verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chama_members_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
        ];
      };
      chamas: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          join_code: string;
          monthly_contribution: number;
          name: string;
          meeting_day: string | null;
          created_by: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          join_code: string;
          monthly_contribution?: number;
          name: string;
          meeting_day?: string | null;
          created_by?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          join_code?: string;
          monthly_contribution?: number;
          name?: string;
          meeting_day?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      contributions: {
        Row: {
          amount: number;
          chama_id: string;
          confirmed_by: string | null;
          created_at: string;
          id: string;
          kind: string;
          member_id: string;
          method: string;
          note: string | null;
          paid_on: string;
          period: string;
          recorded_by: string | null;
          status: Database["public"]["Enums"]["contribution_status"];
          mpesa_reference: string | null;
          phone_number: string | null;
        };
        Insert: {
          amount: number;
          chama_id: string;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          member_id: string;
          method?: string;
          note?: string | null;
          paid_on?: string;
          period: string;
          recorded_by?: string | null;
          status?: Database["public"]["Enums"]["contribution_status"];
          mpesa_reference?: string | null;
          phone_number?: string | null;
        };
        Update: {
          amount?: number;
          chama_id?: string;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          member_id?: string;
          method?: string;
          note?: string | null;
          paid_on?: string;
          period?: string;
          recorded_by?: string | null;
          status?: Database["public"]["Enums"]["contribution_status"];
          mpesa_reference?: string | null;
          phone_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contributions_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contributions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "chama_members";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount: number;
          approved_by: string | null;
          category: string;
          chama_id: string;
          created_at: string;
          description: string | null;
          id: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          occurred_on: string;
          recorded_by: string | null;
          source_id: string | null;
          source_table: string | null;
        };
        Insert: {
          amount: number;
          approved_by?: string | null;
          category: string;
          chama_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          occurred_on?: string;
          recorded_by?: string | null;
          source_id?: string | null;
          source_table?: string | null;
        };
        Update: {
          amount?: number;
          approved_by?: string | null;
          category?: string;
          chama_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["ledger_kind"];
          occurred_on?: string;
          recorded_by?: string | null;
          source_id?: string | null;
          source_table?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
        ];
      };
      loan_repayments: {
        Row: {
          amount: number;
          chama_id: string;
          created_at: string;
          id: string;
          loan_id: string;
          paid_on: string;
          recorded_by: string | null;
          method: string;
          mpesa_reference: string | null;
        };
        Insert: {
          amount: number;
          chama_id: string;
          created_at?: string;
          id?: string;
          loan_id: string;
          paid_on?: string;
          recorded_by?: string | null;
          method?: string;
          mpesa_reference?: string | null;
        };
        Update: {
          amount?: number;
          chama_id?: string;
          created_at?: string;
          id?: string;
          loan_id?: string;
          paid_on?: string;
          recorded_by?: string | null;
          method?: string;
          mpesa_reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loan_repayments_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loan_repayments_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
        ];
      };
      loans: {
        Row: {
          amount: number;
          chama_id: string;
          decided_at: string | null;
          decided_by: string | null;
          due_date: string | null;
          id: string;
          member_id: string;
          reason: string | null;
          requested_at: string;
          status: Database["public"]["Enums"]["loan_status"];
          guarantor_id: string | null;
          interest_rate: number;
          duration_months: number;
        };
        Insert: {
          amount: number;
          chama_id: string;
          decided_at?: string | null;
          decided_by?: string | null;
          due_date?: string | null;
          id?: string;
          member_id: string;
          reason?: string | null;
          requested_at?: string;
          status?: Database["public"]["Enums"]["loan_status"];
          guarantor_id?: string | null;
          interest_rate?: number;
          duration_months?: number;
        };
        Update: {
          amount?: number;
          chama_id?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          due_date?: string | null;
          id?: string;
          member_id?: string;
          reason?: string | null;
          requested_at?: string;
          status?: Database["public"]["Enums"]["loan_status"];
          guarantor_id?: string | null;
          interest_rate?: number;
          duration_months?: number;
        };
        Relationships: [
          {
            foreignKeyName: "loans_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "chama_members";
            referencedColumns: ["id"];
          },
        ];
      };
      merry_go_round_slots: {
        Row: {
          id: string;
          chama_id: string;
          member_id: string;
          cycle_number: number;
          rotation_order: number;
          payout_month: string;
          payout_amount: number;
          status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chama_id: string;
          member_id: string;
          cycle_number?: number;
          rotation_order: number;
          payout_month: string;
          payout_amount?: number;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chama_id?: string;
          member_id?: string;
          cycle_number?: number;
          rotation_order?: number;
          payout_month?: string;
          payout_amount?: number;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_attendance: {
        Row: {
          attended: boolean | null;
          chama_id: string;
          id: string;
          meeting_id: string;
          member_id: string;
          response: Database["public"]["Enums"]["rsvp_response"] | null;
          updated_at: string;
        };
        Insert: {
          attended?: boolean | null;
          chama_id: string;
          id?: string;
          meeting_id: string;
          member_id: string;
          response?: Database["public"]["Enums"]["rsvp_response"] | null;
          updated_at?: string;
        };
        Update: {
          attended?: boolean | null;
          chama_id?: string;
          id?: string;
          meeting_id?: string;
          member_id?: string;
          response?: Database["public"]["Enums"]["rsvp_response"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_attendance_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "chama_members";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          agenda: string | null;
          chama_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          location: string;
          meet_at: string;
          meet_on: string;
          minutes: string | null;
          title: string;
        };
        Insert: {
          agenda?: string | null;
          chama_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location: string;
          meet_at?: string;
          meet_on: string;
          minutes?: string | null;
          title: string;
        };
        Update: {
          agenda?: string | null;
          chama_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: string;
          meet_at?: string;
          meet_on?: string;
          minutes?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_chama_id_fkey";
            columns: ["chama_id"];
            isOneToOne: false;
            referencedRelation: "chamas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          language: string;
          phone: string | null;
          pin_hash: string | null;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          language?: string;
          phone?: string | null;
          pin_hash?: string | null;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          language?: string;
          phone?: string | null;
          pin_hash?: string | null;
        };
        Relationships: [];
      };
      trusted_helpers: {
        Row: {
          can_record: boolean;
          can_view: boolean;
          created_at: string;
          helper_member_id: string;
          id: string;
          member_id: string;
        };
        Insert: {
          can_record?: boolean;
          can_view?: boolean;
          created_at?: string;
          helper_member_id: string;
          id?: string;
          member_id: string;
        };
        Update: {
          can_record?: boolean;
          can_view?: boolean;
          created_at?: string;
          helper_member_id?: string;
          id?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trusted_helpers_helper_member_id_fkey";
            columns: ["helper_member_id"];
            isOneToOne: false;
            referencedRelation: "chama_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trusted_helpers_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "chama_members";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_member: { Args: { _member: string }; Returns: boolean };
      has_chama_role: {
        Args: {
          _chama: string;
          _roles: Database["public"]["Enums"]["chama_role"][];
        };
        Returns: boolean;
      };
      is_member: { Args: { _chama: string }; Returns: boolean };
      my_member_id: { Args: { _chama: string }; Returns: string };
    };
    Enums: {
      chama_role: "chairperson" | "treasurer" | "secretary" | "member";
      contribution_status: "pending" | "confirmed" | "rejected";
      ledger_kind: "in" | "out";
      loan_status: "pending" | "approved" | "rejected" | "repaid";
      rsvp_response: "coming" | "not_coming";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      chama_role: ["chairperson", "treasurer", "secretary", "member"],
      contribution_status: ["pending", "confirmed", "rejected"],
      ledger_kind: ["in", "out"],
      loan_status: ["pending", "approved", "rejected", "repaid"],
      rsvp_response: ["coming", "not_coming"],
    },
  },
} as const;
