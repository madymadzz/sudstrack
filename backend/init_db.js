require('dotenv').config();
const pool = require('./config/db');

async function setupTables() {
    try {
        await pool.query(
            CREATE TABLE IF NOT EXISTS notifications (
                notification_id SERIAL PRIMARY KEY,
                account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
                title VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        );
        console.log('notifications table created.');

        await pool.query(
            CREATE TABLE IF NOT EXISTS promotions (
                promo_id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                image_url TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        );
        console.log('promotions table created.');

        await pool.query(
            CREATE TABLE IF NOT EXISTS admin_logs (
                log_id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES accounts(account_id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        );
        console.log('admin_logs table created.');

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        process.exit();
    }
}
setupTables();
