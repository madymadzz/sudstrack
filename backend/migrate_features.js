/**
 * Migration: Add consent columns to accounts + payment_proof & payment_status to orders & payments
 * 
 * Run: node backend/migrate_features.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./config/db');

async function runMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('[Migration] Adding consent columns to accounts...');
        await client.query(`
            ALTER TABLE accounts
                ADD COLUMN IF NOT EXISTS terms_accepted   BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS consent_at       TIMESTAMPTZ
        `);

        console.log('[Migration] Adding payment_proof & payment_status to orders...');
        await client.query(`
            ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS payment_proof     TEXT,
                ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
                ADD COLUMN IF NOT EXISTS payment_status    VARCHAR(30) DEFAULT 'Pending'
        `);

        console.log('[Migration] Updating payments table for payment proof & verified/rejected statuses...');
        await client.query(`
            ALTER TABLE payments
                ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
                ADD COLUMN IF NOT EXISTS proof_verified_at TIMESTAMPTZ
        `);

        // Drop payments_payment_status_check if exists and expand column length
        await client.query(`
            ALTER TABLE payments ALTER COLUMN payment_status TYPE VARCHAR(30);
            ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
            ALTER TABLE payments ADD CONSTRAINT payments_payment_status_check 
                CHECK (payment_status IN ('Pending','Paid','Failed','Refunded','Verified','Rejected','pending','verified','rejected'));
        `);

        await client.query('COMMIT');
        console.log('[Migration] Done. All columns & constraints updated successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Migration] FAILED:', err.message);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
