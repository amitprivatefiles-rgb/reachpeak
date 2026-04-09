export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'user'
          is_active: boolean
          whatsapp_api_key: string | null
          whatsapp_api_url: string | null
          webhook_url: string | null
          notification_email: boolean
          notification_in_app: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'user'
          is_active?: boolean
          whatsapp_api_key?: string | null
          whatsapp_api_url?: string | null
          webhook_url?: string | null
          notification_email?: boolean
          notification_in_app?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'user'
          is_active?: boolean
          whatsapp_api_key?: string | null
          whatsapp_api_url?: string | null
          webhook_url?: string | null
          notification_email?: boolean
          notification_in_app?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          name: string
          type: 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder'
          start_time: string | null
          end_time: string | null
          total_numbers: number
          messages_sent: number
          messages_failed: number
          pending_retry: number
          delivery_percentage: number
          failure_percentage: number
          priority: number
          message_version: 'A' | 'B'
          campaign_cost: number
          estimated_revenue: number
          roi: number
          status: 'draft' | 'pending_approval' | 'approved' | 'Running' | 'Paused' | 'Completed' | 'Processing' | 'rejected' | 'Cancelled'
          is_locked: boolean
          daily_limit: number
          file_url: string | null
          file_name: string | null
          message_template: string | null
          message_buttons: Json | null
          auto_increment_enabled: boolean
          auto_increment_total: number
          auto_increment_sent_ratio: number
          auto_increment_failed_ratio: number
          auto_increment_interval: number
          auto_increment_complete_at: string | null
          last_auto_increment: string | null
          created_by: string | null
          submitted_at: string | null
          approved_at: string | null
          approved_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          scheduled_start: string | null
          selected_audience: Json | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder'
          start_time?: string | null
          end_time?: string | null
          total_numbers?: number
          messages_sent?: number
          messages_failed?: number
          pending_retry?: number
          delivery_percentage?: number
          failure_percentage?: number
          priority?: number
          message_version?: 'A' | 'B'
          campaign_cost?: number
          estimated_revenue?: number
          roi?: number
          status?: 'draft' | 'pending_approval' | 'approved' | 'Running' | 'Paused' | 'Completed' | 'Processing' | 'rejected' | 'Cancelled'
          is_locked?: boolean
          daily_limit?: number
          file_url?: string | null
          file_name?: string | null
          message_template?: string | null
          message_buttons?: Json | null
          auto_increment_enabled?: boolean
          auto_increment_total?: number
          auto_increment_sent_ratio?: number
          auto_increment_failed_ratio?: number
          auto_increment_interval?: number
          auto_increment_complete_at?: string | null
          last_auto_increment?: string | null
          created_by?: string | null
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_start?: string | null
          selected_audience?: Json | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder'
          start_time?: string | null
          end_time?: string | null
          total_numbers?: number
          messages_sent?: number
          messages_failed?: number
          pending_retry?: number
          delivery_percentage?: number
          failure_percentage?: number
          priority?: number
          message_version?: 'A' | 'B'
          campaign_cost?: number
          estimated_revenue?: number
          roi?: number
          status?: 'draft' | 'pending_approval' | 'approved' | 'Running' | 'Paused' | 'Completed' | 'Processing' | 'rejected' | 'Cancelled'
          is_locked?: boolean
          daily_limit?: number
          file_url?: string | null
          file_name?: string | null
          message_template?: string | null
          message_buttons?: Json | null
          auto_increment_enabled?: boolean
          auto_increment_total?: number
          auto_increment_sent_ratio?: number
          auto_increment_failed_ratio?: number
          auto_increment_interval?: number
          auto_increment_complete_at?: string | null
          last_auto_increment?: string | null
          created_by?: string | null
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_start?: string | null
          selected_audience?: Json | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaigns_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      contacts: {
        Row: {
          id: string
          phone_number: string
          name: string | null
          source: 'Excel' | 'Facebook' | 'Instagram' | 'Website' | 'WhatsApp' | 'Manual'
          city: string | null
          state: string | null
          campaign_id: string | null
          message_status: 'Pending' | 'Sent' | 'Failed' | 'Retry'
          delivery_status: 'Delivered' | 'Failed' | 'Pending'
          attempt_count: number
          last_sent_date: string | null
          lead_type: 'Hot' | 'Warm' | 'Cold'
          notes: string | null
          is_blacklisted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          name?: string | null
          source: 'Excel' | 'Facebook' | 'Instagram' | 'Website' | 'WhatsApp' | 'Manual'
          city?: string | null
          state?: string | null
          campaign_id?: string | null
          message_status?: 'Pending' | 'Sent' | 'Failed' | 'Retry'
          delivery_status?: 'Delivered' | 'Failed' | 'Pending'
          attempt_count?: number
          last_sent_date?: string | null
          lead_type?: 'Hot' | 'Warm' | 'Cold'
          notes?: string | null
          is_blacklisted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          name?: string | null
          source?: 'Excel' | 'Facebook' | 'Instagram' | 'Website' | 'WhatsApp' | 'Manual'
          city?: string | null
          state?: string | null
          campaign_id?: string | null
          message_status?: 'Pending' | 'Sent' | 'Failed' | 'Retry'
          delivery_status?: 'Delivered' | 'Failed' | 'Pending'
          attempt_count?: number
          last_sent_date?: string | null
          lead_type?: 'Hot' | 'Warm' | 'Cold'
          notes?: string | null
          is_blacklisted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contacts_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          }
        ]
      }
      failed_messages: {
        Row: {
          id: string
          phone_number: string
          contact_id: string | null
          campaign_id: string | null
          failure_reason: string | null
          attempt_count: number
          last_attempt_date: string
          status: 'Retry Pending' | 'Completed' | 'Blacklisted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          contact_id?: string | null
          campaign_id?: string | null
          failure_reason?: string | null
          attempt_count?: number
          last_attempt_date?: string
          status?: 'Retry Pending' | 'Completed' | 'Blacklisted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          contact_id?: string | null
          campaign_id?: string | null
          failure_reason?: string | null
          attempt_count?: number
          last_attempt_date?: string
          status?: 'Retry Pending' | 'Completed' | 'Blacklisted'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'failed_messages_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'failed_messages_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          }
        ]
      }
      agents: {
        Row: {
          id: string
          name: string
          email: string
          is_active: boolean
          campaigns_handled: number
          numbers_processed: number
          failures: number
          conversions: number
          follow_ups: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          is_active?: boolean
          campaigns_handled?: number
          numbers_processed?: number
          failures?: number
          conversions?: number
          follow_ups?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_active?: boolean
          campaigns_handled?: number
          numbers_processed?: number
          failures?: number
          conversions?: number
          follow_ups?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_agents: {
        Row: {
          id: string
          campaign_id: string
          agent_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          agent_id: string
          assigned_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          agent_id?: string
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_agents_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaign_agents_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          }
        ]
      }
      lead_sources: {
        Row: {
          id: string
          source_name: string
          total_numbers: number
          messages_sent: number
          messages_failed: number
          converted_leads: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_name: string
          total_numbers?: number
          messages_sent?: number
          messages_failed?: number
          converted_leads?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_name?: string
          total_numbers?: number
          messages_sent?: number
          messages_failed?: number
          converted_leads?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: 'monthly' | 'yearly'
          amount: number
          payment_reference: string
          status: 'pending' | 'active' | 'rejected' | 'expired'
          rejection_reason: string | null
          business_name: string
          business_type: string
          whatsapp_number: string
          website_url: string | null
          logo_url: string | null
          business_address: string | null
          contact_person: string
          approved_by: string | null
          approved_at: string | null
          starts_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'monthly' | 'yearly'
          amount: number
          payment_reference: string
          status?: 'pending' | 'active' | 'rejected' | 'expired'
          rejection_reason?: string | null
          business_name: string
          business_type: string
          whatsapp_number: string
          website_url?: string | null
          logo_url?: string | null
          business_address?: string | null
          contact_person: string
          approved_by?: string | null
          approved_at?: string | null
          starts_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'monthly' | 'yearly'
          amount?: number
          payment_reference?: string
          status?: 'pending' | 'active' | 'rejected' | 'expired'
          rejection_reason?: string | null
          business_name?: string
          business_type?: string
          whatsapp_number?: string
          website_url?: string | null
          logo_url?: string | null
          business_address?: string | null
          contact_person?: string
          approved_by?: string | null
          approved_at?: string | null
          starts_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      dashboard_metrics: {
        Row: {
          id: string
          metric_date: string
          total_contacts: number
          total_numbers_uploaded: number
          total_messages_sent: number
          total_messages_failed: number
          messages_pending_retry: number
          active_campaigns: number
          completed_campaigns: number
          delivery_rate: number
          failure_rate: number
          blacklisted_numbers: number
          active_agents: number
          last_upload_time: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          metric_date?: string
          total_contacts?: number
          total_numbers_uploaded?: number
          total_messages_sent?: number
          total_messages_failed?: number
          messages_pending_retry?: number
          active_campaigns?: number
          completed_campaigns?: number
          delivery_rate?: number
          failure_rate?: number
          blacklisted_numbers?: number
          active_agents?: number
          last_upload_time?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          metric_date?: string
          total_contacts?: number
          total_numbers_uploaded?: number
          total_messages_sent?: number
          total_messages_failed?: number
          messages_pending_retry?: number
          active_campaigns?: number
          completed_campaigns?: number
          delivery_rate?: number
          failure_rate?: number
          blacklisted_numbers?: number
          active_agents?: number
          last_upload_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          id: string
          campaign_id: string
          contact_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          contact_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          contact_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_contacts_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaign_contacts_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'campaign_approved' | 'campaign_rejected' | 'campaign_completed' | 'campaign_cancelled' | 'system'
          is_read: boolean
          campaign_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'campaign_approved' | 'campaign_rejected' | 'campaign_completed' | 'campaign_cancelled' | 'system'
          is_read?: boolean
          campaign_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'campaign_approved' | 'campaign_rejected' | 'campaign_completed' | 'campaign_cancelled' | 'system'
          is_read?: boolean
          campaign_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          }
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          id: string
          contact_id: string
          tag_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          tag_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          tag_id?: string
          user_id?: string
          created_at?: string
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
