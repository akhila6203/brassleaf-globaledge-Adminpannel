const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html, attachments = [] }) {
  const tx = getTransporter();
  if (!tx) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend .env');
  }
  const from = env.smtp.from || env.smtp.user;
  return tx.sendMail({ from, to, subject, text, html, attachments });
}

module.exports = { sendMail, getTransporter };
