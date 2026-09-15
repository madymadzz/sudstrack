require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSQL() {
    try {
        console.log('Running schema.sql...');
        const schema = fs.readFileSync('./db/schema.sql', 'utf8');
        await pool.query(schema);
        console.log('schema.sql done');

        console.log('Running seed.sql...');
        const seed = fs.readFileSync('./db/seed.sql', 'utf8');
        await pool.query(seed);
        console.log('seed.sql done');

        const tables = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));

        const accounts = await pool.query('SELECT email, role FROM accounts');
        console.log('Seed accounts:', accounts.rows.map(r => r.email + ' (' + r.role + ')').join(', '));

        const pkgs = await pool.query('SELECT package_name, price FROM packages');
        console.log('Seed packages:', pkgs.rows.map(r => r.package_name).join(', '));

        pool.end();
    } catch(e) {
        console.error('ERROR:', e.message);
        pool.end();
    }
}

runSQL();
