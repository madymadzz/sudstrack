require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
    const adminHash = await bcrypt.hash('admin123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);
    
    await pool.query(`INSERT INTO accounts (full_name, email, password_hash, role) VALUES ('Demo SuperAdmin', 'admin@sudstrack.demo', $1, 'SuperAdmin') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`, [adminHash]);

    await pool.query(`INSERT INTO accounts (full_name, email, password_hash, role) VALUES ('Demo Staff', 'staff@sudstrack.demo', $1, 'Staff') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`, [staffHash]);

    console.log('Seed done!');
    pool.end();
}
seed();
