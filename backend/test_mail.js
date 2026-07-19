const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

transporter.sendMail({
  from: `"GiuPay Test" <${process.env.GMAIL_USER}>`,
  to: process.env.ADMIN_EMAIL,
  subject: 'Test email tu GiuPay backend',
  html: '<p>Email test thanh cong!</p>',
}).then(info => {
  console.log('OK:', info.messageId);
}).catch(err => {
  console.error('LOI:', err.message);
});
