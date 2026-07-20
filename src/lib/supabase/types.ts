// Auto-generated from the Supabase project schema
// (mcp__Supabase__generate_typescript_types against project qnvpalbisenawdtzcflr).
// Regenerate after every migration — do not hand-edit.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          diff: Json | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daypart_configs: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          location_id: string | null
          organization_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          location_id?: string | null
          organization_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          location_id?: string | null
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "daypart_configs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daypart_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries: {
        Row: {
          actual_hours: number
          boh_labor_dollars: number
          business_date: string
          catering_event_labor_dollars: number | null
          created_at: string
          created_by: string | null
          daypart_id: string
          discounts_comps: number | null
          foh_labor_dollars: number
          gross_sales: number | null
          guest_count: number | null
          id: string
          location_id: string
          management_labor_dollars: number
          net_sales: number
          notes: string | null
          organization_id: string
          overtime_dollars: number
          overtime_hours: number
          regular_labor_dollars: number
          scheduled_hours: number
          scheduled_labor_dollars: number | null
          status: Database["public"]["Enums"]["labor_entry_status"]
          transaction_count: number | null
          updated_at: string
          updated_by: string | null
          weather_or_event_note: string | null
        }
        Insert: {
          actual_hours?: number
          boh_labor_dollars?: number
          business_date: string
          catering_event_labor_dollars?: number | null
          created_at?: string
          created_by?: string | null
          daypart_id: string
          discounts_comps?: number | null
          foh_labor_dollars?: number
          gross_sales?: number | null
          guest_count?: number | null
          id?: string
          location_id: string
          management_labor_dollars?: number
          net_sales?: number
          notes?: string | null
          organization_id: string
          overtime_dollars?: number
          overtime_hours?: number
          regular_labor_dollars?: number
          scheduled_hours?: number
          scheduled_labor_dollars?: number | null
          status?: Database["public"]["Enums"]["labor_entry_status"]
          transaction_count?: number | null
          updated_at?: string
          updated_by?: string | null
          weather_or_event_note?: string | null
        }
        Update: {
          actual_hours?: number
          boh_labor_dollars?: number
          business_date?: string
          catering_event_labor_dollars?: number | null
          created_at?: string
          created_by?: string | null
          daypart_id?: string
          discounts_comps?: number | null
          foh_labor_dollars?: number
          gross_sales?: number | null
          guest_count?: number | null
          id?: string
          location_id?: string
          management_labor_dollars?: number
          net_sales?: number
          notes?: string | null
          organization_id?: string
          overtime_dollars?: number
          overtime_hours?: number
          regular_labor_dollars?: number
          scheduled_hours?: number
          scheduled_labor_dollars?: number | null
          status?: Database["public"]["Enums"]["labor_entry_status"]
          transaction_count?: number | null
          updated_at?: string
          updated_by?: string | null
          weather_or_event_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_daypart_id_fkey"
            columns: ["daypart_id"]
            isOneToOne: false
            referencedRelation: "daypart_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_role_entries: {
        Row: {
          dollars: number
          hours: number
          id: string
          labor_entry_id: string
          labor_role_id: string
        }
        Insert: {
          dollars?: number
          hours?: number
          id?: string
          labor_entry_id: string
          labor_role_id: string
        }
        Update: {
          dollars?: number
          hours?: number
          id?: string
          labor_entry_id?: string
          labor_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_role_entries_labor_entry_id_fkey"
            columns: ["labor_entry_id"]
            isOneToOne: false
            referencedRelation: "labor_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_role_entries_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_roles: {
        Row: {
          category: Database["public"]["Enums"]["labor_role_category"]
          created_at: string
          default_hourly_wage: number | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["labor_role_category"]
          created_at?: string
          default_hourly_wage?: number | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["labor_role_category"]
          created_at?: string
          default_hourly_wage?: number | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_targets: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          include_management_in_productive: boolean
          location_id: string | null
          organization_id: string
          target_boh_percent: number | null
          target_foh_percent: number | null
          target_management_percent: number | null
          target_overtime_percent: number | null
          target_total_labor_percent: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          include_management_in_productive?: boolean
          location_id?: string | null
          organization_id: string
          target_boh_percent?: number | null
          target_foh_percent?: number | null
          target_management_percent?: number | null
          target_overtime_percent?: number | null
          target_total_labor_percent: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          include_management_in_productive?: boolean
          location_id?: string | null
          organization_id?: string
          target_boh_percent?: number | null
          target_foh_percent?: number | null
          target_management_percent?: number | null
          target_overtime_percent?: number | null
          target_total_labor_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "labor_targets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          approval_required: boolean
          created_at: string
          edit_lock_hours_after_business_date: number
          guests_per_labor_hour_high_threshold: number
          organization_id: string
          scheduled_vs_actual_variance_threshold_percent: number
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          created_at?: string
          edit_lock_hours_after_business_date?: number
          guests_per_labor_hour_high_threshold?: number
          organization_id: string
          scheduled_vs_actual_variance_threshold_percent?: number
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          created_at?: string
          edit_lock_hours_after_business_date?: number
          guests_per_labor_hour_high_threshold?: number
          organization_id?: string
          scheduled_vs_actual_variance_threshold_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_location_entries: {
        Args: { target_location: string }
        Returns: boolean
      }
      has_location_access: {
        Args: { target_location: string }
        Returns: boolean
      }
      has_org_access: { Args: { target_org: string }; Returns: boolean }
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      is_org_admin_or_owner: { Args: { target_org: string }; Returns: boolean }
      within_edit_window: {
        Args: { entry_date: string; target_location: string }
        Returns: boolean
      }
    }
    Enums: {
      labor_entry_status: "draft" | "final" | "locked"
      labor_role_category: "foh" | "boh" | "management"
      membership_role:
        | "org_admin"
        | "owner"
        | "general_manager"
        | "assistant_manager"
        | "kitchen_manager"
        | "foh_manager"
        | "read_only"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      labor_entry_status: ["draft", "final", "locked"],
      labor_role_category: ["foh", "boh", "management"],
      membership_role: [
        "org_admin",
        "owner",
        "general_manager",
        "assistant_manager",
        "kitchen_manager",
        "foh_manager",
        "read_only",
      ],
    },
  },
} as const
