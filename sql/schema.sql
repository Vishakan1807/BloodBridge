-- ============================================================================
-- BloodBridge Enterprise PostgreSQL Schema (Real-World Relational Database)
-- Guaranteed to operate without BaaS vendor lock-in, fully indexed for fast queries
-- ============================================================================

-- Enable UUID generation extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Linked with Firebase Authentication UID as Primary Key)
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    city VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    blood_group VARCHAR(8),
    camp_id VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by VARCHAR(128),
    verified_at BIGINT,
    is_available_to_donate BOOLEAN DEFAULT false,
    last_donation_date BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_city ON users(role, city);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group, is_available_to_donate);

-- 2. BLOOD DONATION CAMPS (Blood Banks)
CREATE TABLE IF NOT EXISTS camps (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    coordinator_uid VARCHAR(128),
    coordinator_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(128) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_camps_city ON camps(city) WHERE is_active = true;

-- 3. HOSPITALS (Destination Centers)
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(128) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city) WHERE is_active = true;

-- 4. CAMP INVENTORIES (Real-Time Blood Unit Tracking per Camp & Group)
CREATE TABLE IF NOT EXISTS camp_inventories (
    camp_id VARCHAR(128) REFERENCES camps(id) ON DELETE CASCADE,
    blood_group VARCHAR(8) NOT NULL,
    units INTEGER NOT NULL DEFAULT 0,
    last_updated_by VARCHAR(128) NOT NULL,
    last_updated_at BIGINT NOT NULL,
    PRIMARY KEY (camp_id, blood_group)
);

-- 5. DONATION REQUESTS (Main Clinical Medical Workflow Table)
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(128) PRIMARY KEY,
    reference_number VARCHAR(64) UNIQUE NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    donor_name VARCHAR(255) NOT NULL,
    donor_blood_group VARCHAR(8) NOT NULL,
    donor_city VARCHAR(128) NOT NULL,
    required_blood_group VARCHAR(8) NOT NULL,
    units_required INTEGER NOT NULL,
    units_fulfilled INTEGER DEFAULT 0,
    urgency VARCHAR(32) NOT NULL DEFAULT 'normal',
    hospital_id VARCHAR(128) REFERENCES hospitals(id) ON DELETE SET NULL,
    hospital_name VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    required_by_date BIGINT NOT NULL,
    notes TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED',
    camp_id VARCHAR(128) REFERENCES camps(id) ON DELETE SET NULL,
    camp_name VARCHAR(255),
    matched_donor_uid VARCHAR(128),
    matched_donor_name VARCHAR(255),
    -- Hybrid high-performance JSONB storage for complex contribution breakdowns
    allocations JSONB DEFAULT '[]'::jsonb,
    partial_donations JSONB DEFAULT '[]'::jsonb,
    individual_donations JSONB DEFAULT '[]'::jsonb,
    donated_at BIGINT,
    closure_notes TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_status_urgency ON requests(status, urgency);
CREATE INDEX IF NOT EXISTS idx_requests_blood_city ON requests(required_blood_group, donor_city);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_requests_camp_id ON requests(camp_id);

-- 6. COMMENTS & COMMUNICATION THREADS
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(128) PRIMARY KEY,
    request_id VARCHAR(128) REFERENCES requests(id) ON DELETE CASCADE,
    author_uid VARCHAR(128) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(32) NOT NULL,
    body TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id, created_at);

-- 7. FILE ATTACHMENTS & CLINICAL DOCUMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(128) PRIMARY KEY,
    request_id VARCHAR(128) REFERENCES requests(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(128) NOT NULL,
    uploader_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(64) NOT NULL,
    file_size INTEGER NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_request_id ON attachments(request_id);

-- 8. SYSTEM AUDIT & SECURITY LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(128) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    actor_uid VARCHAR(128),
    actor_name VARCHAR(255),
    details TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_time_event ON audit_logs(created_at DESC, event_type);

-- ============================================================================
-- End of Schema Definition. All foreign key constraints and indexes configured.
-- ============================================================================
