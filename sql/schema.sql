-- ============================================================================
-- BloodBridge Enterprise PostgreSQL Schema (High-Capacity Relational Database)
-- Guaranteed to operate without BaaS vendor lock-in, fully indexed for fast queries.
-- Resilient schema: uses automatic timestamp defaults and flexible nullability to support NoSQL record migration.
-- ============================================================================

-- Drop old schema tables if re-initializing to cleanly update column sizes & constraints
DROP TABLE IF EXISTS audit_logs, attachments, comments, requests, camp_inventories, hospitals, camps, users CASCADE;

-- Enable UUID generation extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Linked with Firebase Authentication UID as Primary Key)
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
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255),
    verified_at BIGINT,
    is_available_to_donate BOOLEAN DEFAULT false,
    last_donation_date BIGINT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_users_role_city ON users(role, city);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group, is_available_to_donate);

-- 2. BLOOD DONATION CAMPS (Blood Banks)
CREATE TABLE IF NOT EXISTS camps (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT DEFAULT 'Unnamed Camp',
    address TEXT DEFAULT '',
    city TEXT DEFAULT 'Unspecified',
    phone VARCHAR(128) DEFAULT '',
    coordinator_uid VARCHAR(255),
    coordinator_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_camps_city ON camps(city) WHERE is_active = true;

-- 3. HOSPITALS (Destination Centers)
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT DEFAULT 'Unnamed Hospital',
    address TEXT DEFAULT '',
    city TEXT DEFAULT 'Unspecified',
    phone VARCHAR(128) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city) WHERE is_active = true;

-- 4. CAMP INVENTORIES (Real-Time Blood Unit Tracking per Camp & Group)
CREATE TABLE IF NOT EXISTS camp_inventories (
    camp_id VARCHAR(255) REFERENCES camps(id) ON DELETE CASCADE,
    blood_group VARCHAR(128) NOT NULL,
    units INTEGER DEFAULT 0,
    last_updated_by VARCHAR(255),
    last_updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    PRIMARY KEY (camp_id, blood_group)
);

-- 5. DONATION REQUESTS (Main Clinical Medical Workflow Table)
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(255) PRIMARY KEY,
    reference_number VARCHAR(128) DEFAULT 'REQ-' || gen_random_uuid()::text,
    created_by VARCHAR(255),
    donor_name TEXT DEFAULT 'Anonymous',
    donor_blood_group VARCHAR(128) DEFAULT 'Any',
    donor_city TEXT DEFAULT 'Unspecified',
    required_blood_group VARCHAR(128) DEFAULT 'Any',
    units_required INTEGER DEFAULT 1,
    units_fulfilled INTEGER DEFAULT 0,
    urgency VARCHAR(128) DEFAULT 'normal',
    hospital_id VARCHAR(255) REFERENCES hospitals(id) ON DELETE SET NULL,
    hospital_name TEXT DEFAULT 'General Hospital',
    patient_name TEXT DEFAULT 'Anonymous Patient',
    required_by_date BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    notes TEXT,
    status VARCHAR(128) DEFAULT 'SUBMITTED',
    camp_id VARCHAR(255) REFERENCES camps(id) ON DELETE SET NULL,
    camp_name TEXT,
    matched_donor_uid VARCHAR(255),
    matched_donor_name TEXT,
    allocations JSONB DEFAULT '[]'::jsonb,
    partial_donations JSONB DEFAULT '[]'::jsonb,
    individual_donations JSONB DEFAULT '[]'::jsonb,
    donated_at BIGINT,
    closure_notes TEXT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_requests_status_urgency ON requests(status, urgency);
CREATE INDEX IF NOT EXISTS idx_requests_blood_city ON requests(required_blood_group, donor_city);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_requests_camp_id ON requests(camp_id);

-- 6. COMMENTS & COMMUNICATION THREADS
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) REFERENCES requests(id) ON DELETE CASCADE,
    author_uid VARCHAR(255),
    author_name TEXT DEFAULT 'Clinician',
    author_role VARCHAR(128) DEFAULT 'user',
    body TEXT DEFAULT '',
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id, created_at);

-- 7. FILE ATTACHMENTS & CLINICAL DOCUMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) REFERENCES requests(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(255),
    uploader_name TEXT DEFAULT 'User',
    file_name TEXT DEFAULT 'document',
    file_type VARCHAR(128) DEFAULT 'unknown',
    file_size INTEGER DEFAULT 0,
    url TEXT DEFAULT '',
    description TEXT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_attachments_request_id ON attachments(request_id);

-- 8. SYSTEM AUDIT & SECURITY LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(128) DEFAULT 'GENERAL',
    entity_id VARCHAR(255),
    actor_uid VARCHAR(255),
    actor_name TEXT,
    details TEXT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_time_event ON audit_logs(created_at DESC, event_type);

-- ============================================================================
-- End of Schema Definition. All foreign key constraints and indexes configured.
-- ============================================================================
