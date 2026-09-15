require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
            id          SERIAL PRIMARY KEY,
            account_id  INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
            title       VARCHAR(255) NOT NULL,
            message     TEXT NOT NULL,
            link_tab    VARCHAR(50),
            is_read     BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_account ON admin_notifications(account_id, is_read);
    `);
    console.log('admin_notifications table ready');
    process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
