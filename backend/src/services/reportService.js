const pool = require('../config/db');
const P = require('../config/prefix');
const { parseList, listResponse } = require('../utils/listParams');
const { resolveDateRange, formatKolkataDate } = require('../utils/dateRange');
const { unserializePhp } = require('../utils/php');
const { httpError } = require('../utils/httpError');
const orderService = require('./orderService');
const { htmlToPdfBuffer } = require('./pdfService');
const { sendMail } = require('./emailService');
const env = require('../config/env');

const SORT = {
  id: 'o.id',
  date: 'o.date_created_gmt',
  total: 'o.total_amount',
  invoice: 'invoice_number',
};

const SHOP = {
  name: 'BrassLeaf',
  address:
    '6-3-666/B, Pillar No. #1118 Erramanzil Road, Panjagutta, Hyderabad – 500082, Opp Nims Hospital',
  gstin: '36AACFB1506E1Z5',
  footer: 'Note: Any exchanges should be done at the BrassLeaf, Punjagutta store only',
};

let shopSettingsLoaded = false;

async function loadShopSettings() {
  if (shopSettingsLoaded) return SHOP;
  try {
    const [[row]] = await pool.query(
      `SELECT option_value FROM ${P}options WHERE option_name = 'wpo_wcpdf_settings_general' LIMIT 1`
    );
    const settings = unserializePhp(row?.option_value) || {};
    if (settings.shop_name?.default) SHOP.name = settings.shop_name.default;
    if (settings.shop_address_additional?.default) SHOP.address = settings.shop_address_additional.default;
    const gst = settings.shop_address_additional?.default || '';
    const gstMatch = gst.match(/GSTIN:\s*([A-Z0-9]+)/i);
    if (gstMatch) SHOP.gstin = gstMatch[1];
    const footer = settings.footer?.default;
    if (footer) SHOP.footer = footer;
  } catch {
    /* use defaults */
  }
  shopSettingsLoaded = true;
  return SHOP;
}

