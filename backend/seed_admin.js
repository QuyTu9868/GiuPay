const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(
  `INSERT INTO admins (email, password_hash, totp_secret, is_active)
   VALUES ($1, $2, $3, true)
   ON CONFLICT (email) DO UPDATE SET totp_secret = EXCLUDED.totp_secret`,
  ['hangquytu2024@gmail.com', 'placeholder', 'KAKSADJLGJTWGJK3']
)
.then(() => { console.log('Admin seeded OK'); pool.end(); })
.catch(e => { console.error('Error:', e.message); pool.end(); });
