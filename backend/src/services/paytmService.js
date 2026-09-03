// const crypto = require('crypto');
const PaytmChecksum = require('paytmchecksum');
const pool = require('../config/db');
const P = require('../config/prefix');
const env = require('../config/env');
const { unserializePhp } = require('../utils/php');
const { httpError } = require('../utils/httpError');
const { nowLocal } = require('../utils/datetime');
const { withTransaction } = require('../utils/transaction');
const orderService = require('./orderService');
const orderEmailService = require('./orderEmailService');

async function getOption(key) {
  const [[row]] = await pool.query(
    `SELECT option_value FROM ${P}options WHERE option_name = ? LIMIT 1`,
    [key]
  );
  return row ? row.option_value : null;
}

async function getPaytmCredentials() {
  const raw = await getOption('woocommerce_paytm_settings');
  const paytm = unserializePhp(raw) || {};

  if (paytm.enabled === 'no') {
    throw httpError(503, 'Paytm payment gateway is disabled.');
  }

  const merchantId = String(paytm.merchant_id || '').trim();
  const merchantKey = String(paytm.merchant_key || '').trim();

  // if (!merchantId || !merchantKey) {
  //   throw httpError(
  //     503,
  //     'Paytm is not configured. Add Production MID and merchant key in admin Settings.'
  //   );
  // }
  if (!merchantId || !merchantKey) {
    throw httpError(
      503,
      'Paytm is not configured. Add Merchant ID and Merchant Key in Admin Settings.'
    );
  }
  const isProduction = paytm.environment === '0';
  let websiteName = String(paytm.website || '').trim();

  if (!websiteName || websiteName === 'OTHER') {
    websiteName = String(paytm.otherWebsiteName || '').trim() || (isProduction ? 'DEFAULT' : 'WEBSTAGING');
  }

  return {
    merchantId,
    merchantKey,
    websiteName,
    isProduction,
    host: isProduction ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in',
    description:
      paytm.description ||
      'The best payment gateway provider in India for e-payment through credit card, debit card & netbanking.',
  };
}

// function generateSalt(length = 4) {
//   return crypto
//     .randomBytes(Math.ceil(length / 2))
//     .toString('hex')
//     .slice(0, length);
// }

// function generateSignature(bodyString, merchantKey) {
//   const salt = generateSalt(4);
//   const hash = crypto
//     .createHash('sha256')
//     .update(`${bodyString}|${salt}`)
//     .digest('hex');
//   return `${hash}${salt}`;
// }

// function verifySignature(bodyString, merchantKey, signature) {
//   if (!signature || signature.length <= 4) return false;

//   const salt = signature.slice(-4);
//   const expectedHash = signature.slice(0, -4);
//   const hash = crypto
//     .createHash('sha256')
//     .update(`${bodyString}|${salt}`)
//     .digest('hex');

//   return hash === expectedHash;
// }

