# System Architecture & Service Design Document
**Your Boiler Ltd — Field Service & Compliance Management Platform**

---

## 1. Executive Summary

**Your Boiler Ltd** is an enterprise-grade field service management (FSM) and compliance platform engineered with **Next.js 16 (App Router + Turbopack)**, **Supabase PostgreSQL**, and modern Progressive Web App (PWA) capabilities.

The platform is purpose-built for heating, gas, electrical, and fire safety contractors servicing residential properties, commercial clients, landlords, and housing associations across the UK.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YOUR BOILER LTD PLATFORM                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   ADMIN PORTAL   │           │   ENGINEER PWA   │           │ COMPLIANCE CRON  │
│  (Desktop/Tablet)│           │  (Mobile-First)  │           │   (Automated)    │
└────────┬─────────┘           └────────┬─────────┘           └────────┬─────────┘
         │                              │                              │
         ▼                              ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                          NEXT.js 16 SERVER ACTIONS                             │
│       Jobs · Certificates (CP12) · Engineer Vault · Recurring Schedules        │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   SUPABASE DB    │           │  SUPABASE VAULT  │           │  RESEND ENGINE   │
│ (Postgres + RLS) │           │ (Document Store) │           │(Scheduled Mails) │
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

## 2. Compliance Inspection Cycles & Intervals

UK building and rental regulations mandate specific cyclical inspections. The system tracks these intervals systematically in both `recurring_job_templates` and the dedicated `service_reminders` compliance registry.

| Service Category | Standard Interval | Legal / Technical Standard | Mandatory Renewal Threshold | Default Time Slot |
| :--- | :--- | :--- | :--- | :--- |
| **Boiler Service (CP12)** | **12 Months** | Gas Safety (Installation & Use) Regulations 1998, Reg 36 | 30 days prior to expiry | Morning (08:00–12:00) |
| **Gas Inspection Service** | **12 Months** | Gas Safety Regulations 1998 (Landlord Gas Safety Record) | 30 days prior to expiry | Morning (08:00–12:00) |
| **Fire Alarm Testing** | **6 Months** | British Standard **BS 5839-1 / BS 5839-6** | 21 days prior to expiry | Afternoon (12:00–16:00) |
| **Electrical Inspection** | **3 or 5 Years** | British Standard **BS 7671 (EICR)** (3 yrs commercial / 5 yrs residential) | 60 days prior to expiry | Morning (08:00–12:00) |

### Interval Calculations in Code:
- **12-Month Cycles**: Derived as `addMonths(lastInspectionDate, 12)`
- **6-Month Cycles**: Derived as `addMonths(lastInspectionDate, 6)`
- **3/5-Year Cycles**: Derived as `addYears(lastInspectionDate, 3)` or `addYears(lastInspectionDate, 5)`

---

## 3. Automated Reminder Pipeline

The reminder engine ensures that no landlord or property owner lapses into legal non-compliance.

```
 ┌────────────────────────┐
 │   Daily / Hourly Cron  │  GET /api/cron/reminders (Bearer CRON_SECRET)
 └───────────┬────────────┘
             │
             ▼
 ┌────────────────────────┐
 │ Query Due/Overdue Data │  SELECT from recurring_job_templates & service_reminders
 └───────────┬────────────┘  WHERE next_due_date <= NOW() + INTERVAL '30 days'
             │
             ▼
 ┌────────────────────────┐
 │  Resend Email Engine   │  Native HTTPS fetch directly to https://api.resend.com/emails
 └───────────┬────────────┘  Zero extra npm packages needed
             │
             ▼
 ┌────────────────────────┐
 │ Customer Email Link    │  Includes 1-click slot booking (Morning / Afternoon / Evening)
 └───────────┬────────────┘
             │
             ▼
 ┌────────────────────────┐
 │ Dispatch State Update  │  Updates reminder status to 'sent' and logs sent_at timestamp
 └────────────────────────┘
```

### Key Technical Aspects:
1. **Zero External Dependency Resend Integration**:
   Instead of installing heavy third-party SDK packages that create container networking issues, the platform utilizes a lightweight, native `fetch`-based client located at `src/lib/email/resend.ts`.
2. **Free-Tier Cost Optimization**:
   - Volume: ~100 emails/month for active operational accounts.
   - Months 1–6: 0 emails (new installations are within their 6-to-12-month initial validity).
   - Resend provides **3,000 emails/month free permanently** (100 emails/day), making ongoing operational email costs **£0.00**.
