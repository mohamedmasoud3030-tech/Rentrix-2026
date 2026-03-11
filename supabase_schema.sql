-- ========================================================
-- RENTRIX ERP - COMPLETE SUPABASE SCHEMA
-- ========================================================

-- 0. CLEANUP (Optional - Use with caution)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS governance CASCADE;
DROP TABLE IF EXISTS serials CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS receipt_allocations CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS maintenance_records CASCADE;
DROP TABLE IF EXISTS deposit_txs CASCADE;
DROP TABLE IF EXISTS owner_settlements CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS auto_backups CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS outgoing_notifications CASCADE;
DROP TABLE IF EXISTS app_notifications CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS lands CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;

-- 1. CORE TABLES
CREATE TABLE settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    company JSONB,
    tax_rate NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    account_mappings JSONB,
    updated_at BIGINT
);

CREATE TABLE governance (
    id BIGINT PRIMARY KEY DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE,
    financial_lock_date TEXT,
    updated_at BIGINT
);

CREATE TABLE serials (
    id BIGINT PRIMARY KEY DEFAULT 1,
    receipt INTEGER DEFAULT 1000,
    expense INTEGER DEFAULT 1000,
    invoice INTEGER DEFAULT 1000,
    owner_settlement INTEGER DEFAULT 1000,
    maintenance INTEGER DEFAULT 1000,
    lead INTEGER DEFAULT 1000,
    mission INTEGER DEFAULT 1000,
    journal_entry INTEGER DEFAULT 1000
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE')) DEFAULT 'EMPLOYEE',
    must_change BOOLEAN DEFAULT FALSE,
    created_at BIGINT
);

-- 2. PROPERTY MANAGEMENT
CREATE TABLE owners (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    phone2 TEXT,
    national_id TEXT,
    owner_type TEXT CHECK (owner_type IN ('INDIVIDUAL', 'COMPANY')),
    commission_type TEXT CHECK (commission_type IN ('RATE', 'FIXED')),
    commission_value NUMERIC DEFAULT 0,
    notes TEXT,
    portal_token TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

CREATE TABLE properties (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    total_units INTEGER,
    description TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

CREATE TABLE units (
    id UUID PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    unit_type TEXT,
    floor INTEGER,
    area_sqm NUMERIC,
    rooms_count INTEGER,
    bathrooms_count INTEGER,
    expected_rent NUMERIC,
    status TEXT CHECK (status IN ('VACANT', 'RENTED', 'MAINTENANCE')) DEFAULT 'VACANT',
    notes TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    phone2 TEXT,
    national_id TEXT,
    email TEXT,
    notes TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    unit_id UUID REFERENCES units(id),
    tenant_id UUID REFERENCES tenants(id),
    rent NUMERIC NOT NULL,
    due_day INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    deposit_amount NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('ACTIVE', 'TERMINATED', 'EXPIRED')) DEFAULT 'ACTIVE',
    notes TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

-- 3. FINANCIALS
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_id TEXT REFERENCES accounts(id),
    created_at BIGINT
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    due_date TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    tax_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE')),
    type TEXT CHECK (type IN ('RENT', 'MAINTENANCE', 'DEPOSIT', 'OTHER')),
    notes TEXT,
    no TEXT,
    created_at BIGINT,
    updated_at BIGINT,
    voided_at BIGINT
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    no TEXT,
    contract_id UUID REFERENCES contracts(id),
    date_time TEXT NOT NULL,
    status TEXT CHECK (status IN ('POSTED', 'VOID')),
    amount NUMERIC NOT NULL,
    channel TEXT,
    ref TEXT,
    notes TEXT,
    created_at BIGINT,
    voided_at BIGINT
);

CREATE TABLE receipt_allocations (
    id UUID PRIMARY KEY,
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    created_at BIGINT
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    no TEXT,
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    contract_id UUID REFERENCES contracts(id),
    date_time TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    charged_to TEXT CHECK (charged_to IN ('OWNER', 'OFFICE', 'TENANT')),
    status TEXT CHECK (status IN ('POSTED', 'VOID')),
    notes TEXT,
    created_at BIGINT,
    voided_at BIGINT
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY,
    no TEXT,
    date TEXT NOT NULL,
    account_id TEXT REFERENCES accounts(id),
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('DEBIT', 'CREDIT')),
    source_id TEXT,
    entity_type TEXT,
    entity_id TEXT,
    created_at BIGINT
);

CREATE TABLE deposit_txs (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('COLLECTION', 'REFUND', 'FORFEIT')),
    date TEXT NOT NULL,
    status TEXT CHECK (status IN ('POSTED', 'VOID')),
    created_at BIGINT
);

CREATE TABLE owner_settlements (
    id UUID PRIMARY KEY,
    no TEXT,
    owner_id UUID REFERENCES owners(id),
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    method TEXT,
    status TEXT CHECK (status IN ('POSTED', 'VOID')),
    created_at BIGINT
);

