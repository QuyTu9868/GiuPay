const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('SELECT id, name, status, wallet_address, gmail FROM shops ORDER BY created_at DESC LIMIT 10')
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