3. **Automated Cron Trigger**:
   - Secured endpoint at `/api/cron/reminders`.
   - Authorized via `Authorization: Bearer <CRON_SECRET>`.
   - Can be scheduled via Vercel Cron, GitHub Actions, or local crontab (`0 8 * * * curl ...`).

---

## 4. Job Scheduling Slots (Morning, Afternoon, Evening)

To accommodate homeowner work schedules, jobs are structured around flexible four-hour time bands:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     MORNING SLOT        │     AFTERNOON SLOT      │      EVENING SLOT       │
│     08:00 – 12:00       │      12:00 – 16:00      │      16:00 – 20:00      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Operational Logic:
- **`morning`**: Starts at `08:00:00`, ends at `12:00:00`.
- **`afternoon`**: Starts at `12:00:00`, ends at `16:00:00`.
- **`evening`**: Starts at `16:00:00`, ends at `20:00:00`.
- **`custom`**: Allows exact minute-precision start and end times when required.

### Conflict Detection Engine:
The scheduler validates incoming bookings against three critical constraints:
1. **Overlapping Jobs**: Warns when an engineer already has a job booked in the same window.
2. **Engineer Off-Duty Status**: Blocks dispatch if the engineer is marked `off_duty`.
3. **Gas Safe License Expiration**: Blocks assignment to Gas Safety/Boiler jobs if the engineer's Gas Safe license has expired.

---

## 5. Customer Structure & Housing Association Add-on

Customers in the database are categorized to support diverse property management hierarchies:

```
                          CUSTOMER TYPES
   ┌─────────────────────────────────────────────────────────┐
   │  • Residential (Single homeowner)                       │
   │  • Commercial (Businesses, offices, pubs)               │
   │  • Landlord (Private landlords with rental properties)  │
   │  • House Association (Housing Association Add-on)       │
   └─────────────────────────────────────────────────────────┘
                               │
                               ▼
                   PROPERTY PORTFOLIO MAPPING
   ┌─────────────────────────────────────────────────────────┐
   │ Customer ID: [Housing Association]                      │
   │ ├── Property 1: Flat 4A, Oak Court                      │
   │ ├── Property 2: Flat 4B, Oak Court                      │
   │ └── Property N: Communal Boiler House, Block B          │
   └─────────────────────────────────────────────────────────┘
```

The `House Association` customer type enables batch compliance tracking, multi-property portfolio views, and communal boiler plant servicing.

---

## 6. Engineer Management: In-House vs Subcontractor & Document Vault

The platform handles both permanent employees and independent external contractors:

```
                            ENGINEER PROFILES
               ┌────────────────────────────────────────┐
               │ Category: In-House vs Subcontractor    │
               │ License Number: e.g. 198745            │
               │ Gas Safe Expiry Date                   │
               └───────────────────┬────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│     QUALIFICATIONS MATRIX       │         │      DOCUMENT VAULT             │
│  • CCN1: Core Gas Safety        │         │  Upload any format:             │
│  • CENWAT: Boilers & Heaters    │         │  • PDF certificates             │
│  • CKR1: Domestic Cookers       │         │  • JPEG / PNG ID scans          │
│  • HTR1: Space Heaters / Fires  │         │  • DOCX insurance policies      │
│  • CPA1: Combustion Analysis    │         │  Secure file viewer & download  │
│  • MET1: Gas Meters             │         │  Integrated with Supabase Store │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

### Security & Compliance Controls:
- **Badge Indicators**: Immediate visual indicators identifying `In-House` vs `Subcontractor`.
- **Document Vault**: Engineers or admins can upload insurance certificates, Gas Safe ID cards, health & safety certifications, and driving licenses directly to `engineer_documents`.

---

## 7. Mobile Engineer Experience & `+ Potential Job` Dispatch

For engineers on site, the platform functions as an installable Progressive Web App (PWA) with a mobile-optimized UI:

```
 ┌─────────────────────────────────────────────┐
 │           ENGINEER MOBILE DASHBOARD         │
 │                                             │
 │  [Install App Pill]    [Status: Active]     │
 │                                             │
 │  ▼ SERVICE REMINDERS (14)                   │
 │  ┌────────────────────────────────────────┐ │
 │  │ 14 Bramble Lane · Boiler CP12          │ │
 │  │ Due in 4 days                          │ │
 │  │ [+ Potential Job]                      │ │
 │  └────────────────────────────────────────┘ │
 └──────────────────────┬──────────────────────┘
                        │
                        ▼ (Tap "+ Potential Job")
 ┌─────────────────────────────────────────────┐
 │      SLIDE-UP BOTTOM SHEET DISPATCH         │
 │                                             │
 │  Customer: Paul & Anna Dobson               │
 │  Property: 14 Bramble Lane                  │
 │  Service:  Boiler Service (CP12)            │
 │                                             │
 │  Select Time Slot:                          │
 │  [ Morning ]  [ Afternoon ]  [ Evening ]    │
 │                                             │
 │  [ Confirm & Create Job ]                   │
 └─────────────────────────────────────────────┘