function parseIdList(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw
    .map((v) => parseInt(String(v).trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLongDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function parseHsn(name, sku) {
  const fromName = String(name || '').match(/HSN\s*:\s*(\d+)/i);
  if (fromName) return fromName[1];
  return null;
}

function addressLines(addr) {
  if (!addr) return [];
  return [
    [addr.first_name, addr.last_name].filter(Boolean).join(' '),
    addr.company,
    addr.address_1,
    addr.address_2,
    [addr.city, addr.postcode].filter(Boolean).join(' '),
    addr.state,
    addr.email,
    addr.phone,
  ].filter(Boolean);
}

async function enrichOrder(order) {
  const [taxRows] = await pool.query(
    `SELECT oi.order_item_id, oi.order_item_name,
            MAX(CASE WHEN oim.meta_key = 'tax_amount' THEN oim.meta_value END) AS tax_amount,
            MAX(CASE WHEN oim.meta_key = 'label' THEN oim.meta_value END) AS label,
            MAX(CASE WHEN oim.meta_key = 'rate_percent' THEN oim.meta_value END) AS rate_percent
     FROM ${P}woocommerce_order_items oi
     LEFT JOIN ${P}woocommerce_order_itemmeta oim ON oim.order_item_id = oi.order_item_id
     WHERE oi.order_id = ? AND oi.order_item_type = 'tax'
     GROUP BY oi.order_item_id, oi.order_item_name`,
    [order.id]
  );

  const [invoiceMeta] = await pool.query(
    `SELECT meta_key, meta_value FROM ${P}wc_orders_meta
     WHERE order_id = ? AND meta_key IN (
       '_wcpdf_invoice_number', '_wcpdf_invoice_date_formatted', '_wcpdf_invoice_date'
     )`,
    [order.id]
  );
  const metaMap = {};
  for (const m of invoiceMeta) metaMap[m.meta_key] = m.meta_value;

  const lineItems = (order.line_items || []).map((item) => {
    const sku = item.sku || null;
    return {
      ...item,
      sku,
      hsn: parseHsn(item.order_item_name, sku),
    };
  });

  const shippingCost = (order.shipping_items || []).reduce(
    (sum, s) => sum + (Number(s.cost) || 0),
    0
  );
  const shippingLabel = order.shipping_items?.[0]?.order_item_name || 'Flat rate';
  const subtotal = lineItems.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0);
  const taxes = taxRows.map((t) => ({
    label: t.label || t.order_item_name,
    amount: Number(t.tax_amount) || 0,
    rate: t.rate_percent,
  }));

  return {
    ...order,
    line_items: lineItems,
    taxes,
    subtotal,
    shipping_cost: shippingCost,
    shipping_label: shippingLabel,
    invoice_number: metaMap._wcpdf_invoice_number || order.invoice_number || order.id,
    invoice_date: metaMap._wcpdf_invoice_date_formatted || order.invoice_date || order.date_created_gmt,
    packing_slip_number: order.id,
  };
}

async function buildDocumentHtml(order, type) {
  await loadShopSettings();
  const enriched = await enrichOrder(order);
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'INVOICE' : 'PACKING SLIP';
  const billing = enriched.billing;
  const shipping = enriched.shipping || billing;
  const addr = isInvoice ? billing : shipping;

  const productRows = enriched.line_items
    .map((item) => {
      const qty = Number(item.qty) || 0;
      const total = Number(item.line_total) || 0;
      const unit = qty > 0 ? total / qty : total;
      const size = item.size ? `<br/>size: ${esc(item.size)}` : '';
      const skuLine =
        item.sku || item.hsn
          ? `<br/>${item.sku ? `SKU: ${esc(item.sku)}` : ''}${item.sku && item.hsn ? ' | ' : ''}${item.hsn ? `HSN : ${esc(item.hsn)}` : ''}`
          : '';
      if (isInvoice) {
        return `<tr>
          <td>${esc(item.order_item_name)}${size}${skuLine}</td>
          <td style="text-align:center">${qty}</td>
          <td style="text-align:right">${formatMoney(unit)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${esc(item.order_item_name)}${size}${skuLine}</td>
        <td style="text-align:center">${qty}</td>
      </tr>`;
    })
    .join('');

  const taxSummary = enriched.taxes
    .filter((t) => t.amount > 0)
    .map((t) => `${formatMoney(t.amount)} ${t.rate ? `${t.rate}% ` : ''}${esc(t.label)}`)
    .join(', ');

  const docBlock = isInvoice
    ? `<p><strong>Invoice Number:</strong> ${esc(enriched.invoice_number)}</p>
       <p><strong>Invoice Date:</strong> ${esc(formatLongDate(enriched.invoice_date))}</p>
       <p><strong>Order Number:</strong> ${esc(enriched.id)}</p>
       <p><strong>Order Date:</strong> ${esc(formatLongDate(enriched.date_created_gmt))}</p>
       <p><strong>Payment Method:</strong> ${esc(enriched.payment_method_title || enriched.payment_method || '—')}</p>`
    : `<p><strong>Order Number:</strong> ${esc(enriched.id)}</p>
       <p><strong>Order Date:</strong> ${esc(formatLongDate(enriched.date_created_gmt))}</p>
       <p><strong>Shipping Method:</strong> ${esc(enriched.shipping_label)}</p>`;

  const totals = isInvoice
    ? `<div class="totals">
         <p><strong>Subtotal</strong> ${formatMoney(enriched.subtotal)}</p>
         <p><strong>Shipping</strong> ${formatMoney(enriched.shipping_cost)} via ${esc(enriched.shipping_label)}</p>
         <p><strong>Total</strong> ${formatMoney(enriched.total_amount)}${taxSummary ? ` (includes ${taxSummary})` : ''}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 13px; line-height: 1.45; }
  .header { margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .shop { color: #333; white-space: pre-line; }
  .title { font-size: 20px; font-weight: 700; margin: 18px 0 12px; }
  .grid { display: flex; gap: 24px; }
  .address { flex: 1; }
  .meta p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; vertical-align: top; }
  th { text-align: left; font-weight: 700; }
  .totals { margin-top: 16px; text-align: right; }
  .footer { margin-top: 28px; font-size: 12px; color: #444; }
</style></head><body>
  <div class="header">
    <div class="brand">${esc(SHOP.name)}</div>
    <div class="shop">${esc(SHOP.address)}<br/>GSTIN: ${esc(SHOP.gstin)}</div>
  </div>
  <div class="title">${title}</div>
  <div class="grid">
    <div class="address">
      ${addressLines(addr).map((l) => `<div>${esc(l)}</div>`).join('')}
    </div>
    <div class="meta">${docBlock}</div>
  </div>
  <table>
    <thead><tr>
      <th>Product</th>
      <th style="text-align:center">Quantity</th>
      ${isInvoice ? '<th style="text-align:right">Price</th>' : ''}
    </tr></thead>
    <tbody>${productRows}</tbody>
  </table>
  ${totals}
  <div class="footer">${esc(SHOP.footer)}</div>
</body></html>`;
}

function buildListQuery(req) {
  const { search } = parseList(req, SORT, 'date');
  const customerIds = parseIdList(req.query.customer_ids || req.query.customer_id);
  const orderIds = parseIdList(req.query.order_ids);
  const range = resolveDateRange(req.query);
  const params = [];
  let where = `o.type = 'shop_order'`;

  if (customerIds.length) {
    where += ` AND o.customer_id IN (${customerIds.map(() => '?').join(',')})`;
    params.push(...customerIds);
  }
  if (orderIds.length) {
    where += ` AND o.id IN (${orderIds.map(() => '?').join(',')})`;
    params.push(...orderIds);
  }
  if (range.start && range.end) {
    where += ` AND o.date_created_gmt >= ? AND o.date_created_gmt <= ?`;
    params.push(range.start, range.end);
  }
  if (search) {
    where += ` AND (
      CAST(o.id AS CHAR) LIKE ? OR o.billing_email LIKE ?
      OR a.first_name LIKE ? OR a.last_name LIKE ?
      OR CAST(COALESCE(inv.calculated_number, invm.meta_value) AS CHAR) LIKE ?
      OR CAST(o.id AS CHAR) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q);
  }

  const from = `
    FROM ${P}wc_orders o
    LEFT JOIN ${P}wc_order_addresses a ON a.order_id = o.id AND a.address_type = 'billing'
    LEFT JOIN ${P}wcpdf_invoice_number inv ON inv.order_id = o.id
    LEFT JOIN ${P}wc_orders_meta invm ON invm.order_id = o.id AND invm.meta_key = '_wcpdf_invoice_number'
    LEFT JOIN ${P}wc_orders_meta invd ON invd.order_id = o.id AND invd.meta_key = '_wcpdf_invoice_date_formatted'
    LEFT JOIN ${P}wc_customer_lookup cl ON cl.user_id = o.customer_id`;

  return { where, from, params, range, search };
}

async function list(req) {
  const { page, limit, offset, sortCol, dir } = parseList(req, SORT, 'date');
  const { where, from, params, range } = buildListQuery(req);

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT o.id) AS total ${from} WHERE ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       o.id AS order_id, o.status, o.total_amount, o.currency, o.date_created_gmt,
       o.billing_email, o.customer_id, o.payment_method, o.payment_method_title,
       a.first_name, a.last_name,
       COALESCE(inv.calculated_number, CAST(invm.meta_value AS UNSIGNED)) AS invoice_number,
       COALESCE(inv.date, invd.meta_value) AS invoice_date,
       o.id AS packing_slip_number,
       o.date_created_gmt AS packing_slip_date
     ${from}
     WHERE ${where}
     ORDER BY ${sortCol} ${dir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const data = rows.map((r) => ({
    id: r.order_id,
    order_id: r.order_id,
    status: r.status,
    total_amount: r.total_amount,
    currency: r.currency,
    date_created_gmt: r.date_created_gmt,
    billing_email: r.billing_email,
    customer_id: r.customer_id,
    customer_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
    payment_method: r.payment_method,
    payment_method_title: r.payment_method_title,
    invoice_number: r.invoice_number,
    invoice_date: r.invoice_date,
    packing_slip_number: r.packing_slip_number,
    packing_slip_date: r.packing_slip_date,
    has_invoice: r.invoice_number != null && r.invoice_number !== '',
    has_packing_slip: true,
  }));

  return { ...listResponse(data, total, page, limit), range };
}

async function summary(req) {
  const { where, from, params, range } = buildListQuery(req);
  const [[row]] = await pool.query(
    `SELECT
       COUNT(DISTINCT o.id) AS order_count,
       ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS total_sales,
       ROUND(COALESCE(SUM(CASE WHEN o.status NOT IN ('wc-refunded','wc-cancelled','wc-failed') THEN o.total_amount ELSE 0 END), 0), 2) AS total_collected,
       ROUND(COALESCE(SUM(CASE WHEN o.status = 'wc-refunded' THEN o.total_amount ELSE 0 END), 0), 2) AS refunded_amount,
       ROUND(COALESCE(SUM(o.total_amount - COALESCE(o.tax_amount, 0)), 0), 2) AS subtotal,
       ROUND(COALESCE(SUM(CASE WHEN o.status NOT IN ('wc-refunded','wc-cancelled','wc-failed') THEN o.total_amount ELSE 0 END), 0), 2) AS net_sales
     ${from}
     WHERE ${where}`,
    params
  );
  return { ...row, range };
}

async function resolveOrderIds(input = {}) {
  const orderIds = parseIdList(input.order_ids);
  const customerIds = parseIdList(input.customer_ids);
  if (orderIds.length) return [...new Set(orderIds)];

  const params = [];
  let where = `o.type = 'shop_order'`;
  const range = resolveDateRange(input);

  if (customerIds.length) {
    where += ` AND o.customer_id IN (${customerIds.map(() => '?').join(',')})`;
    params.push(...customerIds);
  }
  if (range.start && range.end) {
    where += ` AND o.date_created_gmt >= ? AND o.date_created_gmt <= ?`;
    params.push(range.start, range.end);
  }

  const from = `
    FROM ${P}wc_orders o
    LEFT JOIN ${P}wc_order_addresses a ON a.order_id = o.id AND a.address_type = 'billing'
    LEFT JOIN ${P}wcpdf_invoice_number inv ON inv.order_id = o.id
    LEFT JOIN ${P}wc_orders_meta invm ON invm.order_id = o.id AND invm.meta_key = '_wcpdf_invoice_number'
    LEFT JOIN ${P}wc_orders_meta invd ON invd.order_id = o.id AND invd.meta_key = '_wcpdf_invoice_date_formatted'
    LEFT JOIN ${P}wc_customer_lookup cl ON cl.user_id = o.customer_id`;

  const [rows] = await pool.query(
    `SELECT DISTINCT o.id ${from} WHERE ${where} ORDER BY o.date_created_gmt DESC`,
    params
  );
  return rows.map((r) => r.id);
}

async function buildPdfForOrder(orderId, type) {
  const order = await orderService.getById(orderId);
  const html = await buildDocumentHtml(order, type);
  const pdf = await htmlToPdfBuffer(html);
  const enriched = await enrichOrder(order);
  const num = type === 'invoice' ? enriched.invoice_number : enriched.packing_slip_number;
  const filename = `${type === 'invoice' ? 'invoice' : 'packing-slip'}-${num}.pdf`;
  return { pdf, filename, order: enriched };
}

async function buildDownload(orderIds, type) {
  if (!orderIds.length) throw httpError(400, 'No orders found for download');
  if (orderIds.length === 1) {
    const { pdf, filename } = await buildPdfForOrder(orderIds[0], type);
    return { buffer: pdf, filename, contentType: 'application/pdf' };
  }
  const parts = [];
  for (const orderId of orderIds) {
    const { pdf, filename } = await buildPdfForOrder(orderId, type);
    parts.push({ pdf, filename });
  }
  return { multiple: parts, contentType: 'application/pdf' };
}

async function download(req) {
  const type = req.query.type === 'packing-slip' ? 'packing-slip' : 'invoice';
  const input = {
    order_ids: req.query.order_ids,
    customer_ids: req.query.customer_ids || req.query.customer_id,
    range: req.query.range,
    date: req.query.date,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
  };
  const orderIds = await resolveOrderIds(input);
  return buildDownload(orderIds, type);
}

async function emailCustomerInvoices(req) {
  const input = {
    order_ids: req.body?.order_ids,
    customer_ids: req.body?.customer_ids,
    range: req.body?.range,
    date: req.body?.date,
    date_from: req.body?.date_from,
    date_to: req.body?.date_to,
  };
  const orderIds = await resolveOrderIds(input);
  if (!orderIds.length) throw httpError(400, 'No orders found to email');

  let sent = 0;
  for (const orderId of orderIds) {
    const { pdf, filename, order } = await buildPdfForOrder(orderId, 'invoice');
    const to = order.billing?.email || order.billing_email;
    if (!to) continue;
    await sendMail({
      to,
      subject: `Your BrassLeaf Invoice #${order.invoice_number}`,
      text: `Dear customer,\n\nPlease find attached your invoice for order #${order.id}.\n\nThank you,\nBrassLeaf`,
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });
    sent += 1;
  }
  if (!sent) throw httpError(400, 'No customer emails found for selected orders');
  return { sent, orderIds };
}

async function emailDailyAdmin(type, preset = 'yesterday') {
  const orderIds = await resolveOrderIds({ range: preset });
  if (!orderIds.length) return { sent: false, reason: 'no_orders', count: 0 };

  const attachments = [];
  for (const orderId of orderIds) {
    const { pdf, filename } = await buildPdfForOrder(orderId, type);
    attachments.push({ filename, content: pdf, contentType: 'application/pdf' });
  }

  const adminEmail = env.adminEmail;
  if (!adminEmail) throw httpError(500, 'ADMIN_EMAIL is not configured in backend .env');

  const range = resolveDateRange({ range: preset });
  const dayLabel = range.label || preset;
  const isInvoice = type === 'invoice';
  await sendMail({
    to: adminEmail,
    subject: `BrassLeaf Daily ${isInvoice ? 'Invoices' : 'Packing Slips'} — ${dayLabel}`,
    text: `Attached are ${attachments.length} ${isInvoice ? 'invoice' : 'packing slip'} PDF(s) for ${dayLabel}.`,
    attachments,
  });

  return { sent: true, count: attachments.length, type, dayLabel };
}

async function sendDailyAdminReports() {
  const results = {};
  try {
    results.invoices = await emailDailyAdmin('invoice', 'today');
  } catch (e) {
    results.invoices = { sent: false, error: e.message };
  }
  try {
    results.packingSlips = await emailDailyAdmin('packing-slip', 'today');
  } catch (e) {
    results.packingSlips = { sent: false, error: e.message };
  }
  return results;
}

module.exports = {
  list,
  summary,
  download,
  buildDownload,
  buildDocumentHtml,
  buildPdfForOrder,
  emailCustomerInvoices,
  emailDailyAdmin,
  sendDailyAdminReports,
  resolveOrderIds,
};
