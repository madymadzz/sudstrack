require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS staff_messages (
            message_id  SERIAL PRIMARY KEY,
            sender_id   INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
            content     TEXT NOT NULL,
            created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_staff_messages_created ON staff_messages(created_at);
    `);
    console.log('staff_messages table ready');
    process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
