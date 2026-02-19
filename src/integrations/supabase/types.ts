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
      approval_lines: {
        Row: {
          approver_user_id: string
          created_at: string
          id: string
          step_order: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_user_id: string
          created_at?: string
          id?: string
          step_order: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_user_id?: string
          created_at?: string
          id?: string
          step_order?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_lines_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_lines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_schedules: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          is_all_day: boolean | null
          location: string | null
          schedule_type: string | null
          start_time: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          schedule_type?: string | null
          start_time: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          schedule_type?: string | null
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_schedules_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          address: string | null
          agency: string | null
          bio: string | null
          birth_date: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          debut_date: string | null
          email: string | null
          gender: string | null
          id: string
          id_card_masked_url: string | null
          id_card_url: string | null
          instagram_url: string | null
          is_active: boolean | null
          name: string
          namuwiki_url: string | null
          profile_image_url: string | null
          resident_number: string | null
          signature_url: string | null
          social_links: Json | null
          stage_name: string | null
          tenant_id: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          agency?: string | null
          bio?: string | null
          birth_date?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          debut_date?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          id_card_masked_url?: string | null
          id_card_url?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          name: string
          namuwiki_url?: string | null
          profile_image_url?: string | null
          resident_number?: string | null
          signature_url?: string | null
          social_links?: Json | null
          stage_name?: string | null
          tenant_id: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          agency?: string | null
          bio?: string | null
          birth_date?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          debut_date?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          id_card_masked_url?: string | null
          id_card_url?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          name?: string
          namuwiki_url?: string | null
          profile_image_url?: string | null
          resident_number?: string | null
          signature_url?: string | null
          social_links?: Json | null
          stage_name?: string | null
          tenant_id?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_in_method: string
          clock_out: string | null
          clock_out_method: string
          created_at: string
          date: string
          id: string
          memo: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_in_method?: string
          clock_out?: string | null
          clock_out_method?: string
          created_at?: string
          date?: string
          id?: string
          memo?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string | null
          clock_in_method?: string
          clock_out?: string | null
          clock_out_method?: string
          created_at?: string
          date?: string
          id?: string
          memo?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_transactions: {
        Row: {
          amount: number
          card_id: string
          category: string | null
          created_at: string
          id: string
          memo: string | null
          merchant_name: string | null
          project_id: string | null
          receipt_url: string | null
          status: string | null
          tenant_id: string
          transaction_date: string
        }
        Insert: {
          amount: number
          card_id: string
          category?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          merchant_name?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          tenant_id: string
          transaction_date: string
        }
        Update: {
          amount?: number
          card_id?: string
          category?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          merchant_name?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          tenant_id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "corporate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commute_locations: {
        Row: {
          created_at: string
          distance_km: number | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          office_address: string | null
          office_lat: number | null
          office_lng: number | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          office_address?: string | null
          office_lat?: number | null
          office_lng?: number | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          office_address?: string | null
          office_lat?: number | null
          office_lng?: number | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commute_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commute_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_cards: {
        Row: {
          card_company: string | null
          card_holder_name: string | null
          card_image_url: string | null
          card_name: string | null
          card_number: string
          card_type: string | null
          created_at: string
          cvc: string | null
          expiry_date: string | null
          holder_user_id: string | null
          id: string
          is_active: boolean | null
          is_skypass: boolean | null
          monthly_limit: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          card_company?: string | null
          card_holder_name?: string | null
          card_image_url?: string | null
          card_name?: string | null
          card_number: string
          card_type?: string | null
          created_at?: string
          cvc?: string | null
          expiry_date?: string | null
          holder_user_id?: string | null
          id?: string
          is_active?: boolean | null
          is_skypass?: boolean | null
          monthly_limit?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          card_company?: string | null
          card_holder_name?: string | null
          card_image_url?: string | null
          card_name?: string | null
          card_number?: string
          card_type?: string | null
          created_at?: string
          cvc?: string | null
          expiry_date?: string | null
          holder_user_id?: string | null
          id?: string
          is_active?: boolean | null
          is_skypass?: boolean | null
          monthly_limit?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folder_mappings: {
        Row: {
          created_at: string
          folder_id: string
          folder_key: string
          folder_name: string | null
          folder_path: string | null
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          folder_key: string
          folder_name?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          folder_key?: string
          folder_name?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_folder_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      driving_log_waypoints: {
        Row: {
          heading: number | null
          id: string
          latitude: number
          log_id: string
          longitude: number
          recorded_at: string
          speed_kmh: number | null
        }
        Insert: {
          heading?: number | null
          id?: string
          latitude: number
          log_id: string
          longitude: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Update: {
          heading?: number | null
          id?: string
          latitude?: number
          log_id?: string
          longitude?: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driving_log_waypoints_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "driving_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      driving_logs: {
        Row: {
          created_at: string
          distance_km: number | null
          driver_user_id: string | null
          end_address: string | null
          end_location_lat: number | null
          end_location_lng: number | null
          end_time: string | null
          id: string
          memo: string | null
          purpose: string | null
          start_address: string | null
          start_location_lat: number | null
          start_location_lng: number | null
          start_time: string
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          driver_user_id?: string | null
          end_address?: string | null
          end_location_lat?: number | null
          end_location_lng?: number | null
          end_time?: string | null
          id?: string
          memo?: string | null
          purpose?: string | null
          start_address?: string | null
          start_location_lat?: number | null
          start_location_lng?: number | null
          start_time?: string
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          driver_user_id?: string | null
          end_address?: string | null
          end_location_lat?: number | null
          end_location_lng?: number | null
          end_time?: string | null
          id?: string
          memo?: string | null
          purpose?: string | null
          start_address?: string | null
          start_location_lat?: number | null
          start_location_lng?: number | null
          start_time?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driving_logs_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          account_holder: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          bankbook_url: string | null
          created_at: string
          email: string | null
          emergency_contacts: Json | null
          hire_date: string | null
          id: string
          id_card_url: string | null
          is_foreigner: string | null
          nationality: string | null
          phone_mobile: string | null
          phone_tel: string | null
          resident_number: string | null
          resignation_date: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          bankbook_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contacts?: Json | null
          hire_date?: string | null
          id?: string
          id_card_url?: string | null
          is_foreigner?: string | null
          nationality?: string | null
          phone_mobile?: string | null
          phone_tel?: string | null
          resident_number?: string | null
          resignation_date?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          bankbook_url?: string | null
          created_at?: string
          email?: string | null
          emergency_contacts?: Json | null
          hire_date?: string | null
          id?: string
          id_card_url?: string | null
          is_foreigner?: string | null
          nationality?: string | null
          phone_mobile?: string | null
          phone_tel?: string | null
          resident_number?: string | null
          resignation_date?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          job_title: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          account_alias: string | null
          account_number: string | null
          business_type: string
          connected_id_key: string
          created_at: string
          id: string
          is_active: boolean
          organization: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_alias?: string | null
          account_number?: string | null
          business_type: string
          connected_id_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_alias?: string | null
          account_number?: string | null
          business_type?: string
          connected_id_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_records: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string
          id: string
          new_department: string | null
          new_job_title: string | null
          new_role: string | null
          old_department: string | null
          old_job_title: string | null
          old_role: string | null
          record_type: string
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string
          id?: string
          new_department?: string | null
          new_job_title?: string | null
          new_role?: string | null
          old_department?: string | null
          old_job_title?: string | null
          old_role?: string | null
          record_type: string
          tenant_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string
          id?: string
          new_department?: string | null
          new_job_title?: string | null
          new_role?: string | null
          old_department?: string | null
          old_job_title?: string | null
          old_role?: string | null
          record_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          invoice_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          invoice_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          keyword: string
          priority: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          priority?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          priority?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          created_by: string | null
          generation_type: string
          group_id: string | null
          id: string
          memo: string | null
          tenant_id: string
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generation_type?: string
          group_id?: string | null
          id?: string
          memo?: string | null
          tenant_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generation_type?: string
          group_id?: string | null
          id?: string
          memo?: string | null
          tenant_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "leave_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "leave_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          leave_type_id: string
          reason: string | null
          reject_reason: string | null
          start_date: string
          start_time: string | null
          status: string
          tenant_id: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          leave_type_id: string
          reason?: string | null
          reject_reason?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          tenant_id: string
          total_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          leave_type_id?: string
          reason?: string | null
          reject_reason?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          tenant_id?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "leave_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      press_contacts: {
        Row: {
          contact_email: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          media_company: string
          purpose: string | null
          reporter_name: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_company: string
          purpose?: string | null
          reporter_name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_company?: string
          purpose?: string | null
          reporter_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          signature_url: string | null
          system_role: Database["public"]["Enums"]["system_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          signature_url?: string | null
          system_role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          signature_url?: string | null
          system_role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          pm_user_id: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pm_user_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pm_user_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_participants: {
        Row: {
          created_at: string
          id: string
          participant_company: string | null
          participant_name: string | null
          participant_type: string
          schedule_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          participant_company?: string | null
          participant_name?: string | null
          participant_type?: string
          schedule_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          participant_company?: string | null
          participant_name?: string | null
          participant_type?: string
          schedule_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_participants_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "artist_schedule_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_participants_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "artist_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          assigned_tenant_id: string | null
          company_name: string
          company_type: Database["public"]["Enums"]["company_type"] | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_tenant_id?: string | null
          company_name: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_tenant_id?: string | null
          company_name?: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_assigned_tenant_id_fkey"
            columns: ["assigned_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configs: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tenant_api_configs: {
        Row: {
          category: string | null
          config_key: string
          config_value: string
          created_at: string
          description: string | null
          id: string
          is_encrypted: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          config_key: string
          config_value: string
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          config_key?: string
          config_value?: string
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_suspended: boolean
          job_title: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_suspended?: boolean
          job_title?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_suspended?: boolean
          job_title?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_partnerships: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          data_scopes: string[]
          id: string
          invited_by: string | null
          message: string | null
          requester_tenant_id: string
          status: string
          target_tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          data_scopes?: string[]
          id?: string
          invited_by?: string | null
          message?: string | null
          requester_tenant_id: string
          status?: string
          target_tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          data_scopes?: string[]
          id?: string
          invited_by?: string | null
          message?: string | null
          requester_tenant_id?: string
          status?: string
          target_tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_partnerships_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_partnerships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_partnerships_requester_tenant_id_fkey"
            columns: ["requester_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_partnerships_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          biz_item: string | null
          biz_number: string | null
          biz_type: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          corp_number: string | null
          created_at: string
          domain: string | null
          drive_connected_at: string | null
          drive_connected_by: string | null
          drive_folder_id: string | null
          google_credentials: string | null
          id: string
          logo_url: string | null
          name: string
          opening_date: string | null
          rep_name: string | null
          tax_email: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          biz_item?: string | null
          biz_number?: string | null
          biz_type?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          corp_number?: string | null
          created_at?: string
          domain?: string | null
          drive_connected_at?: string | null
          drive_connected_by?: string | null
          drive_folder_id?: string | null
          google_credentials?: string | null
          id?: string
          logo_url?: string | null
          name: string
          opening_date?: string | null
          rep_name?: string | null
          tax_email?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          biz_item?: string | null
          biz_number?: string | null
          biz_type?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          corp_number?: string | null
          created_at?: string
          domain?: string | null
          drive_connected_at?: string | null
          drive_connected_by?: string | null
          drive_folder_id?: string | null
          google_credentials?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          opening_date?: string | null
          rep_name?: string | null
          tax_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_drive_connected_by_fkey"
            columns: ["drive_connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mail_configs: {
        Row: {
          created_at: string
          google_access_token: string | null
          google_email: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          nw_client_id: string | null
          nw_client_secret: string | null
          nw_domain_id: string | null
          nw_private_key: string | null
          nw_service_account: string | null
          nw_user_id: string | null
          provider: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_access_token?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          nw_client_id?: string | null
          nw_client_secret?: string | null
          nw_domain_id?: string | null
          nw_private_key?: string | null
          nw_service_account?: string | null
          nw_user_id?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_access_token?: string | null
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          nw_client_id?: string | null
          nw_client_secret?: string | null
          nw_domain_id?: string | null
          nw_private_key?: string | null
          nw_service_account?: string | null
          nw_user_id?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mail_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mail_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_accidents: {
        Row: {
          accident_date: string
          claim_amount: number | null
          created_at: string
          damage_cost: number | null
          description: string | null
          driver_user_id: string | null
          id: string
          insurance_claim: boolean | null
          status: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          accident_date: string
          claim_amount?: number | null
          created_at?: string
          damage_cost?: number | null
          description?: string | null
          driver_user_id?: string | null
          id?: string
          insurance_claim?: boolean | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          accident_date?: string
          claim_amount?: number | null
          created_at?: string
          damage_cost?: number | null
          description?: string | null
          driver_user_id?: string | null
          id?: string
          insurance_claim?: boolean | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_accidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_accidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          annual_contract_mileage: number | null
          assigned_user_id: string | null
          contact_number: string | null
          contract_end_date: string | null
          contract_manager: string | null
          contract_start_date: string | null
          created_at: string
          excess_mileage_fee: number | null
          fuel_type: string | null
          id: string
          initial_mileage: number | null
          insurance_company: string | null
          insurance_driver_age: string | null
          insurance_end_date: string | null
          insurance_expiry: string | null
          insurance_start_date: string | null
          is_active: boolean | null
          lease_company: string | null
          lease_end_date: string | null
          lease_start_date: string | null
          manufacturer: string | null
          model: string | null
          model_name: string | null
          monthly_fee: number | null
          monthly_lease_cost: number | null
          ownership_type: string | null
          payment_day: number | null
          payment_method: string | null
          plate_number: string | null
          primary_driver: string | null
          requires_log: boolean | null
          tenant_id: string
          updated_at: string
          usage_category: string | null
          vehicle_number: string | null
          vendor_name: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          annual_contract_mileage?: number | null
          assigned_user_id?: string | null
          contact_number?: string | null
          contract_end_date?: string | null
          contract_manager?: string | null
          contract_start_date?: string | null
          created_at?: string
          excess_mileage_fee?: number | null
          fuel_type?: string | null
          id?: string
          initial_mileage?: number | null
          insurance_company?: string | null
          insurance_driver_age?: string | null
          insurance_end_date?: string | null
          insurance_expiry?: string | null
          insurance_start_date?: string | null
          is_active?: boolean | null
          lease_company?: string | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          manufacturer?: string | null
          model?: string | null
          model_name?: string | null
          monthly_fee?: number | null
          monthly_lease_cost?: number | null
          ownership_type?: string | null
          payment_day?: number | null
          payment_method?: string | null
          plate_number?: string | null
          primary_driver?: string | null
          requires_log?: boolean | null
          tenant_id: string
          updated_at?: string
          usage_category?: string | null
          vehicle_number?: string | null
          vendor_name?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          annual_contract_mileage?: number | null
          assigned_user_id?: string | null
          contact_number?: string | null
          contract_end_date?: string | null
          contract_manager?: string | null
          contract_start_date?: string | null
          created_at?: string
          excess_mileage_fee?: number | null
          fuel_type?: string | null
          id?: string
          initial_mileage?: number | null
          insurance_company?: string | null
          insurance_driver_age?: string | null
          insurance_end_date?: string | null
          insurance_expiry?: string | null
          insurance_start_date?: string | null
          is_active?: boolean | null
          lease_company?: string | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          manufacturer?: string | null
          model?: string | null
          model_name?: string | null
          monthly_fee?: number | null
          monthly_lease_cost?: number | null
          ownership_type?: string | null
          payment_day?: number | null
          payment_method?: string | null
          plate_number?: string | null
          primary_driver?: string | null
          requires_log?: boolean | null
          tenant_id?: string
          updated_at?: string
          usage_category?: string | null
          vehicle_number?: string | null
          vendor_name?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_primary_driver_fkey"
            columns: ["primary_driver"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoices: {
        Row: {
          account_holder: string | null
          account_number: string | null
          amount: number
          assigned_to: string | null
          bank_name: string | null
          business_number: string | null
          created_at: string
          description: string | null
          id: string
          processed_at: string | null
          status: string
          submitted_at: string
          tenant_id: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          amount: number
          assigned_to?: string | null
          bank_name?: string | null
          business_number?: string | null
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          amount?: number
          assigned_to?: string | null
          bank_name?: string | null
          business_number?: string | null
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_rules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          max_include_holidays: boolean
          max_period: string
          max_period_start_day: number | null
          max_work_hours: number
          max_work_unit: string
          name: string
          overtime_max_hours: number
          overtime_max_unit: string
          overtime_min_hours: number
          overtime_min_unit: string
          standard_include_holidays: boolean
          standard_period: string
          standard_period_start_day: number | null
          standard_work_hours: number
          standard_work_unit: string
          tenant_id: string | null
          updated_at: string
          work_days: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_include_holidays?: boolean
          max_period?: string
          max_period_start_day?: number | null
          max_work_hours?: number
          max_work_unit?: string
          name: string
          overtime_max_hours?: number
          overtime_max_unit?: string
          overtime_min_hours?: number
          overtime_min_unit?: string
          standard_include_holidays?: boolean
          standard_period?: string
          standard_period_start_day?: number | null
          standard_work_hours?: number
          standard_work_unit?: string
          tenant_id?: string | null
          updated_at?: string
          work_days?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_include_holidays?: boolean
          max_period?: string
          max_period_start_day?: number | null
          max_work_hours?: number
          max_work_unit?: string
          name?: string
          overtime_max_hours?: number
          overtime_max_unit?: string
          overtime_min_hours?: number
          overtime_min_unit?: string
          standard_include_holidays?: boolean
          standard_period?: string
          standard_period_start_day?: number | null
          standard_work_hours?: number
          standard_work_unit?: string
          tenant_id?: string | null
          updated_at?: string
          work_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "work_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      artist_schedule_availability: {
        Row: {
          artist_id: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          is_all_day: boolean | null
          schedule_type: string | null
          start_time: string | null
          tenant_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_all_day?: boolean | null
          schedule_type?: string | null
          start_time?: string | null
          tenant_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_all_day?: boolean | null
          schedule_type?: string | null
          start_time?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_schedules_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_clock_out: { Args: never; Returns: number }
      calculate_annual_leave_days: {
        Args: { _hire_date: string; _reference_date?: string }
        Returns: number
      }
      complete_onboarding: {
        Args: { _department: string; _job_title: string; _tenant_id: string }
        Returns: undefined
      }
      get_monthly_work_hours: {
        Args: {
          _month: number
          _tenant_id: string
          _user_id: string
          _year: number
        }
        Returns: {
          clock_in_time: string
          clock_out_method: string
          clock_out_time: string
          hours_worked: number
          work_date: string
        }[]
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      get_weekly_work_hours: {
        Args: { _tenant_id: string; _user_id: string; _week_start: string }
        Returns: number
      }
      has_partner_scope: {
        Args: { scope: string; tenant_a: string; tenant_b: string }
        Returns: boolean
      }
      is_active_partner: {
        Args: { tenant_a: string; tenant_b: string }
        Returns: boolean
      }
      is_sys_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_manager_or_admin: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      shares_tenant_with: { Args: { target_user_id: string }; Returns: boolean }
      submit_vendor_invoice: {
        Args: {
          p_account_holder?: string
          p_account_number?: string
          p_amount: number
          p_bank_name?: string
          p_business_number?: string
          p_description?: string
          p_tenant_id: string
          p_vendor_name: string
        }
        Returns: string
      }
      user_has_partner_hr_scope: {
        Args: { _target_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      company_type:
        | "talent_agency"
        | "pr_agency"
        | "finance_outsourcing"
        | "marketing_agency"
        | "production_agency"
        | "sales_agency"
      system_role: "sys_super_admin" | "regular_user"
      tenant_role: "company_admin" | "manager" | "employee"
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
      company_type: [
        "talent_agency",
        "pr_agency",
        "finance_outsourcing",
        "marketing_agency",
        "production_agency",
        "sales_agency",
      ],
      system_role: ["sys_super_admin", "regular_user"],
      tenant_role: ["company_admin", "manager", "employee"],
    },
  },
} as const
