-- ============================================================
-- SUDSTRACK DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================================

-- Drop tables in reverse dependency order (safe re-run)
DROP TABLE IF EXISTS api_logs          CASCADE;
DROP TABLE IF EXISTS security_logs     CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS feedback          CASCADE;
DROP TABLE IF EXISTS weather_checks    CASCADE;
DROP TABLE IF EXISTS saved_orders      CASCADE;
DROP TABLE IF EXISTS payments          CASCADE;
DROP TABLE IF EXISTS order_tracking    CASCADE;
DROP TABLE IF EXISTS orders            CASCADE;
DROP TABLE IF EXISTS packages          CASCADE;
DROP TABLE IF EXISTS sessions          CASCADE;
DROP TABLE IF EXISTS accounts          CASCADE;

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
    account_id         SERIAL PRIMARY KEY,
    full_name          VARCHAR(150)  NOT NULL,
    email              VARCHAR(255)  NOT NULL UNIQUE,
    password_hash      VARCHAR(255),
    role               VARCHAR(20)   NOT NULL DEFAULT 'Customer'
                           CHECK (role IN ('Customer','Staff','SuperAdmin')),
    contact_number     VARCHAR(20),
    address            VARCHAR(500),
    auth_provider      VARCHAR(10)   NOT NULL DEFAULT 'Local'
                           CHECK (auth_provider IN ('Local','Google')),
    two_factor_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
    totp_secret        VARCHAR(255),
    login_attempts     INT           NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    profile_picture    TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
    session_id    SERIAL PRIMARY KEY,
    account_id    INT           NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    token_hash    VARCHAR(512)  NOT NULL,
    login_method  VARCHAR(20)   NOT NULL DEFAULT 'Local',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ   NOT NULL
);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens (
    reset_id    SERIAL PRIMARY KEY,
    account_id  INT          NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    token_hash  VARCHAR(512) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACKAGES
-- ============================================================
CREATE TABLE packages (
    package_id    SERIAL PRIMARY KEY,
    package_name  VARCHAR(100)    NOT NULL,
    description   VARCHAR(500),
    price         DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    order_id          SERIAL PRIMARY KEY,
    order_code        VARCHAR(20)    NOT NULL UNIQUE,
    account_id        INT            NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    package_id        INT            NOT NULL REFERENCES packages(package_id),
    pickup_address    VARCHAR(500)   NOT NULL,
    delivery_address  VARCHAR(500),
    load_size         VARCHAR(20)    NOT NULL CHECK (load_size IN ('Small','Medium','Large')),
    pickup_slot       TIMESTAMPTZ    NOT NULL,
    delivery_slot     TIMESTAMPTZ,
    status            VARCHAR(30)    NOT NULL DEFAULT 'Received'
                          CHECK (status IN ('Received','Washing','Drying','Ready for Delivery','Out for Delivery','Completed','Cancelled')),
    notes             TEXT,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER TRACKING
-- ============================================================
CREATE TABLE order_tracking (
    tracking_id      SERIAL PRIMARY KEY,
    order_id         INT          NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    rider_name       VARCHAR(150),
    claim_qr_code    TEXT,
    delivery_status  VARCHAR(30),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
    payment_id      SERIAL PRIMARY KEY,
    order_id        INT           NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    payment_method  VARCHAR(10)   NOT NULL CHECK (payment_method IN ('Cash','Online')),
    amount          DECIMAL(10,2) NOT NULL,
    payment_status  VARCHAR(10)   NOT NULL DEFAULT 'Pending'
                        CHECK (payment_status IN ('Pending','Paid','Failed','Refunded')),
    paid_at         TIMESTAMPTZ
);

-- ============================================================
-- SAVED ORDERS (starred by customer)
-- ============================================================
CREATE TABLE saved_orders (
    saved_order_id  SERIAL PRIMARY KEY,
    account_id      INT         NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    order_id        INT         NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    starred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, order_id)
);

-- ============================================================
-- WEATHER CHECKS
-- ============================================================
CREATE TABLE weather_checks (
    weather_check_id  SERIAL PRIMARY KEY,
    order_id          INT          REFERENCES orders(order_id) ON DELETE SET NULL,
    forecast_result   VARCHAR(100),
    description       VARCHAR(255),
    warning           BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE feedback (
    feedback_id   SERIAL PRIMARY KEY,
    order_id      INT         NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    account_id    INT         NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    rating        INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECURITY LOGS
-- ============================================================
CREATE TABLE security_logs (
    log_id             SERIAL PRIMARY KEY,
    account_id         INT          REFERENCES accounts(account_id) ON DELETE SET NULL,
    email_attempted    VARCHAR(255),
    event_type         VARCHAR(50)  NOT NULL,
    ip_address         VARCHAR(50),
    attempts_count     INT          NOT NULL DEFAULT 0,
    lockout_triggered  BOOLEAN      NOT NULL DEFAULT FALSE,
    reset_requested    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- API LOGS
-- ============================================================
CREATE TABLE api_logs (
    log_id         SERIAL PRIMARY KEY,
    api_name       VARCHAR(50)  NOT NULL,
    endpoint       VARCHAR(255),
    error_type     VARCHAR(100),
    error_message  TEXT,
    retry_count    INT          NOT NULL DEFAULT 0,
    recovered      BOOLEAN      NOT NULL DEFAULT FALSE,
    severity       VARCHAR(10)  NOT NULL DEFAULT 'Low'
                       CHECK (severity IN ('Low','Medium','High','Critical')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX idx_orders_account_id    ON orders(account_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_order_code    ON orders(order_code);
CREATE INDEX idx_sessions_account_id  ON sessions(account_id);
CREATE INDEX idx_payments_order_id    ON payments(order_id);
CREATE INDEX idx_security_logs_email  ON security_logs(email_attempted);
CREATE INDEX idx_api_logs_api_name    ON api_logs(api_name);