-- 4. OPERATIONS & LOGS
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    ts BIGINT,
    user_id UUID,
    username TEXT,
    action TEXT,
    entity TEXT,
    entity_id TEXT,
    note TEXT
);

CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY,
    no TEXT,
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    issue_title TEXT NOT NULL,
    description TEXT,
    cost NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at BIGINT
);

CREATE TABLE leads (
    id UUID PRIMARY KEY,
    no TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    status TEXT,
    notes TEXT,
    created_at BIGINT
);

CREATE TABLE lands (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    area NUMERIC,
    price NUMERIC,
    status TEXT,
    created_at BIGINT
);

CREATE TABLE commissions (
    id UUID PRIMARY KEY,
    entity_type TEXT,
    entity_id TEXT,
    amount NUMERIC,
    status TEXT,
    created_at BIGINT
);

CREATE TABLE missions (
    id UUID PRIMARY KEY,
    no TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID,
    due_date TEXT,
    status TEXT,
    created_at BIGINT
);

CREATE TABLE budgets (
    id UUID PRIMARY KEY,
    year INTEGER,
    category TEXT,
    amount NUMERIC,
    created_at BIGINT
);

CREATE TABLE snapshots (
    id BIGSERIAL PRIMARY KEY,
    ts BIGINT,
    note TEXT,
    data JSONB
);

CREATE TABLE auto_backups (
    id BIGSERIAL PRIMARY KEY,
    ts BIGINT,
    url TEXT,
    status TEXT
);

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY,
    name TEXT,
    content TEXT,
    type TEXT
);

CREATE TABLE outgoing_notifications (
    id UUID PRIMARY KEY,
    recipient TEXT,
    message TEXT,
    status TEXT,
    created_at BIGINT
);

CREATE TABLE app_notifications (
    id UUID PRIMARY KEY,
    user_id UUID,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at BIGINT
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    entity_type TEXT,
    entity_id TEXT,
    file_name TEXT,
    file_url TEXT,
    created_at BIGINT
);

-- 5. INITIAL DATA
INSERT INTO settings (id, company, tax_rate, currency, account_mappings, updated_at) VALUES (1, '{"name": "مشاريع جودة الإنطلاقة", "address": "الرياض، المملكة العربية السعودية", "phone": "966500000000", "email": "info@quality.sa", "logo": ""}', 15, 'SAR', '{
    "accountsReceivable": "1201",
    "ownersPayable": "2101",
    "paymentMethods": {
        "CASH": "1101",
        "BANK": "1102",
        "CARD": "1103"
    },
    "revenue": {
        "RENT": "4101",
        "OFFICE_COMMISSION": "4102"
    },
    "expenseCategories": {
        "MAINTENANCE": "5101",
        "UTILITIES": "5102",
        "default": "5103"
    }
}', extract(epoch from now()) * 1000);

INSERT INTO governance (id, is_locked, financial_lock_date, updated_at) VALUES (1, FALSE, NULL, extract(epoch from now()) * 1000);
INSERT INTO serials (id) VALUES (1);

INSERT INTO accounts (id, name, type, created_at) VALUES 
('1101', 'الصندوق (نقدي)', 'ASSET', extract(epoch from now()) * 1000),
('1102', 'البنك', 'ASSET', extract(epoch from now()) * 1000),
('1103', 'الشبكة / مدى', 'ASSET', extract(epoch from now()) * 1000),
('1201', 'ذمم المستأجرين (مدينون)', 'ASSET', extract(epoch from now()) * 1000),
('2101', 'ذمم الملاك (دائنون)', 'LIABILITY', extract(epoch from now()) * 1000),
('4101', 'إيرادات إيجارات', 'REVENUE', extract(epoch from now()) * 1000),
('4102', 'إيرادات عمولات إدارية', 'REVENUE', extract(epoch from now()) * 1000),
('5101', 'مصاريف صيانة', 'EXPENSE', extract(epoch from now()) * 1000),
('5102', 'مصاريف مرافق (كهرباء/مياه)', 'EXPENSE', extract(epoch from now()) * 1000),
('5103', 'مصاريف إدارية أخرى', 'EXPENSE', extract(epoch from now()) * 1000);

-- 6. RLS POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- Repeat for other tables to ensure authenticated access
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON settings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON governance FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON serials FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON owners FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON properties FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON units FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON tenants FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON contracts FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON accounts FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON receipts FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE receipt_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON receipt_allocations FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON expenses FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON journal_entries FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON audit_log FOR ALL USING (auth.role() = 'authenticated');

-- 7. AUTH SYNC TRIGGER
-- This trigger automatically creates a record in public.users when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, role, must_change, created_at)
  VALUES (NEW.id, NEW.email, 'ADMIN', FALSE, extract(epoch from now()) * 1000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
