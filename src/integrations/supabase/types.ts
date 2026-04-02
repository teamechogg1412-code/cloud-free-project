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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artist_revenue_rates: {
        Row: {
          artist_id: string
          artist_rate: number
          category: string
          company_rate: number
          created_at: string
          id: string
          mgmt_fee_rate: number
          notes: string | null
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_rate?: number
          category?: string
          company_rate?: number
          created_at?: string
          id?: string
          mgmt_fee_rate?: number
          notes?: string | null
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_rate?: number
          category?: string
          company_rate?: number
          created_at?: string
          id?: string
          mgmt_fee_rate?: number
          notes?: string | null
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      casting_offers: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          from_tenant_id: string
          id: string
          is_deleted: boolean
          message: string | null
          responded_at: string | null
          response_note: string | null
          role_name: string | null
          status: string
          to_tenant_id: string
          updated_at: string
          work_id: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          from_tenant_id: string
          id?: string
          is_deleted?: boolean
          message?: string | null
          responded_at?: string | null
          response_note?: string | null
          role_name?: string | null
          status?: string
          to_tenant_id: string
          updated_at?: string
          work_id: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          from_tenant_id?: string
          id?: string
          is_deleted?: boolean
          message?: string | null
          responded_at?: string | null
          response_note?: string | null
          role_name?: string | null
          status?: string
          to_tenant_id?: string
          updated_at?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "casting_offers_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_report_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          expense_report_id: string
          id: string
          item_date: string
          payment_method: string | null
          receipt_note: string | null
          sort_order: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          expense_report_id: string
          id?: string
          item_date: string
          payment_method?: string | null
          receipt_note?: string | null
          sort_order?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          expense_report_id?: string
          id?: string
          item_date?: string
          payment_method?: string | null
          receipt_note?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_report_items_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_report_template_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          payment_method: string | null
          receipt_note: string | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          payment_method?: string | null
          receipt_note?: string | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          payment_method?: string | null
          receipt_note?: string | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_report_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "expense_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_report_templates: {
        Row: {
          assignee_user_id: string
          category: string
          created_at: string
          created_by: string | null
          day_of_month: number
          description: string | null
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          reject_reason: string | null
          status: string
          tenant_id: string
          title: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reject_reason?: string | null
          status?: string
          tenant_id: string
          title: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reject_reason?: string | null
          status?: string
          tenant_id?: string
          title?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_invoices: {
        Row: {
          assigned_to: string
          converted_expense_id: string | null
          created_at: string
          description: string | null
          extracted_data: Json | null
          file_urls: Json | null
          id: string
          link_token: string
          status: string
          tenant_id: string
          total_amount: number | null
          updated_at: string
          vendor_company: string | null
          vendor_email: string | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          assigned_to: string
          converted_expense_id?: string | null
          created_at?: string
          description?: string | null
          extracted_data?: Json | null
          file_urls?: Json | null
          id?: string
          link_token: string
          status?: string
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
          vendor_company?: string | null
          vendor_email?: string | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          assigned_to?: string
          converted_expense_id?: string | null
          created_at?: string
          description?: string | null
          extracted_data?: Json | null
          file_urls?: Json | null
          id?: string
          link_token?: string
          status?: string
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
          vendor_company?: string | null
          vendor_email?: string | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: []
      }
      invoice_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          tenant_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          tenant_id: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          tenant_id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          overdraft_limit: number | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          overdraft_limit?: number | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          overdraft_limit?: number | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          created_at: string
          deduction_days: number | null
          display_name: string | null
          group_id: string | null
          id: string
          include_holidays_in_consecutive: boolean | null
          is_active: boolean
          is_paid: boolean | null
          max_consecutive_days: number | null
          min_consecutive_days: number | null
          name: string
          paid_hours: number | null
          sort_order: number | null
          special_option: string | null
          tenant_id: string | null
          time_option: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deduction_days?: number | null
          display_name?: string | null
          group_id?: string | null
          id?: string
          include_holidays_in_consecutive?: boolean | null
          is_active?: boolean
          is_paid?: boolean | null
          max_consecutive_days?: number | null
          min_consecutive_days?: number | null
          name: string
          paid_hours?: number | null
          sort_order?: number | null
          special_option?: string | null
          tenant_id?: string | null
          time_option?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deduction_days?: number | null
          display_name?: string | null
          group_id?: string | null
          id?: string
          include_holidays_in_consecutive?: boolean | null
          is_active?: boolean
          is_paid?: boolean | null
          max_consecutive_days?: number | null
          min_consecutive_days?: number | null
          name?: string
          paid_hours?: number | null
          sort_order?: number | null
          special_option?: string | null
          tenant_id?: string | null
          time_option?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "leave_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      project_revenue_rates: {
        Row: {
          artist_id: string
          artist_rate: number
          company_rate: number
          created_at: string
          id: string
          mgmt_fee_rate: number
          notes: string | null
          project_id: string
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_rate?: number
          company_rate?: number
          created_at?: string
          id?: string
          mgmt_fee_rate?: number
          notes?: string | null
          project_id: string
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_rate?: number
          company_rate?: number
          created_at?: string
          id?: string
          mgmt_fee_rate?: number
          notes?: string | null
          project_id?: string
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_settlement_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type: string
          description: string
          id: string
          settlement_id: string
          sort_order: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_type?: string
          description: string
          id?: string
          settlement_id: string
          sort_order?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type?: string
          description?: string
          id?: string
          settlement_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_settlement_deductions_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "revenue_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_settlement_items: {
        Row: {
          artist_amount: number
          artist_rate: number
          category: string
          company_amount: number
          company_rate: number
          contract_amount: number
          created_at: string
          id: string
          mgmt_fee: number
          mgmt_fee_rate: number
          project_id: string | null
          project_name: string
          settlement_id: string
          sort_order: number | null
          tax_amount: number
          tax_rate: number
        }
        Insert: {
          artist_amount?: number
          artist_rate?: number
          category?: string
          company_amount?: number
          company_rate?: number
          contract_amount?: number
          created_at?: string
          id?: string
          mgmt_fee?: number
          mgmt_fee_rate?: number
          project_id?: string | null
          project_name: string
          settlement_id: string
          sort_order?: number | null
          tax_amount?: number
          tax_rate?: number
        }
        Update: {
          artist_amount?: number
          artist_rate?: number
          category?: string
          company_amount?: number
          company_rate?: number
          contract_amount?: number
          created_at?: string
          id?: string
          mgmt_fee?: number
          mgmt_fee_rate?: number
          project_id?: string | null
          project_name?: string
          settlement_id?: string
          sort_order?: number | null
          tax_amount?: number
          tax_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "revenue_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_settlements: {
        Row: {
          artist_amount: number
          artist_id: string
          company_amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          deductions: number
          id: string
          mgmt_fee: number
          net_artist_amount: number
          notes: string | null
          settlement_period: string
          status: string
          tax_amount: number
          tenant_id: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          artist_amount?: number
          artist_id: string
          company_amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          mgmt_fee?: number
          net_artist_amount?: number
          notes?: string | null
          settlement_period: string
          status?: string
          tax_amount?: number
          tenant_id: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          artist_amount?: number
          artist_id?: string
          company_amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number
          id?: string
          mgmt_fee?: number
          net_artist_amount?: number
          notes?: string | null
          settlement_period?: string
          status?: string
          tax_amount?: number
          tenant_id?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      standard_regulations: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_regulations: {
        Row: {
          category: string
          created_at: string | null
          custom_content: string | null
          custom_title: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          standard_regulation_id: string | null
          tenant_id: string
          updated_at: string | null
          use_standard: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          custom_content?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          standard_regulation_id?: string | null
          tenant_id: string
          updated_at?: string | null
          use_standard?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          custom_content?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          standard_regulation_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          use_standard?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_regulations_standard_regulation_id_fkey"
            columns: ["standard_regulation_id"]
            isOneToOne: false
            referencedRelation: "standard_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_files: {
        Row: {
          created_at: string
          drive_download_link: string | null
          drive_file_id: string | null
          drive_view_link: string | null
          file_name: string
          file_type: string
          id: string
          tenant_id: string
          uploaded_by: string | null
          work_id: string
        }
        Insert: {
          created_at?: string
          drive_download_link?: string | null
          drive_file_id?: string | null
          drive_view_link?: string | null
          file_name: string
          file_type?: string
          id?: string
          tenant_id: string
          uploaded_by?: string | null
          work_id: string
        }
        Update: {
          created_at?: string
          drive_download_link?: string | null
          drive_file_id?: string | null
          drive_view_link?: string | null
          file_name?: string
          file_type?: string
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
          work_id?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          category: string
          channel: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          current_casting: string | null
          director: string | null
          director_detail: string | null
          drive_folder_id: string | null
          drive_folder_link: string | null
          id: string
          is_rejected: boolean
          notes: string | null
          production_company: string | null
          production_detail: string | null
          received_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          writer: string | null
          writer_detail: string | null
        }
        Insert: {
          category?: string
          channel?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          current_casting?: string | null
          director?: string | null
          director_detail?: string | null
          drive_folder_id?: string | null
          drive_folder_link?: string | null
          id?: string
          is_rejected?: boolean
          notes?: string | null
          production_company?: string | null
          production_detail?: string | null
          received_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          writer?: string | null
          writer_detail?: string | null
        }
        Update: {
          category?: string
          channel?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          current_casting?: string | null
          director?: string | null
          director_detail?: string | null
          drive_folder_id?: string | null
          drive_folder_link?: string | null
          id?: string
          is_rejected?: boolean
          notes?: string | null
          production_company?: string | null
          production_detail?: string | null
          received_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          writer?: string | null
          writer_detail?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
