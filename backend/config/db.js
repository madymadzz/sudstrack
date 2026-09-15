const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Supabase transaction pooler (pgBouncer) — disable prepared statements
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully (via Supabase pooler)');
        release();
    }
});

module.exports = pool;

