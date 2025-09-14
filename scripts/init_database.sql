-- OFAIR Complete Database Schema Initialization
-- Creates all tables for the entire platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'professional', 'admin', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('lead_new', 'proposal_received', 'proposal_accepted', 'payment_received', 'message', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- USERS SERVICE TABLES
-- ==========================================

-- Users table (core user data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    role user_role DEFAULT 'customer',
    status user_status DEFAULT 'pending_verification',
    profile_data JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT users_contact_check CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Professional profiles (extends users for professionals)
CREATE TABLE IF NOT EXISTS professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    business_number VARCHAR(50),
    specialties TEXT[],
    service_areas TEXT[],
    experience_years INTEGER,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    certifications JSONB DEFAULT '[]',
    portfolio_items JSONB DEFAULT '[]',
    availability JSONB DEFAULT '{}',
    pricing_info JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer profiles (extends users for customers)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    preferences JSONB DEFAULT '{}',
    favorite_professionals UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- LEADS SERVICE TABLES
-- ==========================================

-- Leads table (job postings)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    location TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    urgency VARCHAR(20) DEFAULT 'normal',
    status lead_status DEFAULT 'open',
    contact_preference VARCHAR(20) DEFAULT 'phone',
    preferred_times JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    views_count INTEGER DEFAULT 0,
    proposals_count INTEGER DEFAULT 0,
    assigned_professional_id UUID REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Lead categories
CREATE TABLE IF NOT EXISTS lead_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    name_he VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES lead_categories(id),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead views tracking
CREATE TABLE IF NOT EXISTS lead_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, professional_id)
);

-- ==========================================
-- PROPOSALS SERVICE TABLES
-- ==========================================

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id),
    price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    estimated_duration VARCHAR(100),
    availability TEXT,
    status proposal_status DEFAULT 'pending',
    customer_viewed BOOLEAN DEFAULT FALSE,
    customer_viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    UNIQUE(lead_id, professional_id)
);

-- Proposal messages
CREATE TABLE IF NOT EXISTS proposal_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- REFERRALS SERVICE TABLES
-- ==========================================

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    referred_professional_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    commission_percentage DECIMAL(5,2) DEFAULT 10.00,
    commission_amount DECIMAL(10,2),
    notes TEXT,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, referred_professional_id)
);

-- Commission calculations
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id),
    lead_value DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP
);

-- ==========================================
-- PAYMENTS SERVICE TABLES
-- ==========================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    lead_id UUID REFERENCES leads(id),
    proposal_id UUID REFERENCES proposals(id),
    type VARCHAR(50) NOT NULL, -- 'payment', 'refund', 'commission', 'payout'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ILS',
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_details JSONB DEFAULT '{}',
    gateway_response JSONB DEFAULT '{}',
    reference_number VARCHAR(100) UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User balances
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    pending_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
    last_payout_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payout requests
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(50) NOT NULL, -- 'bank_transfer', 'paypal', etc.
    account_details JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reference_number VARCHAR(100),
    processed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- NOTIFICATIONS SERVICE TABLES
-- ==========================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_he VARCHAR(255),
    message TEXT NOT NULL,
    message_he TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_via TEXT[] DEFAULT '{}', -- ['push', 'email', 'sms']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    lead_updates BOOLEAN DEFAULT TRUE,
    proposal_updates BOOLEAN DEFAULT TRUE,
    payment_updates BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ADMIN SERVICE TABLES
-- ==========================================

-- Admin users (separate from main users for security)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'support', -- 'super_admin', 'admin', 'support'
    permissions JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- REVIEWS AND RATINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    professional_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    response_at TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, customer_id, professional_id)
);

-- ==========================================
-- MESSAGING SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    participant_ids UUID[] NOT NULL,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Proposals indexes
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_professional_id ON proposals(professional_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert default categories
INSERT INTO lead_categories (name, name_he, icon, sort_order) VALUES
    ('Plumbing', 'אינסטלציה', 'wrench', 1),
    ('Electrical', 'חשמל', 'bolt', 2),
    ('HVAC', 'מיזוג אוויר', 'fan', 3),
    ('Painting', 'צביעה', 'brush', 4),
    ('Cleaning', 'ניקיון', 'sparkles', 5),
    ('Moving', 'הובלות', 'truck', 6),
    ('Renovation', 'שיפוצים', 'hammer', 7),
    ('Gardening', 'גינון', 'tree', 8),
    ('Appliance Repair', 'תיקון מכשירים', 'tv', 9),
    ('Pest Control', 'הדברה', 'bug', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
    ('commission_rate', '{"default": 10, "min": 5, "max": 20}', 'Platform commission rates'),
    ('referral_bonus', '{"percentage": 10, "min_amount": 50}', 'Referral bonus configuration'),
    ('payout_threshold', '{"amount": 100, "currency": "ILS"}', 'Minimum payout amount'),
    ('lead_expiry_days', '30', 'Days before a lead expires'),
    ('proposal_expiry_days', '7', 'Days before a proposal expires')
ON CONFLICT (key) DO NOTHING;

-- Create default admin user (password should be changed immediately)
INSERT INTO admin_users (email, name, role, permissions) VALUES
    ('admin@ofair.co.il', 'System Admin', 'super_admin', '["all"]')
ON CONFLICT (email) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
END;
$$;