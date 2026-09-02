const pool = require('../config/db');
const P = require('../config/prefix');
const env = require('../config/env');
const { verifySmtp } = require('./mailService');

const OPTION_KEY = 'brassleaf_daily_report_schedule';

const DEFAULTS = {
  admin_email: '',
  send_time: '08:00',
  report_day: 'previous',
  timezone: 'Asia/Kolkata',
  enabled: true,
};

async function getOption(key) {
  const [[row]] = await pool.query(
    `SELECT option_value FROM ${P}options WHERE option_name = ? LIMIT 1`,
    [key]
  );
  return row?.option_value || null;
}

async function setOption(key, value) {
  const [existing] = await pool.query(
    `SELECT option_id FROM ${P}options WHERE option_name = ? LIMIT 1`,
    [key]
  );
  if (existing.length) {
    await pool.query(`UPDATE ${P}options SET option_value = ? WHERE option_name = ?`, [value, key]);
  } else {
    await pool.query(
      `INSERT INTO ${P}options (option_name, option_value, autoload) VALUES (?, ?, 'yes')`,
      [key, value]
    );
  }
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULTS.send_time;
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToCron(sendTime) {
  const [hour, minute] = normalizeTime(sendTime).split(':').map(Number);
  return `${minute} ${hour} * * *`;
}

async function getDefaultAdminEmail() {
  const wpAdmin = await getOption('admin_email');
  return (
    env.adminEmail ||
    wpAdmin ||
    env.smtp.fromEmail ||
    env.smtp.user ||
    ''
  );
}

async function getSchedule() {
  let stored = {};
  try {
    const raw = await getOption(OPTION_KEY);
    stored = raw ? JSON.parse(raw) : {};
  } catch {
    stored = {};
  }

  const adminEmail = stored.admin_email || (await getDefaultAdminEmail());
  const sendTime = normalizeTime(stored.send_time || DEFAULTS.send_time);
  const reportDay = stored.report_day === 'today' ? 'today' : 'previous';

  return {
    admin_email: adminEmail,
    send_time: sendTime,
    report_day: reportDay,
    timezone: stored.timezone || DEFAULTS.timezone,
    enabled: stored.enabled !== false,
    cron: timeToCron(sendTime),
  };
}

async function saveSchedule(input = {}) {
  const current = await getSchedule();

  const next = {
    admin_email: String(input.admin_email || current.admin_email || '').trim(),
    send_time: normalizeTime(input.send_time || current.send_time),
    report_day: input.report_day === 'today' ? 'today' : 'previous',
    timezone: input.timezone || current.timezone || DEFAULTS.timezone,
    enabled: input.enabled !== false,
  };

  if (!next.admin_email) {
    next.admin_email = await getDefaultAdminEmail();
  }

  await setOption(OPTION_KEY, JSON.stringify(next));

  const saved = await getSchedule();
  return saved;
}

async function getScheduleStatus() {
  const schedule = await getSchedule();
  const smtp = await verifySmtp();
  return { schedule, smtp };
}

module.exports = {
  getSchedule,
  saveSchedule,
  getScheduleStatus,
  timeToCron,
  OPTION_KEY,
};
