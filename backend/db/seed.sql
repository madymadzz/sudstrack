-- ============================================================
-- SUDSTRACK SEED DATA
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- ACCOUNTS: Super Admin + Staff
-- ============================================================
INSERT INTO accounts (full_name, email, password_hash, role, auth_provider, created_at)
VALUES
    (
        'Super Admin',
        'admin@sudstrack.demo',
        '$2b$12$OvxyF.S929puJmZzBYAc6u.JDExekOg.jmQS3uusKqQLAPTZbFPpe',
        'SuperAdmin',
        'Local',
        NOW()
    ),
    (
        'Staff Member',
        'staff@sudstrack.demo',
        '$2b$12$8FT/IjjnByFR9GSRBxAYAeDtsXYZIjX5FFN/B5156.crJqlQdOiM2',
        'Staff',
        'Local',
        NOW()
    );

-- ============================================================
-- PACKAGES (matches existing frontend)
-- ============================================================
INSERT INTO packages (package_name, description, price, is_active)
VALUES
    (
        'Wash & Fold',
        'Everyday laundry washed, dried, and neatly folded.',
        0.00,
        TRUE
    ),
    (
        'Wash & Iron',
        'Washed, dried, and press-finished for a crisp, ready-to-wear look.',
        50.00,
        TRUE
    ),
    (
        'Dry Clean',
        'Gentle professional care for delicates, suits, and special fabrics.',
        120.00,
        TRUE
    ),
    (
        'Express (6-Hour)',
        'Rush service — same-day turnaround for urgent loads.',
        100.00,
        TRUE
    );
