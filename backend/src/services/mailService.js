const nodemailer = require('nodemailer');
const env = require('../config/env');

function smtpCredentials() {
  const user = String(env.smtp.user || '').trim();
  const pass = String(env.smtp.pass || '').replace(/\s+/g, '');
  return {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    user,
    pass,
    fromName: env.smtp.fromName,
    fromEmail: env.smtp.fromEmail || user,
  };
}

function isPlaceholderSmtp(creds) {
  const user = creds.user.toLowerCase();
  const pass = creds.pass.toLowerCase();
  if (!creds.user || !creds.pass) return true;
  if (user.includes('your_gmail') || user.includes('example.com')) return true;
  if (pass.includes('your_') || pass.includes('app_password') || pass === 'password') return true;
  return false;
}

function createTransporter() {
  const creds = smtpCredentials();
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    requireTLS: !creds.secure && Number(creds.port) === 587,
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
  });
}

function maskUser(user) {
  if (!user) return '';
  const [name, domain] = user.split('@');
  if (!domain) return '***';
  const shown = name.slice(0, 2);
  return `${shown}***@${domain}`;
}

async function verifySmtp() {
  const creds = smtpCredentials();
  const base = {
    configured: Boolean(creds.user && creds.pass),
    placeholder: isPlaceholderSmtp(creds),
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    user_masked: maskUser(creds.user),
    from_email: creds.fromEmail,
    ok: false,
    error: null,
  };

  if (base.placeholder) {
    base.error =
      'SMTP_USER / SMTP_PASS are missing or still placeholders. Gmail requires a 16-character App Password (Google Account → Security → App passwords), not the normal Gmail login password. 535-5.7.8 means authentication was rejected.';
    return base;
  }

  try {
    await createTransporter().verify();
    base.ok = true;
    return base;
  } catch (err) {
    base.error = err.message || String(err);
    return base;
  }
}

async function sendPasswordEmail({
  email,
  firstName = '',
  token,
  mode = 'set',
}) {
  const resetMode =
    mode === 'reset';

  const pagePath =
    resetMode
      ? '/reset-password'
      : '/set-password';

  const actionUrl =
    `${env.customerFrontendUrl}${pagePath}` +
    `?token=${encodeURIComponent(token)}`;

  const subject =
    resetMode
      ? 'Brass Leaf Uniforms - Reset your password'
      : 'Brass Leaf Uniforms - Set your password';

  const buttonText =
    resetMode
      ? 'Reset Password'
      : 'Set Password';

  const description =
    resetMode
      ? 'We received a request to reset your Brass Leaf account password.'
      : 'Your Brass Leaf account has been created. Please set your password to activate your account.';

  const creds = smtpCredentials();
  await createTransporter().sendMail({
    from:
      `"${creds.fromName}" <${creds.fromEmail}>`,

    to: email,

    subject,

    html: `
      <div style="
        max-width:600px;
        margin:0 auto;
        padding:32px;
        font-family:Arial,sans-serif;
        color:#243346;
      ">
        <h2>
          Brass Leaf Uniforms
        </h2>

        <p>
          Hi ${firstName || 'Customer'},
        </p>

        <p>
          ${description}
        </p>

        <p style="margin:30px 0;">
          <a
            href="${actionUrl}"
            style="
              display:inline-block;
              padding:13px 24px;
              background:#D9A537;
              color:#243346;
              text-decoration:none;
              border-radius:8px;
              font-weight:700;
            "
          >
            ${buttonText}
          </a>
        </p>

        <p style="
          font-size:13px;
          color:#667085;
        ">
          This link expires in 30 minutes.
        </p>

        <p style="
          font-size:13px;
          color:#667085;
        ">
          If you did not request this action,
          you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendMail({ to, subject, html, text, attachments = [] }) {
  const creds = smtpCredentials();
  if (isPlaceholderSmtp(creds)) {
    const err = new Error(
      'SMTP authentication is not configured. Set SMTP_USER and SMTP_PASS to a Gmail address and App Password. 535-5.7.8 Username and Password not accepted means Gmail rejected the current credentials.'
    );
    err.code = 'ESMTPCONFIG';
    throw err;
  }
  return createTransporter().sendMail({
    from: `"${creds.fromName}" <${creds.fromEmail}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
}

module.exports = {
  sendPasswordEmail,
  sendMail,
  verifySmtp,
  smtpCredentials,
};
