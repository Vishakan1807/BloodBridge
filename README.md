# 🩸 BloodBridge — Comprehensive Enterprise Documentation
### Capstone ID: CAP-23 | OrchestrAI Lead Certification Methodology
**Live Repository:** [GitHub - Vishakan1807/BloodBridge](https://github.com/Vishakan1807/BloodBridge)  
**Live Application URL:** [https://blood-bridge-ecru-theta.vercel.app](https://blood-bridge-ecru-theta.vercel.app)

---

## 🌟 1. Executive Summary

**BloodBridge** is a modern, enterprise-grade healthcare web application designed to connect voluntary blood donors with patients in emergency need through verified blood camps and hospital destinations across **Tamil Nadu**. 

Built following the **OrchestrAI Lead co-engineering methodology**, BloodBridge implements a 5-stage transactional workflow engine with mandatory **Observability, Guardrails, and Evaluation (OGE)** controls. The application enforces regional district isolation (38 Tamil Nadu districts), clinical ABO/Rh medical compatibility rules, urgency-level priority allocation, 7-day request expiration archiving, and real-time inventory synchronization.

---

## 🛠️ 2. Technology Stack & System Architecture

| Architecture Layer | Technology Selection | Technical Implementation & Role |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19** & **TypeScript 6** | Modern single-page application framework with strict type safety |
| **Build System** | **Vite 8** | High-performance HMR build pipeline and ESbuild bundler |
| **Styling & Icons** | **Tailwind CSS v4** & **Lucide Icons** | Utility-first CSS, custom glassmorphism, responsive layout |
| **Theme Engine** | **Custom CSS Color Variables Engine** | 3 Themes: *Crimson Dark* (Default), *Executive Light*, *Emerald Health* |
| **Backend & DB** | **Firebase Realtime Database v12** | Real-time WebSocket sync, atomic multi-path updates & transactional rules |
| **Authentication** | **Firebase Auth v12** | Email/Password auth, Google OAuth 1-Click Sign-In, profile snapshotting |
| **State Management** | **React Context Architecture** | Decoupled providers: `AuthContext`, `ToastContext`, `ThemeContext`, `RBACContext` |
| **Design Pattern** | **FSD-Lite (Feature-Sliced)** | Modular directory structure (`core/`, `components/`, `features/`, `services/`, `types/`) |

---

## 🎯 3. Core Functional Modules & Feature Breakdown

### 📍 3.1. Tamil Nadu District Scope & Geofenced Request Broadcasting
* **38 Tamil Nadu Districts Scope**: The platform replaces generic city text fields with a standardized dropdown containing all **38 Tamil Nadu Districts** (Chennai, Madurai, Coimbatore, Salem, Thanjavur, Mayiladuthurai, Tiruchirappalli, etc.).
* **Strict Geographic Isolation**:
  * When a donation request is raised for a patient at a hospital, the broadcast district (`donorCity`) is automatically resolved to the **destination hospital's district**.
  * Voluntary donors and Blood Camp Coordinators **ONLY see broadcast requests raised for hospitals in their matching district**. Donors in Madurai do not see Chennai requests, eliminating geographic confusion.

---

### 🩸 3.2. Clinical ABO/Rh Blood Compatibility Matching Engine
* **Medical Compatibility Rules (`isBloodCompatible()`)**: BloodBridge enforces strict medical ABO and Rh factor compatibility rules before matching donors or processing donations:
  * **O- (Universal Red Cell Donor)**: Can donate to `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, `AB+`.
  * **O+**: Can donate only to positive Rh groups (`O+`, `A+`, `B+`, `AB+`).
  * **B+**: Can donate to `B+` and `AB+` (strictly blocked from donating to `B-`).
  * **Rh-null & Bombay Blood Group Support**: Full clinical support for rare and ultra-rare phenotypes (`A1+`, `A2+`, `A1B+`, `Bombay`, `Rh-null`).
* **UI & Backend Enforcement**: Donors viewing emergency requests see real-time compatibility badges. Incompatible donations are blocked at the UI layer and rejected by backend guard clauses.

---

### 🔴 3.3. Urgency-Based Priority Allocation (Critical ➔ Urgent ➔ Normal)
* **Priority Ranking**: All requests across the application are dynamically ordered by urgency level:
  1. 🔴 **Critical (Immediate)**: Positioned at the very top with animated pulsing badges.
  2. ⚡ **Urgent (Within 12h)**: Positioned second with highlighted warning badges.
  3. **Routine / Normal**: Positioned third.
* **Multi-Dashboard Integration**: Urgency sorting applies to `DonorDashboard`, `CoordinatorDashboard`, `RequestList`, and `VerificationQueue`.

---

### 📁 3.4. 7-Day Expired Requests Archive & Admin Cleanup
* **7-Day Expiry Rule**: Requests remain active on live donor dashboards for 7 days (`Date.now() - createdAt < 7 days`).
* **Expired Requests Archive**: Any request older than 7 days ($\ge 7$ days) automatically moves out of active views into an **Expired Section** on the Admin/Manager Requests Management page (`/requests`).
* **Database Hygiene Controls**: Admins and Managers can filter expired requests (*All Expired*, *Still Not Closed*, *Closed*) and use a 1-click **"Close Case"** modal to complete old cases with mandatory closure notes.

---

### 🤝 3.5. Voluntary Individual Donor FCFS System & Recovery Lock
* **1-Unit Allocation Cap**: Voluntary individual donors can commit a maximum of 1 unit per request on a First-Come, First-Served (FCFS) basis.
* **56-Day WHO Recovery Lock**: Donating blood automatically locks the donor's availability for **56 days** (WHO mandated recovery period). Donors cannot turn on availability or commit to new donations until their recovery lock expires.
* **Requester Contact Access & Admin Rebroadcast**:
  * Requesters can view committed donor names and phone numbers with clickable `tel:` links.
  * If a committed donor is unreachable, Admins/Managers can trigger a 1-click **Rebroadcast** to reopen the request to district donors.

---

### 🔐 3.6. Authentication, Google OAuth & Onboarding Modal
* **Authentication Options**: Supports standard Email/Password registration as well as 1-click **Continue with Google** OAuth.
* **Google Donor Onboarding Modal**: When a user signs in via Google for the first time, a mandatory onboarding modal automatically pops up prompting them to configure their **Blood Group**, **Tamil Nadu District**, and **Contact Phone Number**. Standard registrations are not prompted twice.

---

### ⚙️ 3.7. Universal Profile Settings & Strict Account Deletion
* **Location & Profile Updates**: Donors, Camp Managers, and Admins can update their display name, phone number, blood group, and **Tamil Nadu District** anytime when moving (`/settings`).
* **Danger Zone — Account Deletion**:
  * Users can delete their account permanently from the Settings page.
  * **Strict Typing Confirmation**: Requires typing the exact string **`I am deleting my account`** into a confirmation input box before deletion is enabled (similar to GitHub repository deletion).

---

### 🎨 3.8. Multi-Theme Color Engine & Blood Core Switcher
* **3 High-Contrast Themes**:
  1. **Crimson Dark** (Default): Deep midnight black (`#0f0a0b`) with crimson red accents.
  2. **Executive Light**: High-contrast clinical light theme (`#ffffff` / `#f1f5f9`) with slate accents.
  3. **Emerald Health**: Vibrant clinical green theme (`#061814`) with emerald accents.
* **Blood Core Orb Trigger**: The top header features a liquid aura trigger button with a 100% solid, non-transparent popover menu.

---

## 🔄 4. 5-Stage Transactional Workflow Engine

```
┌──────────────┐   Verification Queue   ┌─────────────┐   Matching Console   ┌─────────────┐
│  REGISTERED  │ ─────────────────────► │  VERIFIED   │ ───────────────────► │   MATCHED   │
│ (User/Hosp)  │    (Manager/Admin)     │ (Broadcast) │    (Manager/Admin)   │ (Allocated) │
└──────────────┘                        └─────────────┘                      └─────┬───────┘
                                                                                   │
┌──────────────┐     Closure Notes      ┌─────────────┐    Auto-Deduct Stock  │
│    CLOSED    │ ◄───────────────────── │   DONATED   │ ◄─────────────────────┘
│ (Immutable)  │    (Manager/Admin)     │ (Completed) │    (Manager/Admin)
└──────────────┘                        └─────────────┘
```

### 🛡️ Mandatory OGE Guardrails:
* **WF-G01 (No State Skipping)**: Workflow transitions must proceed strictly in order: `registered` ➔ `verified` ➔ `matched` ➔ `donated` ➔ `closed`.
* **WF-G02 (RBAC Control)**: Users with the `user` (donor) role cannot advance workflow states.
* **WF-G03 (Immutability)**: Once a request reaches `closed`, its state becomes immutable.
* **WF-G04 (Stock Sync)**: Fulfilling a request from blood camp stock automatically decrements inventory units.
* **WF-G05 (Mandatory Audit Notes)**: Case closure requires non-empty closure notes stored in the database audit log.

---

## 👥 5. Role-Based Access Control (RBAC) Matrix

| Feature / Module | Donor (`user`) | Coordinator (`manager`) | Administrator (`admin`) |
| :--- | :---: | :---: | :---: |
| Self-Registration & Google Sign-In | ✅ | ✅ | ✅ |
| Raise Emergency Donation Request | ✅ | ✅ | ✅ |
| View District-Isolated Broadcasts | ✅ (District Only) | ✅ (District Only) | ✅ (All Districts) |
| Individual FCFS Donation Commit | ✅ (1 Unit max) | ❌ | ❌ |
| Verify Pending Requests | ❌ | ✅ | ✅ |
| Match Stock / Allocate Donors | ❌ | ✅ | ✅ |
| Master Data CRUD (Camps, Hospitals) | ❌ | ❌ | ✅ |
| Reports & CSV Data Export | ❌ | ✅ | ✅ |
| User Management & Role Promotion | ❌ | ❌ | ✅ |
| System Audit Trail Access | ❌ | ❌ | ✅ |
| Profile & District Location Switch | ✅ | ✅ | ✅ |

---

## 🗄️ 6. Firebase Database Schemas

### User Profile Schema (`/users/{uid}`)
```json
{
  "uid": "USER_123",
  "email": "donor@example.com",
  "displayName": "Seker V",
  "phone": "9735914678",
  "city": "Mayiladuthurai",
  "bloodGroup": "B+",
  "role": "user",
  "isAvailableToDonate": true,
  "lastDonationDate": 1784623800000,
  "createdAt": 1784500000000,
  "updatedAt": 1784623800000
}
```

### Donation Request Schema (`/requests/{requestId}`)
```json
{
  "id": "REQ_456",
  "referenceNumber": "BB-2026-00042",
  "patientName": "Kavitha M",
  "requiredBloodGroup": "B+",
  "unitsRequired": 2,
  "unitsFulfilled": 1,
  "urgency": "critical",
  "hospitalId": "HOSP_MADURAI_01",
  "hospitalName": "Appasamy Hospital",
  "donorCity": "Madurai",
  "status": "verified",
  "createdBy": "USER_123",
  "createdAt": 1784700000000,
  "individualDonations": [
    {
      "donorUid": "DONOR_789",
      "donorName": "Arun Kumar",
      "donorPhone": "9840123456",
      "donorDistrict": "Madurai",
      "units": 1,
      "donatedAt": 1784705000000
    }
  ]
}
```

---

## 💻 7. Local Setup & Installation Instructions

```bash
# 1. Clone the repository
git clone https://github.com/Vishakan1807/BloodBridge.git
cd BloodBridge

# 2. Install Node dependencies
npm install

# 3. Configure environment variables (.env.local)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# 4. Run local development server
npm run dev

# 5. Execute TypeScript validation and test suite
npx tsc --noEmit
npm test
```

---
*BloodBridge Capstone Project CAP-23 — Built with React 19, TypeScript 6, Vite 8, and Firebase v12.*
