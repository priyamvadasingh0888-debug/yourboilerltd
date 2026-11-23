-- ============================================================
-- YOUR BOILER LTD — MASTER PRODUCTION DATABASE SCHEMA
-- Purpose: Complete, unified, production-ready PostgreSQL DDL
-- Execute in: Supabase Dashboard -> SQL Editor -> Run
-- Contains: Tables, Enums, Foreign Keys, Indexes, Functions,
--           Triggers, RLS Policies, Storage Buckets, and Realtime.
-- Note: Zero dummy/mock data. Clean production database.
-- ============================================================

-- ─── 1. EXTENSIONS ──────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

do $$
begin
  create extension if not exists "pg_cron";
exception
  when others then null;
end $$;

-- ─── 2. ENUMS & CUSTOM TYPES ────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'office_staff', 'engineer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_type as enum ('homeowner', 'landlord', 'letting_agent', 'commercial', 'house_association');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum ('residential', 'commercial', 'hmo', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_type_enum as enum (
    'boiler_installation', 'boiler_repair', 'gas_safety_check',
    'annual_service', 'central_heating', 'plumbing', 'emergency_callout', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status_enum as enum ('scheduled', 'in_progress', 'completed', 'invoiced', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_enum as enum ('low', 'medium', 'high', 'emergency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_status_enum as enum ('available', 'on_job', 'off_duty');
exception when duplicate_object then null; end $$;

do $$ begin
  create type safety_result_enum as enum ('pass', 'fail', 'at_risk', 'immediately_dangerous');
exception when duplicate_object then null; end $$;

do $$ begin
  create type certificate_status_enum as enum ('draft', 'issued', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status_enum as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status_enum as enum ('new', 'in_review', 'rejected', 'converted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interval_months_enum as enum ('3', '6', '12', '60');
exception when duplicate_object then null; end $$;

do $$ begin
  create type engineer_category as enum ('in_house', 'subcontractor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_time_slot as enum ('morning', 'afternoon', 'evening', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inspection_service_type as enum (
    'boiler_service_cp12',
    'gas_inspection',
    'fire_alarm',
    'electrical_inspection'
  );
exception when duplicate_object then null; end $$;

-- ─── 3. CORE APPLICATION TABLES ─────────────────────────────

-- Profiles: 1-to-1 extension of Supabase auth.users
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'engineer',
  full_name   text not null,
  phone       text,
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Engineers: Technical certifications, Gas Safe badge, category
create table if not exists engineers (
  id                  uuid primary key default uuid_generate_v4(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  gas_safe_number     text,
  gas_safe_expiry     date,
  license_number      text,
  category            engineer_category not null default 'in_house',
  qualifications      text[] default '{}',
  phone               text,
  specialties         text[] default '{}',
  availability_status availability_status_enum not null default 'available',
  schedule_colour     text not null default '#6366f1',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(profile_id)
);

-- Engineer Document Vault: Multi-format compliance store (PDF, JPG, PNG)
create table if not exists engineer_documents (
  id              uuid primary key default gen_random_uuid(),
  engineer_id     uuid not null references engineers(id) on delete cascade,
  document_name   text not null,
  file_url        text not null,
  file_type       text not null,
  file_size_bytes bigint,
  expiry_date     date,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_engineer_docs_engineer_id on engineer_documents(engineer_id);

-- Customers: Homeowners, Landlords, Agencies, Housing Associations
create table if not exists customers (
  id         uuid primary key default uuid_generate_v4(),
  type       customer_type not null default 'homeowner',
  name       text not null,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_type on customers(type);

-- Properties: Serviced premises linked to customers
create table if not exists properties (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references customers(id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city          text not null,
  postcode      text not null,
  type          property_type not null default 'residential',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_properties_customer_id on properties(customer_id);
create index if not exists idx_properties_postcode on properties(postcode);

-- Jobs: Service work orders & dispatches
create table if not exists jobs (
  id                uuid primary key default uuid_generate_v4(),
  job_number        text unique not null,
  customer_id       uuid not null references customers(id),
  property_id       uuid not null references properties(id),
  engineer_id       uuid references engineers(id),
  job_type          job_type_enum not null,
  status            job_status_enum not null default 'scheduled',
  priority          priority_enum not null default 'medium',
  time_slot         schedule_time_slot default 'custom',
  scheduled_start   timestamptz,
  duration_minutes  integer default 60,
  description       text,
  completion_notes  text,
  parts_used        jsonb default '[]'::jsonb,
  quoted_amount     decimal(10,2),
  actual_amount     decimal(10,2),
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_engineer_id on jobs(engineer_id);
create index if not exists idx_jobs_customer_id on jobs(customer_id);
create index if not exists idx_jobs_scheduled_start on jobs(scheduled_start);

-- Job Status Audit Trail
create table if not exists job_status_history (
  id          uuid primary key default uuid_generate_v4(),
  job_id      uuid not null references jobs(id) on delete cascade,
  from_status job_status_enum,
  to_status   job_status_enum not null,
  changed_by  uuid references profiles(id),
  changed_at  timestamptz not null default now(),
  notes       text
);
create index if not exists idx_jsh_job_id on job_status_history(job_id);

-- Job Internal Notes
create table if not exists job_notes (
  id         uuid primary key default uuid_generate_v4(),
  job_id     uuid not null references jobs(id) on delete cascade,
  author_id  uuid not null references profiles(id),
  content    text not null,
  created_at timestamptz not null default now()
);

-- Job Photos: Site documentation & proof of work
create table if not exists job_photos (
  id         uuid primary key default uuid_generate_v4(),
  job_id     uuid not null references jobs(id) on delete cascade,
  url        text not null,
  caption    text,
  taken_at   timestamptz not null default now()
);

-- Gas Safety Certificates (CP12 Record)
create table if not exists certificates (
  id                    uuid primary key default uuid_generate_v4(),
  certificate_number    text unique not null,
  job_id                uuid references jobs(id),
  customer_id           uuid not null references customers(id),
  property_id           uuid not null references properties(id),
  engineer_id           uuid not null references engineers(id),
  operative_name        text,
  gas_safe_registration text,
  company_name          text default 'Your Boiler Ltd',
  company_address       text default '895 Osmaston Road, Allenton, DE24 9BR',
  company_phone         text default '07973 432698',
  landlord_name         text,
  status                certificate_status_enum not null default 'draft',
  safety_result         safety_result_enum not null default 'pass',
  issued_at             timestamptz,
  expires_at            timestamptz,
  pdf_url               text,
  signature_url         text,
  engineer_signature_url text,
  customer_signature_url text,
  received_by           text,
  pipework_visual_inspection_ok boolean default true,
  emergency_control_accessible  boolean default true,
  gas_tightness_test_ok         boolean default true,
  equipotential_bonding_ok      boolean default true,
  notes                         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_certs_property_id on certificates(property_id);
create index if not exists idx_certs_status on certificates(status);

-- CP12 Appliance Matrix with Combustion Readings
create table if not exists certificate_appliances (
  id                    uuid primary key default uuid_generate_v4(),
  certificate_id        uuid not null references certificates(id) on delete cascade,
  location              text not null,
  appliance_type        text not null,
  make                  text not null,
  model                 text not null,
  flue_type             text default 'RS',
  operating_pressure    text,
  heat_input            text,
  safety_device_ok      boolean not null default true,
  ventilation_ok        boolean not null default true,
  visual_flue_ok        text default 'Pass',
  termination_ok        text default 'Pass',
  flue_performance_check text,
  high_co_ppm           int,
  high_co2_pct          numeric(4,2),
  high_ratio            numeric(6,4),
  low_co_ppm            int,
  low_co2_pct           numeric(4,2),
  low_ratio             numeric(6,4),
  spillage_test         text default 'N/A',
  serviced              boolean default false,
  safe_to_use           boolean not null default true,
  notes                 text
);

-- CP12 Smoke & Carbon Monoxide (CO) Alarms Grid
create table if not exists certificate_alarms (
  id                    uuid primary key default gen_random_uuid(),
  certificate_id        uuid not null references certificates(id) on delete cascade,
  location              text not null,
  alarm_type            text not null default 'CO',
  approved_fitted       boolean default true,
  expiry_date           date,
  test_satisfactory     boolean default true,
  power_source          text default 'Battery',
  replacement_required  boolean default false,
  created_at            timestamptz default now()
);
create index if not exists idx_cert_alarms_cert_id on certificate_alarms(certificate_id);

-- Invoices & Billing
create table if not exists invoices (
  id             uuid primary key default uuid_generate_v4(),
  invoice_number text unique not null,
  job_id         uuid not null references jobs(id),
  customer_id    uuid not null references customers(id),
  status         invoice_status_enum not null default 'draft',
  subtotal       decimal(10,2) not null default 0,
  vat_rate       decimal(4,2) not null default 0.20,
  vat_amount     decimal(10,2) not null default 0,
  total          decimal(10,2) not null default 0,
  due_date       date not null,
  paid_at        timestamptz,
  pdf_url        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_customer_id on invoices(customer_id);

-- Invoice Line Items
create table if not exists invoice_items (
  id          uuid primary key default uuid_generate_v4(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity    decimal(6,2) not null default 1,
  unit_price  decimal(10,2) not null,
  amount      decimal(10,2) not null
);

-- Public Customer Inquiries
create table if not exists inquiries (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  email          text not null,
  phone          text not null,
  postcode       text not null,
  address_line1  text,
  service_type   job_type_enum not null,
  preferred_date date,
  notes          text,
  status         inquiry_status_enum not null default 'new',
  converted_job_id uuid references jobs(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_inquiries_status on inquiries(status);

-- Recurring Compliance Inspection Templates (12m, 6m, 3y, 5y)
create table if not exists recurring_templates (
  id                  uuid primary key default uuid_generate_v4(),
  customer_id         uuid not null references customers(id) on delete cascade,
  property_id         uuid not null references properties(id) on delete cascade,
  default_engineer_id uuid references engineers(id),
  job_type            job_type_enum not null,
  interval_months     interval_months_enum not null default '12',
  preferred_time_slot schedule_time_slot default 'morning',
  estimated_cost      decimal(10,2),
  active              boolean not null default true,
  last_completed_at   timestamptz,
  next_due_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_recurring_next_due on recurring_templates(next_due_at);

-- Dedicated Service Reminders Table
create table if not exists service_reminders (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references customers(id) on delete cascade,
  property_id           uuid not null references properties(id) on delete cascade,
  service_type          inspection_service_type not null,
  interval_months       int not null default 12,
  last_service_date     date,
  expiry_date           date not null,
  next_reminder_date    date not null,
  preferred_time_slot   schedule_time_slot default 'morning',
  status                text not null default 'active',
  reminders_sent_count  int not null default 0,
  last_reminder_sent_at timestamptz,
  last_email_id         text,
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index if not exists idx_reminders_expiry on service_reminders(expiry_date);
create index if not exists idx_reminders_status on service_reminders(status);

-- PWA Mobile Push Subscriptions
create table if not exists push_subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

-- Notifications
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  job_id     uuid references jobs(id) on delete set null,
  read       boolean not null default false,
  payload    jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifs_user on notifications(user_id, read);

-- ─── 4. TRIGGERS & FUNCTIONS ────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger trg_engineers_updated_at before update on engineers for each row execute function update_updated_at();
create trigger trg_customers_updated_at before update on customers for each row execute function update_updated_at();
create trigger trg_properties_updated_at before update on properties for each row execute function update_updated_at();
create trigger trg_jobs_updated_at before update on jobs for each row execute function update_updated_at();
create trigger trg_certificates_updated_at before update on certificates for each row execute function update_updated_at();
create trigger trg_invoices_updated_at before update on invoices for each row execute function update_updated_at();
create trigger trg_recurring_templates_updated_at before update on recurring_templates for each row execute function update_updated_at();
create trigger trg_service_reminders_updated_at before update on service_reminders for each row execute function update_updated_at();

-- Auto-provision Profile and Engineer record on auth.users signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role_val user_role;
begin
  user_role_val := coalesce((new.raw_user_meta_data->>'role')::user_role, 'engineer');

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    user_role_val
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);

  -- If signing up as engineer, automatically create engineers table row
  if user_role_val = 'engineer' then
    insert into public.engineers (profile_id, availability_status, schedule_colour)
    values (new.id, 'available', '#6366f1')
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper Functions for Row Level Security
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_office_or_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'office_staff')
  );
$$;

create or replace function current_engineer_id()
returns uuid language sql security definer stable as $$
  select id from engineers where profile_id = auth.uid() limit 1;
$$;

create or replace function is_engineer()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'engineer'
  );
$$;

-- ─── 5. ROW LEVEL SECURITY (RLS) ────────────────────────────

alter table profiles enable row level security;
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (id = auth.uid() or is_office_or_admin());
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update using (id = auth.uid() or is_admin());
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (is_admin());

alter table engineers enable row level security;
drop policy if exists "engineers_select" on engineers;
create policy "engineers_select" on engineers for select using (is_office_or_admin() or profile_id = auth.uid());
drop policy if exists "engineers_insert" on engineers;
create policy "engineers_insert" on engineers for insert with check (is_admin());
drop policy if exists "engineers_update" on engineers;
create policy "engineers_update" on engineers for update using (is_admin() or (is_engineer() and profile_id = auth.uid()));
drop policy if exists "engineers_delete" on engineers;
create policy "engineers_delete" on engineers for delete using (is_admin());

alter table engineer_documents enable row level security;
drop policy if exists "engineer_docs_admin_all" on engineer_documents;
create policy "engineer_docs_admin_all" on engineer_documents for all using (is_office_or_admin());
drop policy if exists "engineer_docs_own" on engineer_documents;
create policy "engineer_docs_own" on engineer_documents for select using (engineer_id = current_engineer_id());

alter table customers enable row level security;
drop policy if exists "customers_office_all" on customers;
create policy "customers_office_all" on customers for all using (is_office_or_admin());
drop policy if exists "customers_engineer_select" on customers;
create policy "customers_engineer_select" on customers for select using (
  is_engineer() and exists (
    select 1 from jobs where jobs.customer_id = customers.id and jobs.engineer_id = current_engineer_id()
  )
);

alter table properties enable row level security;
drop policy if exists "properties_office_all" on properties;
create policy "properties_office_all" on properties for all using (is_office_or_admin());
drop policy if exists "properties_engineer_select" on properties;
create policy "properties_engineer_select" on properties for select using (
  is_engineer() and exists (
    select 1 from jobs where jobs.property_id = properties.id and jobs.engineer_id = current_engineer_id()
  )
);

alter table jobs enable row level security;
drop policy if exists "jobs_office_all" on jobs;
create policy "jobs_office_all" on jobs for all using (is_office_or_admin());
drop policy if exists "jobs_engineer_select" on jobs;
create policy "jobs_engineer_select" on jobs for select using (is_engineer() and engineer_id = current_engineer_id());
drop policy if exists "jobs_engineer_update" on jobs;
create policy "jobs_engineer_update" on jobs for update using (is_engineer() and engineer_id = current_engineer_id());

alter table job_status_history enable row level security;
drop policy if exists "jsh_office_all" on job_status_history;
create policy "jsh_office_all" on job_status_history for all using (is_office_or_admin());
drop policy if exists "jsh_engineer_select" on job_status_history;
create policy "jsh_engineer_select" on job_status_history for select using (
  is_engineer() and exists (
    select 1 from jobs where jobs.id = job_status_history.job_id and jobs.engineer_id = current_engineer_id()
  )
);

alter table certificates enable row level security;
drop policy if exists "certs_office_all" on certificates;
create policy "certs_office_all" on certificates for all using (is_office_or_admin());
drop policy if exists "certs_engineer_select" on certificates;
create policy "certs_engineer_select" on certificates for select using (is_engineer() and engineer_id = current_engineer_id());
drop policy if exists "certs_engineer_insert" on certificates;
create policy "certs_engineer_insert" on certificates for insert with check (is_engineer() and engineer_id = current_engineer_id());
drop policy if exists "certs_engineer_update" on certificates;
create policy "certs_engineer_update" on certificates for update using (is_engineer() and engineer_id = current_engineer_id());

alter table certificate_appliances enable row level security;
drop policy if exists "cert_appl_office_all" on certificate_appliances;
create policy "cert_appl_office_all" on certificate_appliances for all using (is_office_or_admin());
drop policy if exists "cert_appl_engineer" on certificate_appliances;
create policy "cert_appl_engineer" on certificate_appliances for all using (
  is_engineer() and exists (
    select 1 from certificates where certificates.id = certificate_appliances.certificate_id and certificates.engineer_id = current_engineer_id()
  )
);

alter table certificate_alarms enable row level security;
drop policy if exists "cert_alarms_office_all" on certificate_alarms;
create policy "cert_alarms_office_all" on certificate_alarms for all using (is_office_or_admin());
drop policy if exists "cert_alarms_engineer" on certificate_alarms;
create policy "cert_alarms_engineer" on certificate_alarms for all using (
  is_engineer() and exists (
    select 1 from certificates where certificates.id = certificate_alarms.certificate_id and certificates.engineer_id = current_engineer_id()
  )
);

alter table recurring_templates enable row level security;
drop policy if exists "templates_office_all" on recurring_templates;
create policy "templates_office_all" on recurring_templates for all using (is_office_or_admin());

alter table service_reminders enable row level security;
drop policy if exists "reminders_office_all" on service_reminders;
create policy "reminders_office_all" on service_reminders for all using (is_office_or_admin());
drop policy if exists "reminders_engineer_select" on service_reminders;
create policy "reminders_engineer_select" on service_reminders for select using (is_engineer());

alter table invoices enable row level security;
drop policy if exists "invoices_office_all" on invoices;
create policy "invoices_office_all" on invoices for all using (is_office_or_admin());

alter table invoice_items enable row level security;
drop policy if exists "invoice_items_office_all" on invoice_items;
create policy "invoice_items_office_all" on invoice_items for all using (is_office_or_admin());

alter table inquiries enable row level security;
drop policy if exists "inquiries_anon_insert" on inquiries;
create policy "inquiries_anon_insert" on inquiries for insert with check (true);
drop policy if exists "inquiries_office_all" on inquiries;
create policy "inquiries_office_all" on inquiries for all using (is_office_or_admin());

alter table push_subscriptions enable row level security;
drop policy if exists "push_subs_own" on push_subscriptions;
create policy "push_subs_own" on push_subscriptions for all using (user_id = auth.uid());

alter table notifications enable row level security;
drop policy if exists "notifs_own" on notifications;
create policy "notifs_own" on notifications for select using (user_id = auth.uid());
drop policy if exists "notifs_update_own" on notifications;
create policy "notifs_update_own" on notifications for update using (user_id = auth.uid());
drop policy if exists "notifs_office_insert" on notifications;
create policy "notifs_office_insert" on notifications for insert with check (is_office_or_admin() or true);

-- ─── 6. STORAGE BUCKETS CONFIGURATION ───────────────────────

-- Create avatars bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create engineer-vault bucket (PDFs, images, licenses)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'engineer-vault',
  'engineer-vault',
  true,
  20971520, -- 20MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 20971520;

-- Create certificates bucket (PDF records)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB
  array['application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760;

-- Storage RLS Policies
drop policy if exists "Public Access Avatars" on storage.objects;
create policy "Public Access Avatars" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Authenticated Upload Avatars" on storage.objects;
create policy "Authenticated Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Public Access Engineer Vault" on storage.objects;
create policy "Public Access Engineer Vault" on storage.objects for select using (bucket_id = 'engineer-vault');

drop policy if exists "Authenticated Upload Engineer Vault" on storage.objects;
create policy "Authenticated Upload Engineer Vault" on storage.objects for insert with check (bucket_id = 'engineer-vault' and auth.role() = 'authenticated');

drop policy if exists "Authenticated Delete Engineer Vault" on storage.objects;
create policy "Authenticated Delete Engineer Vault" on storage.objects for delete using (bucket_id = 'engineer-vault' and auth.role() = 'authenticated');

-- ─── 7. REALTIME PUBLICATION ────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table jobs;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table notifications;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table engineers;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table invoices;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table inquiries;
exception when others then null; end $$;
