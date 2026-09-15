require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS riders (
        rider_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(30),
        vehicle VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Offline')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('riders table created');

    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS rider_id INTEGER REFERENCES riders(rider_id) ON DELETE SET NULL
    `);
    console.log('rider_id added to orders');

    // Seed 3 default riders (only if table is empty)
    const existing = await pool.query('SELECT COUNT(*) FROM riders');
    if (parseInt(existing.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO riders (name, phone, vehicle) VALUES
          ('Juan dela Cruz', '+639171234567', 'Motorcycle (Red Honda Click)'),
          ('Maria Santos', '+639281234567', 'Motorcycle (Blue Yamaha Mio)'),
          ('Pedro Reyes', '+639391234567', 'Motorcycle (Black Honda TMX)')
      `);
      console.log('3 default riders seeded');
    } else {
      console.log('Riders already exist, skipping seed');
    }

    await pool.end();
    console.log('Migration complete!');
  } catch(err) {
    console.error('Migration error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
