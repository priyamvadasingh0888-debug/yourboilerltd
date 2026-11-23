export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'office_staff' | 'engineer'
export type CustomerType = 'homeowner' | 'landlord' | 'letting_agent' | 'commercial' | 'house_association'
export type PropertyType = 'residential' | 'commercial' | 'hmo' | 'other'
export type JobType = 'boiler_installation' | 'boiler_repair' | 'gas_safety_check' | 'annual_service' | 'central_heating' | 'plumbing' | 'emergency_callout' | 'other'
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'emergency'
export type AvailabilityStatus = 'available' | 'on_job' | 'off_duty'
export type SafetyResult = 'pass' | 'fail' | 'at_risk' | 'immediately_dangerous'
export type CertificateStatus = 'draft' | 'issued' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InquiryStatus = 'new' | 'in_review' | 'rejected' | 'converted'
export type EngineerCategory = 'in_house' | 'subcontractor'
export type ScheduleTimeSlot = 'morning' | 'afternoon' | 'evening' | 'custom'
export type InspectionServiceType = 'boiler_service_cp12' | 'gas_inspection' | 'fire_alarm' | 'electrical_inspection'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          phone: string | null
          email: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      engineers: {
        Row: {
          id: string
          profile_id: string
          gas_safe_number: string | null
          gas_safe_expiry: string | null
          phone: string | null
          specialties: string[]
          availability_status: AvailabilityStatus
          schedule_colour: string
          category?: EngineerCategory | null
          qualifications?: string[] | null
          license_number?: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['engineers']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['engineers']['Insert']>
        Relationships: [
          {
            foreignKeyName: "engineers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      engineer_documents: {
        Row: {
          id: string
          engineer_id: string
          document_name: string
          file_url: string
          file_type: string
          file_size_bytes: number | null
          expiry_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['engineer_documents']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['engineer_documents']['Insert']>
        Relationships: [
          {
            foreignKeyName: "engineer_documents_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          type: CustomerType
          name: string
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          customer_id: string
          address_line1: string
          address_line2: string | null
          city: string
          postcode: string
          type: PropertyType
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          job_number: string
          customer_id: string
          property_id: string
          engineer_id: string | null
          job_type: JobType
          status: JobStatus
          priority: Priority
          scheduled_start: string | null
          duration_minutes: number
          description: string | null
          completion_notes: string | null
          parts_used: Json
          quoted_amount: number | null
          actual_amount: number | null
          created_by: string | null
          time_slot?: ScheduleTimeSlot | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_number?: string
          customer_id: string
          property_id: string
          engineer_id?: string | null
          job_type: JobType
          status?: JobStatus
          priority?: Priority
          scheduled_start?: string | null
          duration_minutes?: number
          description?: string | null
          completion_notes?: string | null
          parts_used?: Json
          quoted_amount?: number | null
          actual_amount?: number | null
          created_by?: string | null
          time_slot?: ScheduleTimeSlot | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      job_status_history: {
        Row: {
          id: string
          job_id: string
          from_status: JobStatus | null
          to_status: JobStatus
          changed_by: string | null
          changed_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_status_history']['Row'], 'id' | 'changed_at'>
        Update: Partial<Database['public']['Tables']['job_status_history']['Insert']>
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      certificates: {
        Row: {
          id: string
          certificate_number: string
          job_id: string
          customer_id: string
          property_id: string
          engineer_id: string
          landlord_name: string | null
          landlord_address: string | null
          company_name: string | null
          company_address: string | null
          gas_safe_registration: string | null
          operative_name: string | null
          operative_id: string | null
          safety_result: SafetyResult | null
          defects: string | null
          remedial_actions: string | null
          smoke_alarm_ok: boolean | null
          co_alarm_ok: boolean | null
          engineer_signature: string | null
          customer_signature: string | null
          issued_at: string | null
          expires_at: string | null
          status: CertificateStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['certificates']['Row'], 'id' | 'created_at' | 'updated_at' | 'certificate_number'> & {
          id?: string
          certificate_number?: string
        }
        Update: Partial<Database['public']['Tables']['certificates']['Insert']>
        Relationships: [
          {
            foreignKeyName: "certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          }
        ]
      }
      certificate_appliances: {
        Row: {
          id: string
          certificate_id: string
          appliance_type: string
          make_model: string | null
          location: string | null
          flue_type: string | null
          heat_input: string | null
          gas_rate: string | null
          working_pressure: string | null
          combustion_reading: string | null
          service_completed: boolean
          visual_condition: string | null
          safe_to_use: boolean | null
          operating_pressure?: string | null
          high_combustion_co_ppm?: number | null
          high_combustion_co2_pct?: number | null
          high_combustion_ratio?: number | null
          low_combustion_co_ppm?: number | null
          low_combustion_co2_pct?: number | null
          low_combustion_ratio?: number | null
          spillage_test?: string | null
          visual_flue_condition?: string | null
          termination_satisfactory?: boolean | null
          flue_performance_check?: string | null
        }
        Insert: Omit<Database['public']['Tables']['certificate_appliances']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['certificate_appliances']['Insert']>
        Relationships: [
          {
            foreignKeyName: "certificate_appliances_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          }
        ]
      }
      certificate_alarms: {
        Row: {
          id: string
          certificate_id: string
          location: string
          alarm_type: 'CO' | 'Smoke'
          approved_fitted: boolean
          expiry_date: string | null
          test_satisfactory: boolean
          power_source: 'Battery' | 'Hardwired'
          replacement_required: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['certificate_alarms']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['certificate_alarms']['Insert']>
        Relationships: [
          {
            foreignKeyName: "certificate_alarms_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          }
        ]
      }
      service_reminders: {
        Row: {
          id: string
          customer_id: string
          property_id: string
          service_type: InspectionServiceType
          interval_months: number
          last_service_date: string | null
          expiry_date: string
          next_reminder_date: string
          preferred_time_slot: ScheduleTimeSlot
          status: 'active' | 'paused' | 'booked' | 'expired'
          reminders_sent_count: number
          last_reminder_sent_at: string | null
          last_email_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['service_reminders']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['service_reminders']['Insert']>
        Relationships: [
          {
            foreignKeyName: "service_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_templates: {
        Row: {
          id: string
          customer_id: string
          property_id: string
          job_type: JobType
          interval_months: number
          last_completed_at: string | null
          next_due_at: string | null
          default_engineer_id: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recurring_templates']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recurring_templates']['Insert']>
        Relationships: [
          {
            foreignKeyName: "recurring_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_default_engineer_id_fkey"
            columns: ["default_engineer_id"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          job_id: string | null
          customer_id: string
          status: InvoiceStatus
          issue_date: string | null
          due_date: string | null
          paid_at: string | null
          vat_rate: number
          subtotal: number
          vat_amount: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'created_at' | 'updated_at' | 'invoice_number'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          line_total: number
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'line_total'>
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      inquiries: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          service_type: string | null
          description: string | null
          address: string | null
          postcode: string | null
          preferred_date: string | null
          status: InquiryStatus
          converted_job_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inquiries']['Row'], 'id' | 'created_at' | 'status' | 'converted_job_id'>
        Update: Partial<Database['public']['Tables']['inquiries']['Row']>
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys: Json
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          job_id: string | null
          payload: Json
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read_at'> & { read_at?: string | null }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      customer_type: CustomerType
      property_type: PropertyType
      job_type: JobType
      job_status: JobStatus
      priority: Priority
      availability_status: AvailabilityStatus
      safety_result: SafetyResult
      certificate_status: CertificateStatus
      invoice_status: InvoiceStatus
      inquiry_status: InquiryStatus
      engineer_category: EngineerCategory
      schedule_time_slot: ScheduleTimeSlot
      inspection_service_type: InspectionServiceType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Enriched / joined types used throughout the app
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Engineer = Database['public']['Tables']['engineers']['Row']
export type EngineerDocument = Database['public']['Tables']['engineer_documents']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type JobStatusHistory = Database['public']['Tables']['job_status_history']['Row']
export type Certificate = Database['public']['Tables']['certificates']['Row']
export type CertificateAppliance = Database['public']['Tables']['certificate_appliances']['Row']
export type CertificateAlarm = Database['public']['Tables']['certificate_alarms']['Row']
export type ServiceReminder = Database['public']['Tables']['service_reminders']['Row']
export type RecurringTemplate = Database['public']['Tables']['recurring_templates']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Joined types
export type EngineerWithProfile = Engineer & { profile: Profile }
export type JobWithRelations = Job & {
  customer: Customer
  property: Property
  engineer?: EngineerWithProfile | null
}
export type InvoiceWithItems = Invoice & { items: InvoiceItem[]; customer: Customer }
export type CertificateWithAppliances = Certificate & { appliances: CertificateAppliance[] }

// Part item type for parts_used jsonb
export interface PartItem {
  name: string
  quantity: number
  cost: number
}

// Dashboard stats
export interface DashboardStats {
  todaysJobs: number
  activeJobs: number
  availableEngineers: number
  outstandingInvoiceTotal: number
  newInquiries: number
  expiringGasSafe: number
}

// Allowed job status transitions
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['invoiced'],
  invoiced: [],
  cancelled: [],
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  boiler_installation: 'Boiler Installation',
  boiler_repair: 'Boiler Repair',
  gas_safety_check: 'Gas Safety Check',
  annual_service: 'Annual Service',
  central_heating: 'Central Heating',
  plumbing: 'Plumbing',
  emergency_callout: 'Emergency Callout',
  other: 'Other',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  emergency: 'Emergency',
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  homeowner: 'Homeowner',
  landlord: 'Landlord',
  letting_agent: 'Letting Agent',
  commercial: 'Commercial',
  house_association: 'Housing Association',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  hmo: 'HMO',
  other: 'Other',
}

export const ENGINEER_CATEGORY_LABELS: Record<EngineerCategory, string> = {
  in_house: 'In-House Staff',
  subcontractor: 'Subcontractor',
}

export const SCHEDULE_TIME_SLOT_LABELS: Record<ScheduleTimeSlot, string> = {
  morning: 'Morning (08:00 – 12:00)',
  afternoon: 'Afternoon (12:00 – 16:00)',
  evening: 'Evening (16:00 – 20:00)',
  custom: 'Custom Time',
}

export const INSPECTION_SERVICE_LABELS: Record<InspectionServiceType, string> = {
  boiler_service_cp12: 'Boiler Service (CP12)',
  gas_inspection: 'Gas Inspection Service',
  fire_alarm: 'Fire Alarm System (BS 5839)',
  electrical_inspection: 'Electrical Inspection (EICR)',
}

export const INSPECTION_SERVICE_INTERVALS: Record<InspectionServiceType, number> = {
  boiler_service_cp12: 12, // 12 months
  gas_inspection: 12,      // 12 months
  fire_alarm: 6,           // 6 months
  electrical_inspection: 36, // 36 or 60 months (3 or 5 years)
}

