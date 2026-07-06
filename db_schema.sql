-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'SK', 'LYDC', 'scholar')),
    barangay VARCHAR(100),
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scholar Applications Table (LYDC Resolution No. 5, Series of 2026)
CREATE TABLE IF NOT EXISTS scholar_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE UNIQUE,
    application_no VARCHAR(50),
    date_filed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    semester_sy VARCHAR(50) NOT NULL,
    
    -- I. Personal Information
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(10),
    date_of_birth DATE NOT NULL,
    sex VARCHAR(10) NOT NULL,
    civil_status VARCHAR(20) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    barangay VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    
    -- II. Educational Background
    school_enrolled VARCHAR(255) NOT NULL,
    course_program VARCHAR(255) NOT NULL,
    year_level VARCHAR(20) NOT NULL,
    student_id_no VARCHAR(50),
    gwa NUMERIC(5,2) NOT NULL,
    gwa_scale VARCHAR(10) DEFAULT '100' CHECK (gwa_scale IN ('100', '5')), -- 100-scale or 5-scale (1.00-5.00)
    q1_grade NUMERIC(5,2),
    q2_grade NUMERIC(5,2),
    q3_grade NUMERIC(5,2),
    q4_grade NUMERIC(5,2),
    
    -- III. Family & Socio-Economic Background
    parent_guardian_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    parent_contact VARCHAR(20) NOT NULL,
    monthly_income NUMERIC(10,2) NOT NULL,
    num_dependents INTEGER NOT NULL,
    source_of_income VARCHAR(255) NOT NULL,
    
    -- IV. Special Circumstances
    is_solo_parent_beneficiary BOOLEAN DEFAULT FALSE,
    is_orphan BOOLEAN DEFAULT FALSE,
    is_pwd BOOLEAN DEFAULT FALSE,
    is_ip BOOLEAN DEFAULT FALSE,
    is_out_of_school_youth BOOLEAN DEFAULT FALSE,
    is_marginalized BOOLEAN DEFAULT FALSE,
    special_circumstances_specify TEXT,
    
    -- V. Leadership & Involvement
    leadership_activities TEXT,
    
    -- Google Drive File Metadata (Documentary Requirements)
    letter_to_mayor_file_id VARCHAR(255),
    letter_to_mayor_url TEXT,
    valid_id_file_id VARCHAR(255),
    valid_id_url TEXT,
    enrollment_cert_file_id VARCHAR(255),
    enrollment_cert_url TEXT,
    grade_transcript_file_id VARCHAR(255),
    grade_transcript_url TEXT,
    barangay_clearance_file_id VARCHAR(255),
    barangay_clearance_url TEXT,
    special_id_file_id VARCHAR(255), -- PWD/IP/Solo Parent ID
    special_id_url TEXT,
    
    -- VI. Assessment Scoring (For Official Use Only)
    score_academic NUMERIC(5,2) DEFAULT 0.00, -- 30% weight
    score_socio_economic NUMERIC(5,2) DEFAULT 0.00, -- 30% weight
    score_leadership NUMERIC(5,2) DEFAULT 0.00, -- 15% weight
    score_interview NUMERIC(5,2) DEFAULT 0.00, -- 15% weight
    score_special_circumstances NUMERIC(5,2) DEFAULT 0.00, -- 10% weight
    score_total NUMERIC(5,2) DEFAULT 0.00, -- 100% total
    evaluator_remarks TEXT,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Evaluation', 'Approved', 'Rejected')),
    evaluated_by VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE
);

-- Documents Table (Logs metadata of files uploaded to Google Drive)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id VARCHAR(255) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    uploaded_by VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deadlines Table
CREATE TABLE IF NOT EXISTS deadlines (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
    target_role VARCHAR(50) DEFAULT 'all'
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT
);

-- Seed initial admin user if not exists
-- (Password hash represents bcrypt hash of 'Admin@2026!')
INSERT INTO users (username, password_hash, role, display_name)
VALUES (
    'admin', 
    '$2b$10$pxBfx8kWYuOrntklVC1Dxefc9LqE/1FDx3JCYORQkt4mbT6YE9.8.', 
    'admin', 
    'System Administrator'
)
ON CONFLICT (username) DO NOTHING;
