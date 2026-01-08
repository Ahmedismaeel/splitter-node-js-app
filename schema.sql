-- Expense Splitter App - PostgreSQL Database Schema

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- =============================================
-- GROUPS TABLE
-- =============================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    invitation_code VARCHAR(8) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_invitation_code ON groups(invitation_code);
CREATE INDEX idx_groups_created_by ON groups(created_by);

-- =============================================
-- GROUP MEMBERS TABLE
-- =============================================
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- =============================================
-- EXPENSES TABLE
-- =============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    split_type VARCHAR(10) NOT NULL CHECK (split_type IN ('equal', 'custom')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_date ON expenses(date);

-- =============================================
-- EXPENSE SPLITS TABLE
-- =============================================
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed DECIMAL(10, 2) NOT NULL CHECK (amount_owed >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);

-- =============================================
-- SETTLEMENTS TABLE
-- =============================================
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_settlements_group_id ON settlements(group_id);
CREATE INDEX idx_settlements_from_user_id ON settlements(from_user_id);
CREATE INDEX idx_settlements_to_user_id ON settlements(to_user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for groups table
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for expenses table
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTION: Generate unique invitation code
-- =============================================
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE QUERIES (Documentation)
-- =============================================

-- Get all members of a group
-- SELECT u.id, u.name, u.email
-- FROM users u
-- JOIN group_members gm ON u.id = gm.user_id
-- WHERE gm.group_id = 'group-uuid-here';

-- Get all expenses in a group
-- SELECT e.*, u.name as paid_by_name
-- FROM expenses e
-- JOIN users u ON e.paid_by = u.id
-- WHERE e.group_id = 'group-uuid-here'
-- ORDER BY e.date DESC;

-- Calculate balance for a user in a group
-- WITH user_paid AS (
--     SELECT COALESCE(SUM(amount), 0) as total_paid
--     FROM expenses
--     WHERE group_id = 'group-uuid-here' AND paid_by = 'user-uuid-here'
-- ),
-- user_owes AS (
--     SELECT COALESCE(SUM(es.amount_owed), 0) as total_owed
--     FROM expense_splits es
--     JOIN expenses e ON es.expense_id = e.id
--     WHERE e.group_id = 'group-uuid-here' AND es.user_id = 'user-uuid-here'
-- )
-- SELECT 
--     (SELECT total_paid FROM user_paid) - (SELECT total_owed FROM user_owes) as balance;

-- Get who owes whom in a group
-- SELECT 
--     u1.name as from_user,
--     u2.name as to_user,
--     SUM(es.amount_owed) as amount
-- FROM expense_splits es
-- JOIN expenses e ON es.expense_id = e.id
-- JOIN users u1 ON es.user_id = u1.id
-- JOIN users u2 ON e.paid_by = u2.id
-- WHERE e.group_id = 'group-uuid-here' 
--   AND es.user_id != e.paid_by
-- GROUP BY u1.id, u1.name, u2.id, u2.name;