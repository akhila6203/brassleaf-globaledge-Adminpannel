const cron = require('node-cron');
const env = require('../config/env');
const reportService = require('../services/reportService');
const reportScheduleService = require('../services/reportScheduleService');

let scheduledTask = null;

async function runDailyReportJob() {
  try {
    const schedule = await reportScheduleService.getSchedule();
    if (!schedule.enabled) {
      console.log('Daily report email skipped (disabled in schedule)');
      return;
    }
    const result = await reportService.sendDailyAdminReports(schedule);
    console.log('Daily report emails:', JSON.stringify(result));
  } catch (err) {
    console.error('Daily report email job failed:', err.message);
  }
}

async function startDailyReportJob() {
  if (!env.smtp.host || !env.smtp.user) {
    console.log('Daily report emails disabled (set SMTP_* in .env)');
    return;
  }

  await rescheduleDailyReportJob();
}

async function rescheduleDailyReportJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!env.smtp.host || !env.smtp.user) return;

  const schedule = await reportScheduleService.getSchedule();
  if (!schedule.enabled) {
    console.log('Daily report email job not scheduled (disabled)');
    return;
  }

  const cronExpr = schedule.cron || reportScheduleService.timeToCron(schedule.send_time);

  if (!cron.validate(cronExpr)) {
    console.error('Invalid daily report cron expression:', cronExpr);
    return;
  }

  scheduledTask = cron.schedule(
    cronExpr,
    runDailyReportJob,
    { timezone: schedule.timezone || 'Asia/Kolkata' }
  );

  console.log(
    `Daily report email scheduled (${cronExpr}, ${schedule.timezone}, report_day=${schedule.report_day}, ${schedule.send_time})`
  );
}

module.exports = {
  startDailyReportJob,
  rescheduleDailyReportJob,
  runDailyReportJob,
};
