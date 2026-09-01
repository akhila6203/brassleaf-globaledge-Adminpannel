// require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
// const app = require('./src/app');
// const env = require('./src/config/env');
// const { startDailyReportJob } = require('./src/jobs/dailyReportEmail');

// const PORT = env.port || 4000;

// app.listen(PORT, () => {
//   console.log(`Brassleaf Admin API listening on http://localhost:${PORT}`);
//   console.log(`WP site URL: ${env.wpSiteUrl}`);
//   startDailyReportJob();
// });
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port || 4000;


const { startReportScheduler } = require('./src/services/reportScheduler');
const { ensureReportLogsTable } = require('./src/services/reportLogService');

app.listen(PORT, async () => {
  console.log(`Brassleaf Admin API listening on http://localhost:${PORT}`);
  console.log(`WP site URL: ${env.wpSiteUrl}`);
  try {
    await ensureReportLogsTable();
  } catch (err) {
    console.error('[reports] could not ensure log table:', err.message);
  }
  startReportScheduler();
});