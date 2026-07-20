# 🩸 BloodBridge — Blood Donation Management Platform
### OrchestrAI Lead Certification Capstone (CAP-23)

---

## 🌟 Executive Summary

**BloodBridge** is a modern, enterprise-grade healthcare web application designed to connect blood donors to patients in need through verified donation camps and hospital destinations. Built following the **OrchestrAI Lead co-engineering methodology**, it implements a 5-stage transactional workflow engine with mandatory **Observability, Guardrails, and Evaluation (OGE)** controls.

- **Capstone ID:** CAP-23
- **Domain:** Healthcare
- **Architecture Pattern:** Feature-Sliced Design (FSD-Lite)
- **Live Repository:** [GitHub Repository](https://github.com/Vishakan1807/BloodBridge)
- **Tech Stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · Firebase Realtime DB & Auth v12 · Lucide Icons

---

## 🎯 Core Features & Modules

### 1. Authentication & Security (Module 1)
- Firebase Auth integration with customized profile snapshotting in `/users/{uid}`.
- Role-based self-registration (always receives `user`/`donor` role on creation).
- Soft lockout error mapping and anti-enumeration password reset flow.

### 2. Role-Resolved Dashboards (Module 2)
- **Donor Dashboard:** 56-day WHO interval eligibility counter, active request cards, recent donation activity.
- **Coordinator Dashboard:** Multi-camp selector, pending verification & matching queue counters, live 8-blood-group stock gauges with low-stock alerts ($\le 3$ units).
- **Admin Dashboard:** System-wide KPIs, Master Data shortcuts, live system audit stream.

### 3. Master Data Management (Modules 3 & 4)
- Full CRUD for **Blood Groups** (14 standard, rare, and ultra-rare phenotypes including `Bombay` and `Rh-null`), **Camps** (with coordinator user assignment), and **Hospitals**.

### 4. Transactions — Donation Requests (Module 5)
- Atomic sequential reference number generator (`BB-YYYY-NNNNN`) using Firebase `runTransaction`.
- Recipient, blood group, units required, urgency, and destination hospital snapshotting.

### 5. Workflow Engine (Module 5 — 20 Marks Highest Weightage)
- **5-Stage Lifecycle:** `Registered` ──► `Verified` ──► `Matched` ──► `Donated` ──► `Closed`.
- **Donor Verification Queue:** Camp assignment & donor profile verification.
- **Matching Console:** Donor compatibility matching with 56-day WHO eligibility checking.
- **Mandatory OGE Guardrails:**
  - **WF-G01:** State skipping blocked.
  - **WF-G02:** Donor role cannot advance states.
  - **WF-G03:** Closed state immutable (except Admin emergency rollback).
  - **WF-G04:** Inventory auto-decrement on donation ($\ge unitsRequired$).
  - **WF-G05:** Mandatory closure notes required on case closure.

### 6. Comments & Discussion (Module 6)
- Append-only, immutable discussion thread per request (`!data.exists()` database security rule).

### 7. Medical Attachments (Module 7)
- Metadata document panel supporting external prescription and identity document link attachments.

### 8. Reports & Analytics (Module 8)
- **Summary Report:** Aggregate KPIs and blood group distribution.
- **Status Report:** Lifecycle stage counts and progress bar breakdown.
- **Activity Report:** System audit trail stream.
- Instant **CSV Export** utility across all reports.

### 9. Administration & RBAC (Module 9)
- User role promotion/demotion (`user` ──► `manager` ──► `admin`).
- Active/deactivated account status toggles with self-deactivation guardrail.

### 10. Donor History (Trainer Extension)
- Dedicated donor history timeline (`/donor/:id/history`) indexing completed donations to track lifelong impact and eligibility.

---

## 🏗️ System Architecture & Workflow Diagrams

### Workflow Lifecycle Diagram
```
┌──────────────┐   Verification Queue   ┌─────────────┐   Matching Console   ┌─────────────┐
│  REGISTERED  │ ─────────────────────► │  VERIFIED   │ ───────────────────► │   MATCHED   │
└──────────────┘    (Manager/Admin)     └─────────────┘    (Manager/Admin)   └─────┬───────┘
                                                                                   │
┌──────────────┐     Closure Notes      ┌─────────────┐    Auto-Deduct Stock   │
│    CLOSED    │ ◄───────────────────── │   DONATED   │ ◄──────────────────────┘
└──────────────┘    (Manager/Admin)     └─────────────┘    (Manager/Admin)
```

---

## 🛠️ Local Installation & Setup

```bash
# 1. Clone repository
git clone https://github.com/Vishakan1807/BloodBridge.git
cd BloodBridge

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env.local
# Add your Firebase credentials to .env.local

# 4. Start local development server
npm run dev
```

---

## 🧪 Testing & Verification

```bash
# Run unit tests
npm test

# Run TypeScript type check
npx tsc --noEmit
```

---

*BloodBridge CAP-23 — Built by OrchestrAI Lead & AI Co-Engineer Twin*
