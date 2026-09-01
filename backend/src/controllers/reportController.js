const reportService = require('../services/reportService');
const archiver = require('archiver');

async function list(req, res) {
  res.json(await reportService.list(req));
}

async function summary(req, res) {
  res.json(await reportService.summary(req));
}

async function download(req, res) {
  const type = req.query.type === 'packing-slip' ? 'packing-slip' : 'invoice';
  const input = {
    order_ids: req.query.order_ids,
    customer_ids: req.query.customer_ids || req.query.customer_id,
    range: req.query.range,
    date: req.query.date,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };
  const orderIds = await reportService.resolveOrderIds(input);
  const result = await reportService.buildDownload(orderIds, type);

  if (result.multiple) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${type}-documents-${Date.now()}.zip"`
    );
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);
    for (const item of result.multiple) {
      archive.append(item.pdf, { name: item.filename });
    }
    await archive.finalize();
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
}

async function emailCustomer(req, res) {
  res.json(await reportService.emailCustomerInvoices(req));
}

async function emailDaily(req, res) {
  const preset = req.body?.range || 'yesterday';
  const invoices = await reportService.emailDailyAdmin('invoice', preset);
  const packingSlips = await reportService.emailDailyAdmin('packing-slip', preset);
  res.json({ invoices, packingSlips });
}

module.exports = { list, summary, download, emailCustomer, emailDaily };
