# 🩸 BloodBridge — Enterprise Healthcare & Blood Emergency Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v12.0-FFCA28?logo=firebase&logoColor=black&style=for-the-badge)](https://firebase.google.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![WhatsApp API](https://img.shields.io/badge/Meta-WhatsApp_Cloud_API-25D366?logo=whatsapp&logoColor=white&style=for-the-badge)](https://developers.facebook.com/docs/whatsapp)
[![Vercel Serverless](https://img.shields.io/badge/Vercel-Serverless_Functions-000000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)

**Live Application URL:** [https://blood-bridge-ecru-theta.vercel.app](https://blood-bridge-ecru-theta.vercel.app)  
**Live Repository:** [GitHub - Vishakan1807/BloodBridge](https://github.com/Vishakan1807/BloodBridge)  

---

## 🌟 1. Executive Summary & Resume Highlights

**BloodBridge** is an enterprise-grade healthcare web platform engineered to solve the critical latency and coordination failures in emergency blood transfusion networks. Operating across all **38 districts of Tamil Nadu**, the system intelligently bridges voluntary blood donors, verified blood donation camps, and clinical hospital centers in real time.

Built upon the **OrchestrAI Lead co-engineering methodology**, BloodBridge moves beyond traditional CRUD applications by implementing an fault-tolerant, hybrid cloud system architecture with advanced medical guardrails:

* 🐘 **Dual-Mode Database & Zero-Downtime Migration Pipeline**: Integrates real-time WebSocket communication via **Firebase Realtime Database** alongside a production-ready **PostgreSQL Relational Engine**. Features an interactive admin migration console that dynamically flattens complex NoSQL documents into indexed SQL schemas without operational downtime or vendor lock-in.
* 💬 **Meta WhatsApp Cloud API via Vercel Serverless Edge**: Executes instant emergency broadcast alerts and donation notifications through custom **Vercel Serverless Proxy Functions**, completely bypassing browser CORS barriers and safeguarding cryptographic API credentials.
* 🩸 **Clinical ABO/Rh Medical Compatibility Engine**: Embeds strict hematological matching formulas—fully supporting universal donors, standard blood groups, and extremely rare human blood phenotypes including **Bombay Blood Group** and **Rh-null (Golden Blood)**.
* 🛡️ **5-Stage OGE Transactional Workflow**: Enforces mandatory **Observability, Guardrails, and Evaluation (OGE)** controls with strict state-machine immutability, automated hospital inventory deduction, and the World Health Organization (WHO) mandated **56-day donor recovery lock**.
* ⚡ **FSD-Lite Modular Architecture & Multi-Theme Engine**: Architected with React 19 and TypeScript 6 following Feature-Sliced Design (FSD-Lite) principles, featuring deep role-based access control (RBAC) and a high-contrast theme engine (*Crimson Dark*, *Executive Light*, *Emerald Health*).

---

## 🏛️ 2. Technology Stack & Enterprise Architecture

| Architecture Layer | Technology Selection | Engineering Purpose & Implementation Highlights |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19 & TypeScript 6** | Ultra-modern SPA architecture with compile-time strict null tracking, generic medical interface typings, and zero runtime UI regressions. |
| **Build & Tooling** | **Vite 8 & ESbuild** | Sub-millisecond Hot Module Replacement (HMR) pipeline and aggressive code splitting for fast clinical dashboard load times. |
| **Styling & UI Design** | **Tailwind CSS v4 & Lucide** | Custom fluid glassmorphism, responsive diagnostic layouts, and custom-designed medical components with Lucide iconography. |
| **Primary Backend (BaaS)** | **Firebase Realtime DB v12 & Auth** | Low-latency WebSocket bidirectional synchronization, multi-path transactional updates, Google OAuth 1-Click sign-in, and granular security rules. |
| **Relational Backend (SQL)** | **PostgreSQL & Raw SQL Schema** | Vendor lock-in insurance: Fully structured relational schema (`pg` driver) with high-capacity indexing, resilient auto-timestamping, and JSONB polymorphic attributes. |
| **Serverless API Proxy** | **Vercel Edge Serverless Functions** | Dedicated Node.js serverless architecture (`/api/whatsapp`) handling WhatsApp Cloud API webhooks, dynamic message templating, and CORS decoupling. |
| **Data Analytics & Reports** | **XLSX Engine & CSV Export** | Client-side diagnostic generator capable of extracting raw blood camp activities, donor audit traces, and regional inventory logs into Excel and CSV workbooks. |
| **Automated Verification** | **Vitest 4 & React Testing Library** | Comprehensive automated test suites verifying medical matching compatibility formulas, geofencing logic, and FCFS commitment workflows. |

---

## 💡 3. Core Functional Modules & Engineering Sophistication

### 📍 3.1. 38 Tamil Nadu District Geofencing & Isolated Broadcast Triage
* **District-Level Isolation**: To eliminate notification fatigue and prevent cross-regional communication friction, the application enforces geographical filtering across all **38 Tamil Nadu Districts** (Chennai, Madurai, Coimbatore, Salem, Thanjavur, Tiruchirappalli, Mayiladuthurai, etc.).
* **Hospital Destination Resolution**: When an emergency request is initiated, the targeted broadcast district is automatically locked to the **destination hospital's district**. A voluntary donor residing in Coimbatore only sees and receives notifications for urgent requests within Coimbatore, ensuring near-instant local physical mobility.

---

### 🩸 3.2. Clinical ABO/Rh & Rare Phenotype Matching Engine
* **Mathematical Medical Validation (`isBloodCompatible()`)**: Prior to processing any donor commitments or camp stock disbursements, the application evaluates hematological compatibility at both the client interface and backend guardrail layers:
  * **O- (Universal Red Cell Donor)**: Compatible with `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, and `AB+`.
  * **O+ (Universal Positive Donor)**: Compatible exclusively with positive Rh factor groups (`O+`, `A+`, `B+`, `AB+`).
  * **AB+ (Universal Recipient)**: Capable of receiving blood units from any standard classification.
  * **Ultra-Rare Phenotypes**: Built-in compatibility support for specialized immunological blood groups including **A1+**, **A2+**, **Bombay Phenotype (Oh)**, and **Rh-null**.
* **Real-Time Visual Triage**: Incompatible donation attempts are dynamically disabled in UI views with informative medical mismatch indicators, preventing clinical misallocation.

---

### 💬 3.3. Meta WhatsApp Cloud API via Vercel Serverless Functions
* **Automated Clinical Alert Transmission**: Emergency requests instantly trigger high-priority WhatsApp notifications directly to verified regional donors and camp coordinators.
* **Serverless Edge Architecture**: WhatsApp messaging calls route through dedicated Vercel Serverless functions (`/api/whatsapp`). This shields proprietary Meta Graph API access tokens from client browser networks, prevents cross-origin resource sharing (CORS) exceptions, and provides intelligent message formatting with automatic fallback to standardized templates (`en_US`/`en`).
* **Error Observability**: Implements explicit Meta API response formatting and structured serverless error logging for fast debugging during high-volume notification bursts.

---

### 🐘 3.4. Dual-Mode PostgreSQL Backend & Zero-Downtime Migration Console
* **Vendor Lock-In Protection**: Rather than relying exclusively on cloud NoSQL providers, BloodBridge incorporates a standalone relational database engine designed to operate on **PostgreSQL**.
* **Live NoSQL-to-SQL Flattening Engine**: An administrative Migration Console enables seamless, zero-downtime synchronization from Firebase Realtime Database to PostgreSQL. The custom migration adapter intelligently transforms hierarchical JSON structures—including nested case comments, clinical document attachments, and camp blood inventory totals—into relational database rows.
* **Resilient Schema Design**: Utilizes flexible nullability, automatic UNIX timestamp defaults, and JSONB fallback columns to ensure zero data loss during high-speed live production migrations.

---

### 🤝 3.5. Individual FCFS Donor Allocation & WHO 56-Day Recovery Lock
* **First-Come, First-Served Allocation Cap**: To avoid hospital over-crowding and redundant donor travel, voluntary individual commitments are strictly capped at **1 unit per individual donor** on a First-Come, First-Served basis until the total request target is fulfilled.
* **Automated WHO 56-Day Recovery Lock**: Upon marked completion of a donation, the system automatically locks the donor's eligibility profile for **56 days (1,344 hours)** in compliance with World Health Organization physiological recovery standards. During this cooldown period, the user's availability flag cannot be manually re-enabled, and all active donation triggers are blocked.
* **Admin Case Rebroadcast**: If a committed donor becomes unresponsive or unreachable, hospital managers and system administrators can trigger a 1-click **Rebroadcast**, retracting the individual commitment and immediately re-opening the emergency broadcast to local district donors.

---

### 📁 3.6. Clinical Document Attachments & Interactive Case Discussions
* **Medical Document Attachments**: Hospital staff and requesters can securely attach clinical diagnostic files, medical laboratory reports, and prescription orders (`attachments.service.ts`) directly to active case files for transparent clinical verification.
* **Collaborative Case Threads**: Each emergency donation request features an embedded real-time communication feed (`comment.service.ts`), allowing clinicians, camp coordinators, and committed donors to share logistical updates, patient room numbers, and blood test verifications without relying on unsecured third-party messaging apps.

---

### 📊 3.7. Excel (XLSX) & CSV Analytics & Export Engine
* **Enterprise Reporting Module**: Integrates an advanced institutional reporting console (`/reports`) enabling hospital directors and system admins to monitor regional blood collection volumes, camp fulfillment velocities, and donor response rates.
* **1-Click Spreadsheet Export**: Leverages the `xlsx` parsing engine to instantly compile structured, multi-sheet analytical workbooks and CSV audit records directly from browser state, streamlining institutional auditing and hospital compliance reporting.

---

### 🔐 3.8. Universal Profile Switcher, Google OAuth & Strict Account Deletion
* **Frictionless Google OAuth & Onboarding**: Combines traditional secure email/password credential validation with 1-click **Continue with Google** OAuth. First-time Google sign-ins automatically intercept the UX flow with a mandatory clinical onboarding modal requiring the selection of Blood Group, Tamil Nadu District, and validated Mobile Number.
* **Universal District Mobility**: Users relocating across Tamil Nadu can instantaneously switch their default operational district in user settings (`/settings`), realigning their geofenced notification broadcast scope in real time.
* **GitHub-Style Danger Zone**: Permanent account deletion requires typing an exact confirmation string (`I am deleting my account`) into a protective guardrail verification box, preventing accidental user profile truncation.

---

### 🎨 3.9. Multi-Theme Color Variable Engine
* **3 Clinical Visual Themes**: Built with a decoupled CSS custom properties theme engine supporting instant hot-swapping:
  1. 🔴 **Crimson Dark (Default)**: Deep midnight obsidian (`#0f0a0b`) engineered with vibrant crimson accents for low-light emergency monitoring.
  2. ⚪ **Executive Light**: Ultra-high-contrast hospital administrative view (`#ffffff` / `#f1f5f9`) optimized for daylight clinical settings and institutional hardware.
  3. 🟢 **Emerald Health**: Modern biomorphic clinical green layout (`#061814`) paired with refreshing emerald highlights.
* **Solid Aura Popover Controls**: Navigation dropdowns and theme toggles utilize 100% solid opacity compositing, guaranteeing readability against complex graphical chart backgrounds and fluid animations.

---

## 🔄 4. 5-Stage OGE Transactional Workflow Engine

BloodBridge enforces an immutable state machine governed by Observability, Guardrails, and Evaluation (OGE) standards:

```
┌──────────────┐    Verification Queue    ┌─────────────┐    Matching Console    ┌─────────────┐
│  REGISTERED  │ ───────────────────────► │  VERIFIED   │ ─────────────────────► │   MATCHED   │
│ (User/Hosp)  │   (Coordinator/Admin)    │ (Broadcast) │  (Coordinator/Admin) │ (Allocated) │
└──────────────┘                          └─────────────┘                        └─────┬───────┘
                                                                                       │
┌──────────────┐      Closure Notes       ┌─────────────┐    Auto-Deduct Stock   │
│    CLOSED    │ ◄─────────────────────── │   DONATED   │ ◄──────────────────────┘
│ (Immutable)  │   (Coordinator/Admin)    │ (Completed) │   (Coordinator/Admin) 
└──────────────┘                          └─────────────┘
```

### 🛡️ Mandatory OGE Clinical Guardrails:
* **WF-G01 (Sequential State Enforcement)**: Lifecycle states cannot be skipped or bypassed. Transitions must follow `registered` ➔ `verified` ➔ `matched` ➔ `donated` ➔ `closed`.
* **WF-G02 (Strict RBAC Authorization)**: Voluntary donors (`user` role) are strictly restrained from advancing workflow state transitions; only authenticated `manager` or `admin` accounts can authorize progression.
* **WF-G03 (Post-Closure Immutability)**: Upon transitioning into the `closed` state, a request record is permanently archived and cryptographically locked from further field mutation or deletion.
* **WF-G04 (Atomic Inventory Reconciliation)**: Executing a transition to `donated` utilizing verified blood camp stock instantly triggers an atomic decrement transaction against the corresponding Camp Inventory database row.
* **WF-G05 (Mandatory Audit Trails & Closure Notes)**: Case completion mandates non-empty clinical closure documentation, simultaneously generating an immutable record in the system audit logs (`audit_logs`).

---

## 👥 5. Role-Based Access Control (RBAC) Matrix

| Feature / Enterprise Capability | Voluntary Donor (`user`) | Camp Coordinator (`manager`) | System Administrator (`admin`) |
| :--- | :---: | :---: | :---: |
| **Self-Registration & Google OAuth Sign-In** | ✅ | ✅ | ✅ |
| **Raise Emergency Blood Donation Request** | ✅ | ✅ | ✅ |
| **View Geofenced District Emergency Broadcasts** | ✅ *(Assigned District)* | ✅ *(Assigned District)* | ✅ *(All 38 Districts)* |
| **Individual FCFS Emergency Commit** | ✅ *(1 Unit Cap + 56d Lock)* | ❌ | ❌ |
| **Attach Clinical Documents & Participate in Case Threads** | ✅ | ✅ | ✅ |
| **Verify Pending Triage Requests (`registered` ➔ `verified`)** | ❌ | ✅ | ✅ |
| **Allocate Blood Bank Stock & Advance Workflow Status** | ❌ | ✅ | ✅ |
| **Trigger WhatsApp Emergency Rebroadcasts** | ❌ | ✅ | ✅ |
| **Master Data CRUD (Blood Camps, Hospital Master Records)** | ❌ | ❌ | ✅ |
| **Generate & Export XLSX/CSV Analytical Spreadsheets** | ❌ | ✅ | ✅ |
| **Zero-Downtime NoSQL-to-PostgreSQL Migration Console** | ❌ | ❌ | ✅ |
| **System Audit Log Access & Role Promotion Console** | ❌ | ❌ | ✅ |

---

## 🗄️ 6. Hybrid Database Specifications (NoSQL + Relational SQL)

### Firebase Realtime Database NoSQL Document (`/requests/{requestId}`)
```json
{
  "id": "REQ_202608_042",
  "referenceNumber": "BB-2026-00042",
  "patientName": "Kavitha M",
  "requiredBloodGroup": "B+",
  "unitsRequired": 2,
  "unitsFulfilled": 1,
  "urgency": "critical",
  "hospitalId": "HOSP_MADURAI_01",
  "hospitalName": "Appasamy Speciality Hospital",
  "donorCity": "Madurai",
  "status": "verified",
  "createdBy": "USER_10293",
  "createdAt": 1784700000000,
  "individualDonations": [
    {
      "donorUid": "DONOR_88412",
      "donorName": "Arun Kumar",
      "donorPhone": "9840123456",
      "donorDistrict": "Madurai",
      "units": 1,
      "donatedAt": 1784705000000
    }
  ]
}
```

### PostgreSQL Relational High-Capacity Schema (`/sql/schema.sql`)
```sql
-- Core user entity linked directly to authentication tokens with indexed performance lookups
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(255) PRIMARY KEY,
    email TEXT,
    display_name TEXT DEFAULT 'Anonymous User',
    phone VARCHAR(128) DEFAULT '',
    city TEXT DEFAULT 'Unspecified',
    role VARCHAR(128) DEFAULT 'user',
    blood_group VARCHAR(128) DEFAULT 'Not Specified',
    camp_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_available_to_donate BOOLEAN DEFAULT false,
    last_donation_date BIGINT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_users_role_city ON users(role, city);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group, is_available_to_donate);

-- Real-Time Inventory matrix tracking units per Camp & Blood Group
CREATE TABLE IF NOT EXISTS camp_inventories (
    camp_id VARCHAR(255) NOT NULL,
    blood_group VARCHAR(128) NOT NULL,
    units INTEGER DEFAULT 0,
    last_updated_by VARCHAR(255),
    last_updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    PRIMARY KEY (camp_id, blood_group)
);

-- Comprehensive transactional audit logging table with zero structural regression
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(128) DEFAULT 'SYSTEM',
    event_type VARCHAR(128) DEFAULT 'GENERAL',
    action TEXT DEFAULT '',
    actor_uid VARCHAR(255),
    target_id VARCHAR(255),
    previous_value TEXT,
    new_value TEXT,
    metadata TEXT,
    timestamp BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);
```

---

## 💻 7. Local Development & Installation Instructions

### 1. Repository Cloning & Dependency Installation
```bash
# Clone the live repository
git clone https://github.com/Vishakan1807/BloodBridge.git
cd BloodBridge

# Install core React, Vite, and Node dependencies
npm install
```

### 2. Environment Variable Configuration (`.env.local`)
Create a `.env.local` file in the project root directory and configure your Firebase BaaS, Meta WhatsApp, and optional PostgreSQL parameters:
```ini
# Firebase Realtime Database & Authentication Keys
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_DATABASE_URL=https://your_database_url.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Meta WhatsApp Cloud API Integration (Optional / Edge Function Proxy)
VITE_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
VITE_WHATSAPP_ACCESS_TOKEN=your_meta_cloud_api_token
VITE_WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verification_string

# PostgreSQL Enterprise Connection String (Optional for Self-Hosted Mode)
POSTGRES_CONNECTION_STRING=postgres://username:password@localhost:5432/bloodbridge
```

### 3. Execution & Automated Testing Pipeline
```bash
# Launch high-performance local Vite development server (HMR enabled)
npm run dev

# Execute strict TypeScript type validation without emitting JavaScript output
npx tsc --noEmit

# Execute comprehensive automated unit test suite with Vitest
npm test

# Generate institutional automated code test coverage report
npm run test:coverage

# Compile optimized production ESbuild bundling for deployment
npm run build
```

---

## 📜 8. Developer Attribution & Certification

**Designed and engineered by Vishakan V.**  
*Developed as part of the **OrchestrAI Lead Certification Methodology (Capstone ID: CAP-23)**.*  
Built to demonstrate modern high-availability full-stack software architecture, hybrid cloud failover databases, clinical software guardrails, and secure event-driven cloud integrations.
