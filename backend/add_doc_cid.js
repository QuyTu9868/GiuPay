const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("ALTER TABLE shops ADD COLUMN IF NOT EXISTS doc_cid TEXT")
  .then(() => { console.log('✅ doc_cid column added'); p.end(); })
  .catch(e => { console.error('❌', e.message); p.end(); });
