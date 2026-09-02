const reportService = require('../services/reportService');
const reportScheduleService = require('../services/reportScheduleService');
const { rescheduleDailyReportJob } = require('../jobs/dailyReportEmail');

// const archiver = require('archiver');

async function list(req, res) {
  res.json(await reportService.list(req));
}

async function summary(req, res) {
  res.json(await reportService.summary(req));
}
async function download(req, res) {
  const type =
    req.query.type === 'packing-slip'
      ? 'packing-slip'
      : 'invoice';

  const input = {
    order_ids: req.query.order_ids,
    customer_ids:
      req.query.customer_ids ||
      req.query.customer_id,

    range: req.query.range,
    date: req.query.date,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };

  const orderIds =
    await reportService.resolveOrderIds(input);

  if (!orderIds.length) {
    return res.status(404).json({
      message: 'No orders found for download',
    });
  }

  const result =
    await reportService.buildDownload(
      orderIds,
      type
    );

  const pdfBuffer =
    Buffer.isBuffer(result.buffer)
      ? result.buffer
      : Buffer.from(result.buffer);

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${result.filename}"`
  );

  res.setHeader(
    'Content-Length',
    pdfBuffer.length
  );

  return res.end(pdfBuffer);
}
// async function download(req, res) {
//   const type = req.query.type === 'packing-slip' ? 'packing-slip' : 'invoice';
//   const input = {
//     order_ids: req.query.order_ids,
//     customer_ids: req.query.customer_ids || req.query.customer_id,
//     range: req.query.range,
//     date: req.query.date,
//     date_from: req.query.date_from,
//     date_to: req.query.date_to,
//   };
//   const orderIds = await reportService.resolveOrderIds(input);
//   const result = await reportService.buildDownload(orderIds, type);

//   if (result.multiple) {
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="${type}-documents-${Date.now()}.zip"`
//     );
//     const archive = archiver('zip', { zlib: { level: 9 } });
//     archive.on('error', (err) => {
//       throw err;
//     });
//     archive.pipe(res);
//     for (const item of result.multiple) {
//       const pdfBuffer = Buffer.isBuffer(item.pdf) ? item.pdf : Buffer.from(item.pdf);
//       archive.append(pdfBuffer, { name: item.filename });
//     }
//     await archive.finalize();
//     return;
//   }

//   const pdfBuffer = Buffer.isBuffer(result.buffer)
//     ? result.buffer
//     : Buffer.from(result.buffer);

//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
//   res.setHeader('Content-Length', pdfBuffer.length);
//   res.end(pdfBuffer);
// }

async function emailCustomer(req, res) {
  res.json(await reportService.emailCustomerInvoices(req));
}

async function getSchedule(req, res) {
  res.json(await reportScheduleService.getScheduleStatus());
}

async function saveSchedule(req, res) {
  await reportScheduleService.saveSchedule(req.body || {});
  await rescheduleDailyReportJob();
  res.json(await reportScheduleService.getScheduleStatus());
}

async function emailDaily(req, res) {
  const schedule = await reportScheduleService.getSchedule();
  const result = await reportService.sendDailyAdminReports(schedule);
  res.json(result);
}

module.exports = {
  list,
  summary,
  download,
  emailCustomer,
  emailDaily,
  getSchedule,
  saveSchedule,
};



// const reportService = require('../services/reportService');
// const reportScheduleService = require('../services/reportScheduleService');
// const { rescheduleDailyReportJob } = require('../jobs/dailyReportEmail');
// const archiver = require('archiver');

// async function list(req, res) {
//   res.json(await reportService.list(req));
// }

// async function summary(req, res) {
//   res.json(await reportService.summary(req));
// }

// async function download(req, res) {
//   const type = req.query.type === 'packing-slip' ? 'packing-slip' : 'invoice';
//   const input = {
//     order_ids: req.query.order_ids,
//     customer_ids: req.query.customer_ids || req.query.customer_id,
//     range: req.query.range,
//     date: req.query.date,
//     date_from: req.query.date_from,
//     date_to: req.query.date_to,
//   };
//   const orderIds = await reportService.resolveOrderIds(input);
//   const result = await reportService.buildDownload(orderIds, type);

//   if (result.multiple) {
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="${type}-documents-${Date.now()}.zip"`
//     );
//     const archive = archiver('zip', { zlib: { level: 9 } });
//     archive.on('error', (err) => {
//       throw err;
//     });
//     archive.pipe(res);
//     for (const item of result.multiple) {
//       const pdfBuffer = Buffer.isBuffer(item.pdf) ? item.pdf : Buffer.from(item.pdf);
//       archive.append(pdfBuffer, { name: item.filename });
//     }
//     await archive.finalize();
//     return;
//   }

//   const pdfBuffer = Buffer.isBuffer(result.buffer)
//     ? result.buffer
//     : Buffer.from(result.buffer);

//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
//   res.setHeader('Content-Length', pdfBuffer.length);
//   res.end(pdfBuffer);
// }

// async function emailCustomer(req, res) {
//   res.json(await reportService.emailCustomerInvoices(req));
// }

// async function getSchedule(req, res) {
//   res.json(await reportScheduleService.getScheduleStatus());
// }

// async function saveSchedule(req, res) {
//   await reportScheduleService.saveSchedule(req.body || {});
//   await rescheduleDailyReportJob();
//   res.json(await reportScheduleService.getScheduleStatus());
// }

// async function emailDaily(req, res) {
//   const schedule = await reportScheduleService.getSchedule();
//   const result = await reportService.sendDailyAdminReports(schedule);
//   res.json(result);
// }

// module.exports = {
//   list,
//   summary,
//   download,
//   emailCustomer,
//   emailDaily,
//   getSchedule,
//   saveSchedule,
// };
