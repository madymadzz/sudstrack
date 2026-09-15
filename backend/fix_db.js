require('dotenv').config();
const pool = require('./config/db');
pool.query(`
    UPDATE payments 
    SET paid_at = (SELECT created_at FROM orders WHERE orders.order_id = payments.order_id)
    WHERE payment_status = 'Paid' AND paid_at IS NULL
`).then(res => {
    console.log('Rows updated:', res.rowCount);
    process.exit(0);
});
