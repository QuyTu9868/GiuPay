const QRCode = require('qrcode');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const EMAIL  = 'giupay@gmail.com';
const SECRET = 'KAKSADJLGJTWGJK3';
const otpUrl = `otpauth://totp/GiuPay%20Admin:${encodeURIComponent(EMAIL)}?secret=${SECRET}&issuer=GiuPay%20Admin&algorithm=SHA1&digits=6&period=30`;

// Update DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(
  `INSERT INTO admins (email, password_hash, totp_secret, is_active)
   VALUES ($1, 'placeholder', $2, true)
   ON CONFLICT (email) DO UPDATE SET totp_secret = EXCLUDED.totp_secret, is_active = true`,
  [EMAIL, SECRET]
).then(() => {
  console.log('Admin DB updated:', EMAIL);
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });

// Generate QR
QRCode.toFile(path.join(__dirname, 'admin_totp_qr.png'), otpUrl, { width: 300 }, (err) => {
  if (err) console.error('QR error:', err);
  else console.log('QR saved: backend/admin_totp_qr.png');
});
