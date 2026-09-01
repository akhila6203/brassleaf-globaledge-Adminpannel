const cron = require('node-cron');
const env = require('../config/env');
const reportService = require('../services/reportService');

function startDailyReportJob() {
  if (!env.adminEmail || !env.smtp.host) {
    console.log('Daily report emails disabled (set ADMIN_EMAIL and SMTP_* in .env)');
    return;
  }

  cron.schedule(
    env.dailyReportCron,
    async () => {
      try {
        const result = await reportService.sendDailyAdminReports();
        console.log('Daily report emails sent:', JSON.stringify(result));
      } catch (err) {
        console.error('Daily report email job failed:', err.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.log(`Daily report email job scheduled (${env.dailyReportCron}, Asia/Kolkata)`);
}

module.exports = { startDailyReportJob };