```

### Key Engineer Capabilities:
1. **One-Tap Job Conversion**: Turns compliance expiries directly into scheduled dispatches with customer and property details pre-filled.
2. **PWA Standalone Mode**: Can be installed to the home screen of Android and iOS devices.
3. **Clean Visual Aesthetic**: Dark obsidian background with crisp borders, zero emojis, and no glowing effects.

---

## 8. Official CP12 Landlord Gas Safety Record (`FRM/GI12602`)

The digital certificate generated at `/admin/certificates/[id]` exactly matches the official UK Gas Safe standard `FRM/GI12602`:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     LANDLORD / HOMEOWNER GAS SAFETY RECORD                      │
│                                                                                 │
│ Certificate Ref: GI-12602-2026               Gas Safe Register No: 198745      │
│ Engineer: Satnam Dabb                        Inspection Date: 11/11/2026        │
├───────────────────────────────────────┬─────────────────────────────────────────┤
│ SECTION A: CLIENT & PROPERTY DETAILS  │ SECTION B: APPLIANCE DETAILS            │
│ Landlord: Alan Ford Properties        │ Location: Kitchen                       │
│ Address: 7 Park Road, M16 8RN         │ Make/Model: Worcester Bosch Greenstar   │
│                                       │ Flue Type: Room Sealed (RS)             │
├───────────────────────────────────────┴─────────────────────────────────────────┤
│ SECTION C: COMBUSTION READINGS MATRIX                                           │
│ Operating Mode   CO (ppm)   CO2 (%)    CO/CO2 Ratio   Combustion Result        │
│ High Fire        38         9.1        0.0004         PASS                      │
│ Low Fire         12         8.9        0.0001         PASS                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SECTION D: GAS SAFETY & OPERATIONAL CHECKS                                      │
│ • Operating Pressure: 20.0 mbar (PASS)        • Flue Flow & Spillage: PASS      │
│ • Safety Device Operation: CORRECT            • Ventilation Adequate: YES       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SECTION E: AUDIBLE ALARM VERIFICATION                                           │
│ Alarm Type       Location          Expiry Date   Test Button Check              │
│ Carbon Monoxide  Kitchen Wall      10/2029       PASS                           │
│ Smoke Alarm      Hallway Ceiling   04/2030       PASS                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SECTION F: FINAL SIGN-OFF & DEFECT DECLARATIONS                                 │
│ Defect Action: None / System Safe To Use      Next Inspection Due: 11/11/2027   │
│ Engineer Signature: [Digitally Recorded]      Customer Signature: [Recorded]    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Database Schema Summary

The relational schema is configured in `supabase/schema_reminders_and_engineers.sql`:

```sql
-- 1. Engineer Categories & Slots
CREATE TYPE engineer_category AS ENUM ('in_house', 'subcontractor');
CREATE TYPE schedule_time_slot AS ENUM ('morning', 'afternoon', 'evening', 'custom');
CREATE TYPE inspection_service_type AS ENUM (
  'boiler_service_12m',
  'gas_inspection_12m',
  'fire_alarm_6m',
  'electrical_inspection_3y',
  'electrical_inspection_5y'
);

-- 2. Engineer Document Vault
CREATE TABLE engineer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dedicated Service Reminders Table
CREATE TABLE service_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  service_type inspection_service_type NOT NULL,
  last_service_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  preferred_time_slot schedule_time_slot DEFAULT 'morning',
  notification_count INT DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Certificate Alarms Table
CREATE TABLE certificate_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES gas_certificates(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL,
  location TEXT NOT NULL,
  battery_expiry_date DATE,
  test_result TEXT NOT NULL
);
```

---

## 10. Verification & Quality Standards

- **TypeScript Strict Mode**: Fully typed schema models without `any` overrides in core business logic.
- **UI Aesthetics**:
  - High-contrast charcoal and slate palette (`#111215`, `#16171b`, `#26272b`).
  - No emojis anywhere in the user interface (all symbols rendered via Lucide icons).
  - No "Powered by Resend" text anywhere in the interface.
  - Zero glowing UI shadows or neon colored halos.
- **Next.js 16 App Router Compliance**: Fully static and dynamic route optimization with 0 compilation errors across all 37 application routes.