function buildPaytmOrderId(orderId) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${orderId}_${stamp}`;
}

function getCallbackUrl() {
  const base =
    env.apiPublicUrl ||
    env.customerFrontendUrl ||
    env.frontendUrl ||
    'http://localhost:4000';
  return `${String(base).replace(/\/$/, '')}/api/customer/payments/paytm/callback`;
}

async function ensurePaytmRow(conn, orderId, paytmOrderId) {
  const [existing] = await conn.query(
    `SELECT id FROM ${P}paytm_order_data WHERE order_id = ? AND status = '0' ORDER BY id DESC LIMIT 1`,
    [orderId]
  );

  if (existing.length) {
    await conn.query(
      `UPDATE ${P}paytm_order_data SET paytm_order_id = ?, date_modified = ? WHERE id = ?`,
      [paytmOrderId, nowLocal(), existing[0].id]
    );
    return existing[0].id;
  }

  const [result] = await conn.query(
    `INSERT INTO ${P}paytm_order_data
      (order_id, paytm_order_id, transaction_id, status, paytm_response, date_added, date_modified)
     VALUES (?, ?, '', '0', '', ?, ?)`,
    [orderId, paytmOrderId, nowLocal(), nowLocal()]
  );

  return result.insertId;
}

async function initiatePayment(orderId, customerId) {
  const [[order]] = await pool.query(
    `SELECT id, customer_id, total_amount, status, billing_email
     FROM ${P}wc_orders
     WHERE id = ? AND type = 'shop_order'`,
    [orderId]
  );

  if (!order) throw httpError(404, 'Order not found');
  if (Number(order.customer_id) !== Number(customerId)) {
    throw httpError(403, 'You do not have access to this order.');
  }

  const status = String(order.status || '').replace(/^wc-/, '');
  if (!['pending', 'failed'].includes(status)) {
    throw httpError(400, 'This order is not awaiting payment.');
  }

  const creds = await getPaytmCredentials();
  const paytmOrderId = buildPaytmOrderId(orderId);
  const amount = Number(order.total_amount).toFixed(2);
  const callbackUrl = getCallbackUrl();

  await withTransaction(pool, async (conn) => {
    await ensurePaytmRow(conn, orderId, paytmOrderId);
  });

  const body = {
    requestType: 'Payment',
    mid: creds.merchantId,
    websiteName: creds.websiteName,
    orderId: paytmOrderId,
    callbackUrl,
    txnAmount: {
      value: amount,
      currency: 'INR',
    },
    userInfo: {
      custId: `customer_${customerId}`,
      email: order.billing_email || '',
    },
  };

  // const bodyString = JSON.stringify(body);
  // const signature = generateSignature(bodyString, creds.merchantKey);
  // const requestTimestamp = Date.now().toString();
//   const bodyString = JSON.stringify(body);

// const signature =
//   await PaytmChecksum.generateSignature(
//     bodyString,
//     creds.merchantKey
//   );

// const requestTimestamp =
//   Date.now().toString();

//   const url = `${creds.host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(creds.merchantId)}&orderId=${encodeURIComponent(paytmOrderId)}`;

//   let data;

//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         body,
//         head: {
//           signature,
//           version: 'v1',
//           requestTimestamp,
//           channelId: 'WEB',
//         },
//       }),
//     });

//     const raw = await response.text();

//     try {
//       data = raw ? JSON.parse(raw) : {};
//     } catch {
//       console.error('[Paytm initiate] Non-JSON response:', raw);
//       throw httpError(502, 'Invalid response from Paytm gateway.');
//     }

//     if (!response.ok) {
//       console.error('[Paytm initiate] HTTP error:', response.status, data);
//     }
//   } catch (error) {
//     if (error.status) {
//       throw error;
//     }

//     console.error('[Paytm initiate] Network error:', error);
//     throw httpError(
//       502,
//       'Unable to reach Paytm gateway. Check MID, merchant key, and environment in admin Settings.'
//     );
//   }
const bodyString =
  JSON.stringify(body);

const signature =
  await PaytmChecksum.generateSignature(
    bodyString,
    creds.merchantKey
  );

const url =
  `${creds.host}/theia/api/v1/initiateTransaction` +
  `?mid=${encodeURIComponent(creds.merchantId)}` +
  `&orderId=${encodeURIComponent(paytmOrderId)}`;

let data;

try {
  console.log(
    '[Paytm initiate request]',
    {
      url,
      mid: creds.merchantId,
      environment:
        creds.isProduction
          ? 'production'
          : 'staging',
      websiteName:
        creds.websiteName,
      orderId:
        paytmOrderId,
      amount,
      callbackUrl,
    }
  );

  const response =
    await fetch(url, {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
        Accept:
          'application/json',
      },

      body: JSON.stringify({
        body,

        head: {
          signature,
        },
      }),
    });

  const raw =
    await response.text();

  console.log(
    '[Paytm initiate response]',
    {
      status:
        response.status,

      statusText:
        response.statusText,

      contentType:
        response.headers.get(
          'content-type'
        ),

      raw:
        raw.slice(0, 2000),
    }
  );

  if (!response.ok) {
    throw httpError(
      response.status || 502,
      `Paytm gateway returned HTTP ${response.status}.`
    );
  }

  try {
    data =
      raw
        ? JSON.parse(raw)
        : {};
  } catch {
    throw httpError(
      502,
      'Paytm gateway returned invalid response.'
    );
  }
} catch (error) {
  if (error.status) {
    throw error;
  }

  console.error(
    '[Paytm initiate] Network error:',
    error
  );

  throw httpError(
    502,
    'Unable to connect to Paytm gateway.'
  );
}

  const resultBody = data?.body || {};
  const resultInfo = resultBody?.resultInfo || data?.resultInfo || {};

  if (resultInfo.resultStatus !== 'S') {
    console.error('[Paytm initiate]', {
      orderId,
      paytmOrderId,
      resultInfo,
      response: data,
    });

    throw httpError(
      502,
      resultInfo.resultMsg || 'Unable to initiate Paytm payment.'
    );
  }

  const txnToken = resultBody.txnToken;

  if (!txnToken) {
    throw httpError(502, 'Paytm did not return a transaction token.');
  }

  return {
    mid: creds.merchantId,
    orderId: paytmOrderId,
    txnToken,
    amount: Number(amount),
    amountFormatted: amount,
    callbackUrl,
    environment: creds.isProduction ? 'production' : 'staging',
    host: creds.host,
    websiteName: creds.websiteName,
  };
}

async function verifyTransaction(paytmOrderId) {
  const creds =
    await getPaytmCredentials();

  const body = {
    mid: creds.merchantId,
    orderId: paytmOrderId,
  };

  const bodyString =
    JSON.stringify(body);

  const signature =
    await PaytmChecksum.generateSignature(
      bodyString,
      creds.merchantKey
    );

  const url =
    `${creds.host}/v3/order/status`;

  const response =
    await fetch(url, {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        body,

        head: {
          signature,
        },
      }),
    });

  const raw =
    await response.text();

  let data = {};

  try {
    data =
      raw
        ? JSON.parse(raw)
        : {};
  } catch {
    throw httpError(
      502,
      'Invalid response from Paytm status API.'
    );
  }

  if (!response.ok) {
    console.error(
      '[Paytm status]',
      response.status,
      data
    );

    throw httpError(
      502,
      'Unable to verify Paytm payment.'
    );
  }

  return data;
}
// async function verifyTransaction(paytmOrderId) {
//   const creds = await getPaytmCredentials();

//   const body = {
//     mid: creds.merchantId,
//     orderId: paytmOrderId,
//   };

//   const bodyString = JSON.stringify(body);
//   const signature = generateSignature(bodyString, creds.merchantKey);

//   const url = `${creds.host}/v3/order/status`;

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       body,
//       head: {
//         signature,
//         version: 'v1',
//         requestTimestamp: Date.now().toString(),
//       },
//     }),
//   });

//   return response.json();
// }

async function applyPaymentResult(orderId, gatewayPayload = {}) {
  const status = String(gatewayPayload.STATUS || '').toUpperCase();
  const txnId = gatewayPayload.TXNID || '';
  const paytmOrderId = gatewayPayload.ORDERID || '';
  const responseJson = JSON.stringify(gatewayPayload);

  const success = status === 'TXN_SUCCESS';

  return withTransaction(pool, async (conn) => {
    if (paytmOrderId) {
      await conn.query(
        `UPDATE ${P}paytm_order_data
         SET transaction_id = ?, status = ?, paytm_response = ?, date_modified = ?
         WHERE order_id = ? AND paytm_order_id = ?`,
        [txnId, success ? '1' : '0', responseJson, nowLocal(), orderId, paytmOrderId]
      );
    }

    const nextStatus = success ? 'wc-processing' : 'wc-pending';
    const gmt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await conn.query(
      `UPDATE ${P}wc_orders SET status = ?, transaction_id = ?, date_updated_gmt = ? WHERE id = ?`,
      [nextStatus, success ? txnId : '', gmt, orderId]
    );

    await conn.query(
      `UPDATE ${P}posts SET post_status = ?, post_modified_gmt = ? WHERE ID = ? AND post_type = 'shop_order_placehold'`,
      [nextStatus, gmt, orderId]
    );

    await conn.query(
      `UPDATE ${P}wc_order_stats SET status = ? WHERE order_id = ?`,
      [nextStatus, orderId]
    );

    if (success) {
      await conn.query(
        `UPDATE ${P}wc_order_operational_data
         SET date_paid_gmt = COALESCE(date_paid_gmt, ?), recorded_sales = 1
         WHERE order_id = ?`,
        [gmt, orderId]
      );

      await conn.query(
        `UPDATE ${P}wc_order_stats SET date_paid = ?, date_paid_gmt = ? WHERE order_id = ?`,
        [gmt, gmt, orderId]
      );
    }

    return { success, status: nextStatus, transactionId: txnId };
  });
}

// async function handleCallback(payload = {}) {
//   const creds = await getPaytmCredentials();

//   let gateway = payload;

//   if (payload?.body && typeof payload.body === 'object') {
//     gateway = payload.body;
//   }

//   const checksum =
//     payload?.CHECKSUMHASH ||
//     payload?.checksum ||
//     payload?.head?.signature ||
//     gateway?.CHECKSUMHASH;

//   if (checksum && !payload?.head?.signature) {
//     const params = { ...gateway };
//     delete params.CHECKSUMHASH;
//     delete params.checksum;

//     const sortedKeys = Object.keys(params).sort();
//     const values = sortedKeys.map((key) => String(params[key] ?? '')).join('|');
//     const valid = verifySignature(values, creds.merchantKey, checksum);

//     if (!valid) {
//       const bodyString = JSON.stringify(gateway);
//       const altValid = verifySignature(bodyString, creds.merchantKey, checksum);
//       if (!altValid) {
//         console.warn('[Paytm] Signature verification failed, continuing with status check.');
//       }
//     }
//   } else if (payload?.head?.signature) {
//     const bodyString =
//       typeof payload.body === 'string'
//         ? payload.body
//         : JSON.stringify(payload.body || {});

//     const valid = verifySignature(bodyString, creds.merchantKey, payload.head.signature);
//     if (!valid) {
//       throw httpError(400, 'Invalid Paytm signature.');
//     }
//   }

//   const paytmOrderId = gateway.ORDERID || gateway.orderId || '';
//   const orderIdMatch = paytmOrderId.match(/^(\d+)_/);
//   const orderId = orderIdMatch ? Number(orderIdMatch[1]) : null;

//   if (!orderId) {
//     throw httpError(400, 'Invalid Paytm order reference.');
//   }

//   let result = await applyPaymentResult(orderId, gateway);

//   if (!result.success && paytmOrderId) {
//     try {
//       const verifyData = await verifyTransaction(paytmOrderId);
//       const verifyBody = verifyData?.body || {};
//       if (verifyBody.resultInfo?.resultStatus === 'TXN_SUCCESS') {
//         result = await applyPaymentResult(orderId, {
//           ...verifyBody,
//           STATUS: 'TXN_SUCCESS',
//           TXNID: verifyBody.txnId || verifyBody.TXNID || '',
//           ORDERID: paytmOrderId,
//         });
//       }
//     } catch {
//       // Keep original result.
//     }
//   }

//   if (result.success) {
//     orderEmailService.sendOrderEmails(orderId).catch((err) => {
//       console.error('[Order email]', err.message);
//     });
//   }

//   return { orderId, ...result };
// }
async function handleCallback(
  payload = {}
) {
  const creds =
    await getPaytmCredentials();

  let gateway = payload;

  if (
    payload &&
    payload.body &&
    typeof payload.body === 'object'
  ) {
    gateway = payload.body;
  }

  const checksum =
    gateway.CHECKSUMHASH ||
    payload.CHECKSUMHASH ||
    payload.checksum ||
    '';

  if (checksum) {
    const params = {
      ...gateway,
    };

    delete params.CHECKSUMHASH;
    delete params.checksum;

    const valid =
      await PaytmChecksum.verifySignature(
        params,
        creds.merchantKey,
        checksum
      );

    if (!valid) {
      throw httpError(
        400,
        'Invalid Paytm checksum.'
      );
    }
  }

  const paytmOrderId =
    String(
      gateway.ORDERID ||
      gateway.orderId ||
      ''
    );

  const orderIdMatch =
    paytmOrderId.match(
      /^(\d+)_/
    );

  const orderId =
    orderIdMatch
      ? Number(orderIdMatch[1])
      : null;

  if (!orderId) {
    throw httpError(
      400,
      'Invalid Paytm order reference.'
    );
  }

  /*
   * IMPORTANT:
   * Don't trust browser/callback status alone.
   * Verify directly from Paytm Status API.
   */

  const verifyData =
    await verifyTransaction(
      paytmOrderId
    );

  const verifyBody =
    verifyData &&
    verifyData.body
      ? verifyData.body
      : {};

  const resultInfo =
    verifyBody.resultInfo || {};

  const resultStatus =
    String(
      resultInfo.resultStatus ||
      ''
    ).toUpperCase();

  const success =
    resultStatus ===
    'TXN_SUCCESS';

  const verifiedPayload = {
    STATUS:
      success
        ? 'TXN_SUCCESS'
        : resultStatus,

    TXNID:
      verifyBody.txnId ||
      gateway.TXNID ||
      '',

    ORDERID:
      paytmOrderId,

    BANKTXNID:
      verifyBody.bankTxnId ||
      gateway.BANKTXNID ||
      '',

    PAYMENTMODE:
      verifyBody.paymentMode ||
      gateway.PAYMENTMODE ||
      '',

    RESPMSG:
      resultInfo.resultMsg ||
      gateway.RESPMSG ||
      '',
  };

  const result =
    await applyPaymentResult(
      orderId,
      verifiedPayload
    );

  if (result.success) {
    orderEmailService
      .sendOrderEmails(orderId)
      .catch((err) => {
        console.error(
          '[Order email]',
          err.message
        );
      });
  }

  return {
    orderId,
    ...result,
  };
}

async function verifyOrderPayment(
  orderId,
  customerId,
  requestedPaytmOrderId
) {
  const [[order]] =
    await pool.query(
      `SELECT
         id,
         customer_id,
         status
       FROM ${P}wc_orders
       WHERE id = ?
         AND type = 'shop_order'
       LIMIT 1`,
      [orderId]
    );

  if (!order) {
    throw httpError(
      404,
      'Order not found.'
    );
  }

  if (
    Number(order.customer_id) !==
    Number(customerId)
  ) {
    throw httpError(
      403,
      'You do not have access to this order.'
    );
  }

  const requestedId =
  String(
    requestedPaytmOrderId ||
    ''
  ).trim();

let paymentRow;

if (requestedId) {
  [[paymentRow]] =
    await pool.query(
      `SELECT
         id,
         order_id,
         paytm_order_id,
         status
       FROM ${P}paytm_order_data
       WHERE order_id = ?
         AND paytm_order_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [
        orderId,
        requestedId,
      ]
    );
} else {
  [[paymentRow]] =
    await pool.query(
      `SELECT
         id,
         order_id,
         paytm_order_id,
         status
       FROM ${P}paytm_order_data
       WHERE order_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [orderId]
    );
}

if (!paymentRow) {
  throw httpError(
    400,
    'Invalid Paytm transaction reference.'
  );
}

const paytmOrderId =
  String(
    paymentRow.paytm_order_id ||
    ''
  ).trim();

if (!paytmOrderId) {
  throw httpError(
    400,
    'Paytm transaction reference not found.'
  );
}
  // let paytmOrderId =
  //   String(
  //     requestedPaytmOrderId ||
  //     ''
  //   ).trim();

  // if (!paytmOrderId) {
  //   const [[paymentRow]] =
  //     await pool.query(
  //       `SELECT paytm_order_id
  //        FROM ${P}paytm_order_data
  //        WHERE order_id = ?
  //        ORDER BY id DESC
  //        LIMIT 1`,
  //       [orderId]
  //     );

  //   paytmOrderId =
  //     paymentRow &&
  //     paymentRow.paytm_order_id
  //       ? paymentRow.paytm_order_id
  //       : '';
  // }

  if (!paytmOrderId) {
    throw httpError(
      400,
      'Paytm transaction reference not found.'
    );
  }

  const verifyData =
    await verifyTransaction(
      paytmOrderId
    );

  const body =
    verifyData &&
    verifyData.body
      ? verifyData.body
      : {};

  const resultInfo =
    body.resultInfo || {};

  const resultStatus =
    String(
      resultInfo.resultStatus ||
      ''
    ).toUpperCase();

  const success =
    resultStatus ===
    'TXN_SUCCESS';

  const result =
    await applyPaymentResult(
      Number(orderId),
      {
        STATUS:
          success
            ? 'TXN_SUCCESS'
            : resultStatus,

        TXNID:
          body.txnId || '',

        ORDERID:
          paytmOrderId,

        BANKTXNID:
          body.bankTxnId || '',

        PAYMENTMODE:
          body.paymentMode || '',

        RESPMSG:
          resultInfo.resultMsg || '',
      }
    );

  if (result.success) {
    orderEmailService
      .sendOrderEmails(
        Number(orderId)
      )
      .catch((err) => {
        console.error(
          '[Order email]',
          err.message
        );
      });
  }

  return {
    ...result,
    paytmOrderId,
    gatewayStatus:
      resultStatus,
  };
}

function getPublicConfig() {
  return getPaytmCredentials().then((creds) => ({
    enabled: true,
    environment: creds.isProduction ? 'production' : 'staging',
    merchantId: creds.merchantId,
    description: creds.description,
  }));
}
module.exports = {
  getPaytmCredentials,
  initiatePayment,
  verifyTransaction,
  verifyOrderPayment,
  handleCallback,
  applyPaymentResult,
  getPublicConfig,
  getCallbackUrl,
};
// module.exports = {
//   getPaytmCredentials,
//   initiatePayment,
//   handleCallback,
//   applyPaymentResult,
//   getPublicConfig,
//   getCallbackUrl,
// };



// const crypto = require('crypto');
// const pool = require('../config/db');
// const P = require('../config/prefix');
// const env = require('../config/env');
// const { unserializePhp } = require('../utils/php');
// const { httpError } = require('../utils/httpError');
// const { nowLocal } = require('../utils/datetime');
// const { withTransaction } = require('../utils/transaction');
// const orderService = require('./orderService');
// const orderEmailService = require('./orderEmailService');

// async function getOption(key) {
//   const [[row]] = await pool.query(
//     `SELECT option_value FROM ${P}options WHERE option_name = ? LIMIT 1`,
//     [key]
//   );
//   return row ? row.option_value : null;
// }

// async function getPaytmCredentials() {
//   const raw = await getOption('woocommerce_paytm_settings');
//   const paytm = unserializePhp(raw) || {};

//   if (paytm.enabled === 'no') {
//     throw httpError(503, 'Paytm payment gateway is disabled.');
//   }

//   const merchantId = String(paytm.merchant_id || '').trim();
//   const merchantKey = String(paytm.merchant_key || '').trim();

//   if (!merchantId || !merchantKey) {
//     throw httpError(
//       503,
//       'Paytm is not configured. Add Production MID and merchant key in admin Settings.'
//     );
//   }

//   const isProduction = paytm.environment === '0';
//   let websiteName = String(paytm.website || '').trim();

//   if (!websiteName || websiteName === 'OTHER') {
//     websiteName = String(paytm.otherWebsiteName || '').trim() || (isProduction ? 'DEFAULT' : 'WEBSTAGING');
//   }

//   return {
//     merchantId,
//     merchantKey,
//     websiteName,
//     isProduction,
//     host: isProduction ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in',
//     description:
//       paytm.description ||
//       'The best payment gateway provider in India for e-payment through credit card, debit card & netbanking.',
//   };
// }

// function generateSalt(length = 4) {
//   return crypto
//     .randomBytes(Math.ceil(length / 2))
//     .toString('hex')
//     .slice(0, length);
// }

// function generateSignature(bodyString, merchantKey) {
//   const salt = generateSalt(4);
//   const hash = crypto
//     .createHash('sha256')
//     .update(`${bodyString}|${salt}`)
//     .digest('hex');
//   return `${hash}${salt}`;
// }

// function verifySignature(bodyString, merchantKey, signature) {
//   if (!signature || signature.length <= 4) return false;

//   const salt = signature.slice(-4);
//   const expectedHash = signature.slice(0, -4);
//   const hash = crypto
//     .createHash('sha256')
//     .update(`${bodyString}|${salt}`)
//     .digest('hex');

//   return hash === expectedHash;
// }

// function buildPaytmOrderId(orderId) {
//   const now = new Date();
//   const pad = (n) => String(n).padStart(2, '0');
//   const stamp =
//     `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
//     `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
//   return `${orderId}_${stamp}`;
// }

// function getCallbackUrl() {
//   const base =
//     env.apiPublicUrl ||
//     env.customerFrontendUrl ||
//     env.frontendUrl ||
//     'http://localhost:4000';
//   return `${String(base).replace(/\/$/, '')}/api/customer/payments/paytm/callback`;
// }

// async function ensurePaytmRow(conn, orderId, paytmOrderId) {
//   const [existing] = await conn.query(
//     `SELECT id FROM ${P}paytm_order_data WHERE order_id = ? AND status = '0' ORDER BY id DESC LIMIT 1`,
//     [orderId]
//   );

//   if (existing.length) {
//     await conn.query(
//       `UPDATE ${P}paytm_order_data SET paytm_order_id = ?, date_modified = ? WHERE id = ?`,
//       [paytmOrderId, nowLocal(), existing[0].id]
//     );
//     return existing[0].id;
//   }

//   const [result] = await conn.query(
//     `INSERT INTO ${P}paytm_order_data
//       (order_id, paytm_order_id, transaction_id, status, paytm_response, date_added, date_modified)
//      VALUES (?, ?, '', '0', '', ?, ?)`,
//     [orderId, paytmOrderId, nowLocal(), nowLocal()]
//   );

//   return result.insertId;
// }

// async function initiatePayment(orderId, customerId) {
//   const [[order]] = await pool.query(
//     `SELECT id, customer_id, total_amount, status, billing_email
//      FROM ${P}wc_orders
//      WHERE id = ? AND type = 'shop_order'`,
//     [orderId]
//   );

//   if (!order) throw httpError(404, 'Order not found');
//   if (Number(order.customer_id) !== Number(customerId)) {
//     throw httpError(403, 'You do not have access to this order.');
//   }

//   const status = String(order.status || '').replace(/^wc-/, '');
//   if (!['pending', 'failed'].includes(status)) {
//     throw httpError(400, 'This order is not awaiting payment.');
//   }

//   const creds = await getPaytmCredentials();
//   const paytmOrderId = buildPaytmOrderId(orderId);
//   const amount = Number(order.total_amount).toFixed(2);
//   const callbackUrl = getCallbackUrl();

//   await withTransaction(pool, async (conn) => {
//     await ensurePaytmRow(conn, orderId, paytmOrderId);
//   });

//   const body = {
//     requestType: 'Payment',
//     mid: creds.merchantId,
//     websiteName: creds.websiteName,
//     orderId: paytmOrderId,
//     callbackUrl,
//     txnAmount: {
//       value: amount,
//       currency: 'INR',
//     },
//     userInfo: {
//       custId: `customer_${customerId}`,
//       email: order.billing_email || '',
//     },
//   };

//   const bodyString = JSON.stringify(body);
//   const signature = generateSignature(bodyString, creds.merchantKey);
//   const requestTimestamp = Date.now().toString();

//   const url = `${creds.host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(creds.merchantId)}&orderId=${encodeURIComponent(paytmOrderId)}`;

//   let data;

//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         body,
//         head: {
//           signature,
//           version: 'v1',
//           requestTimestamp,
//           channelId: 'WEB',
//         },
//       }),
//     });

//     const raw = await response.text();

//     try {
//       data = raw ? JSON.parse(raw) : {};
//     } catch {
//       console.error('[Paytm initiate] Non-JSON response:', raw);
//       throw httpError(502, 'Invalid response from Paytm gateway.');
//     }

//     if (!response.ok) {
//       console.error('[Paytm initiate] HTTP error:', response.status, data);
//     }
//   } catch (error) {
//     if (error.status) {
//       throw error;
//     }

//     console.error('[Paytm initiate] Network error:', error);
//     throw httpError(
//       502,
//       'Unable to reach Paytm gateway. Check MID, merchant key, and environment in admin Settings.'
//     );
//   }

//   const resultBody = data?.body || {};
//   const resultInfo = resultBody?.resultInfo || data?.resultInfo || {};

//   if (resultInfo.resultStatus !== 'S') {
//     console.error('[Paytm initiate]', {
//       orderId,
//       paytmOrderId,
//       resultInfo,
//       response: data,
//     });

//     throw httpError(
//       502,
//       resultInfo.resultMsg || 'Unable to initiate Paytm payment.'
//     );
//   }

//   const txnToken = resultBody.txnToken;

//   if (!txnToken) {
//     throw httpError(502, 'Paytm did not return a transaction token.');
//   }

//   return {
//     mid: creds.merchantId,
//     orderId: paytmOrderId,
//     txnToken,
//     amount: Number(amount),
//     amountFormatted: amount,
//     callbackUrl,
//     environment: creds.isProduction ? 'production' : 'staging',
//     host: creds.host,
//     websiteName: creds.websiteName,
//   };
// }

// async function verifyTransaction(paytmOrderId) {
//   const creds = await getPaytmCredentials();

//   const body = {
//     mid: creds.merchantId,
//     orderId: paytmOrderId,
//   };

//   const bodyString = JSON.stringify(body);
//   const signature = generateSignature(bodyString, creds.merchantKey);

//   const url = `${creds.host}/v3/order/status`;

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       body,
//       head: {
//         signature,
//         version: 'v1',
//         requestTimestamp: Date.now().toString(),
//       },
//     }),
//   });

//   return response.json();
// }

// async function applyPaymentResult(orderId, gatewayPayload = {}) {
//   const status = String(gatewayPayload.STATUS || '').toUpperCase();
//   const txnId = gatewayPayload.TXNID || '';
//   const paytmOrderId = gatewayPayload.ORDERID || '';
//   const responseJson = JSON.stringify(gatewayPayload);

//   const success = status === 'TXN_SUCCESS';

//   return withTransaction(pool, async (conn) => {
//     if (paytmOrderId) {
//       await conn.query(
//         `UPDATE ${P}paytm_order_data
//          SET transaction_id = ?, status = ?, paytm_response = ?, date_modified = ?
//          WHERE order_id = ? AND paytm_order_id = ?`,
//         [txnId, success ? '1' : '0', responseJson, nowLocal(), orderId, paytmOrderId]
//       );
//     }

//     const nextStatus = success ? 'wc-processing' : 'wc-pending';
//     const gmt = new Date().toISOString().slice(0, 19).replace('T', ' ');

//     await conn.query(
//       `UPDATE ${P}wc_orders SET status = ?, transaction_id = ?, date_updated_gmt = ? WHERE id = ?`,
//       [nextStatus, success ? txnId : '', gmt, orderId]
//     );

//     await conn.query(
//       `UPDATE ${P}posts SET post_status = ?, post_modified_gmt = ? WHERE ID = ? AND post_type = 'shop_order_placehold'`,
//       [nextStatus, gmt, orderId]
//     );

//     await conn.query(
//       `UPDATE ${P}wc_order_stats SET status = ? WHERE order_id = ?`,
//       [nextStatus, orderId]
//     );

//     if (success) {
//       await conn.query(
//         `UPDATE ${P}wc_order_operational_data
//          SET date_paid_gmt = COALESCE(date_paid_gmt, ?), recorded_sales = 1
//          WHERE order_id = ?`,
//         [gmt, orderId]
//       );

//       await conn.query(
//         `UPDATE ${P}wc_order_stats SET date_paid = ?, date_paid_gmt = ? WHERE order_id = ?`,
//         [gmt, gmt, orderId]
//       );
//     }

//     return { success, status: nextStatus, transactionId: txnId };
//   });
// }

// async function handleCallback(payload = {}) {
//   const creds = await getPaytmCredentials();

//   let gateway = payload;

//   if (payload?.body && typeof payload.body === 'object') {
//     gateway = payload.body;
//   }

//   const checksum =
//     payload?.CHECKSUMHASH ||
//     payload?.checksum ||
//     payload?.head?.signature ||
//     gateway?.CHECKSUMHASH;

//   if (checksum && !payload?.head?.signature) {
//     const params = { ...gateway };
//     delete params.CHECKSUMHASH;
//     delete params.checksum;

//     const sortedKeys = Object.keys(params).sort();
//     const values = sortedKeys.map((key) => String(params[key] ?? '')).join('|');
//     const valid = verifySignature(values, creds.merchantKey, checksum);

//     if (!valid) {
//       const bodyString = JSON.stringify(gateway);
//       const altValid = verifySignature(bodyString, creds.merchantKey, checksum);
//       if (!altValid) {
//         console.warn('[Paytm] Signature verification failed, continuing with status check.');
//       }
//     }
//   } else if (payload?.head?.signature) {
//     const bodyString =
//       typeof payload.body === 'string'
//         ? payload.body
//         : JSON.stringify(payload.body || {});

//     const valid = verifySignature(bodyString, creds.merchantKey, payload.head.signature);
//     if (!valid) {
//       throw httpError(400, 'Invalid Paytm signature.');
//     }
//   }

//   const paytmOrderId = gateway.ORDERID || gateway.orderId || '';
//   const orderIdMatch = paytmOrderId.match(/^(\d+)_/);
//   const orderId = orderIdMatch ? Number(orderIdMatch[1]) : null;

//   if (!orderId) {
//     throw httpError(400, 'Invalid Paytm order reference.');
//   }

//   let result = await applyPaymentResult(orderId, gateway);

//   if (!result.success && paytmOrderId) {
//     try {
//       const verifyData = await verifyTransaction(paytmOrderId);
//       const verifyBody = verifyData?.body || {};
//       if (verifyBody.resultInfo?.resultStatus === 'TXN_SUCCESS') {
//         result = await applyPaymentResult(orderId, {
//           ...verifyBody,
//           STATUS: 'TXN_SUCCESS',
//           TXNID: verifyBody.txnId || verifyBody.TXNID || '',
//           ORDERID: paytmOrderId,
//         });
//       }
//     } catch {
//       // Keep original result.
//     }
//   }

//   if (result.success) {
//     orderEmailService.sendOrderEmails(orderId).catch((err) => {
//       console.error('[Order email]', err.message);
//     });
//   }

//   return { orderId, ...result };
// }

// function getPublicConfig() {
//   return getPaytmCredentials().then((creds) => ({
//     enabled: true,
//     environment: creds.isProduction ? 'production' : 'staging',
//     merchantId: creds.merchantId,
//     description: creds.description,
//   }));
// }

// module.exports = {
//   getPaytmCredentials,
//   initiatePayment,
//   handleCallback,
//   applyPaymentResult,
//   getPublicConfig,
//   getCallbackUrl,
// };
