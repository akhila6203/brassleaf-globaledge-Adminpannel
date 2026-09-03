const pool = require('../config/db');
const P = require('../config/prefix');
const { serializePhp, unserializePhp } = require('../utils/php');
const { httpError } = require('../utils/httpError');

async function getOption(key) {
  const [[row]] = await pool.query(`SELECT option_value FROM ${P}options WHERE option_name = ? LIMIT 1`, [
    key,
  ]);
  return row ? row.option_value : null;
}

async function setOption(key, value) {
  const [existing] = await pool.query(`SELECT option_id FROM ${P}options WHERE option_name = ? LIMIT 1`, [
    key,
  ]);
  if (existing.length) {
    await pool.query(`UPDATE ${P}options SET option_value = ? WHERE option_name = ?`, [value, key]);
  } else {
    await pool.query(`INSERT INTO ${P}options (option_name, option_value, autoload) VALUES (?, ?, 'yes')`, [
      key,
      value,
    ]);
  }
}

function maskSecret(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.min(s.length - 4, 12))}${s.slice(-4)}`;
}

async function getSettings() {
  const [blogname, adminEmail, currency, timezone, paytmRaw] = await Promise.all([
    getOption('blogname'),
    getOption('admin_email'),
    getOption('woocommerce_currency'),
    getOption('timezone_string'),
    getOption('woocommerce_paytm_settings'),
  ]);

  const paytm = unserializePhp(paytmRaw) || {};

  return {
    store_name: blogname || 'Brassleaf',
    store_email: adminEmail || '',
    currency: currency || 'INR',
    timezone: timezone || 'Asia/Kolkata',
    paytm: {
      enabled: paytm.enabled === 'yes',
      description: paytm.description || '',
      environment: paytm.environment === '0' ? 'production' : 'staging',
      merchant_id: paytm.merchant_id || '',
      merchant_key_masked: maskSecret(paytm.merchant_key),
      has_merchant_key: Boolean(paytm.merchant_key),
      website: paytm.website || '',
      other_website_name: paytm.otherWebsiteName || '',
      is_webhook: paytm.iswebhook === 'yes',
      emi_subvention: paytm.emiSubvention === '1',
      bank_offer: paytm.bankOffer === '1',
      dc_emi: paytm.dcEmi === '1',
    },
  };
}

async function updateSettings(data = {}) {
  if (data.store_name != null) await setOption('blogname', String(data.store_name));
  if (data.store_email != null) await setOption('admin_email', String(data.store_email));
  if (data.currency != null) await setOption('woocommerce_currency', String(data.currency));
  if (data.timezone != null) await setOption('timezone_string', String(data.timezone));

  if (data.paytm) {
    const currentRaw = await getOption('woocommerce_paytm_settings');
    const current = unserializePhp(currentRaw) || {};
    const p = data.paytm;

    const next = {
      description:
        p.description != null
          ? String(p.description)
          : current.description ||
            'The best payment gateway provider in India for e-payment through credit card, debit card & netbanking.',
      environment: p.environment === 'production' ? '0' : '1',
      merchant_id: p.merchant_id != null ? String(p.merchant_id) : current.merchant_id || '',
      merchant_key:
        p.merchant_key && !String(p.merchant_key).includes('*')
          ? String(p.merchant_key)
          : current.merchant_key || '',
      website: p.website != null ? String(p.website) : current.website || 'WEBSTAGING',
      otherWebsiteName:
        p.other_website_name != null ? String(p.other_website_name) : current.otherWebsiteName || '',
      iswebhook: p.is_webhook ? 'yes' : 'no',
      emiSubvention: p.emi_subvention ? '1' : '0',
      bankOffer: p.bank_offer ? '1' : '0',
      dcEmi: p.dc_emi ? '1' : '0',
      invertLogo: current.invertLogo || '0',
      enabled: p.enabled === false ? 'no' : 'yes',
    };

    // if (!next.merchant_id) throw httpError(400, 'Paytm merchant ID is required when saving gateway settings');
    if (
  next.enabled === 'yes' &&
  !next.merchant_id
) {
  throw httpError(
    400,
    'Paytm Merchant ID is required.'
  );
}

if (
  next.enabled === 'yes' &&
  !next.merchant_key
) {
  throw httpError(
    400,
    'Paytm Merchant Key is required.'
  );
}

    await setOption('woocommerce_paytm_settings', serializePhp(next));
  }

  return getSettings();
}

module.exports = { getSettings, updateSettings };



// const pool = require('../config/db');
// const P = require('../config/prefix');
// const { serializePhp, unserializePhp } = require('../utils/php');
// const { httpError } = require('../utils/httpError');

// async function getOption(key) {
//   const [[row]] = await pool.query(`SELECT option_value FROM ${P}options WHERE option_name = ? LIMIT 1`, [
//     key,
//   ]);
//   return row ? row.option_value : null;
// }

// async function setOption(key, value) {
//   const [existing] = await pool.query(`SELECT option_id FROM ${P}options WHERE option_name = ? LIMIT 1`, [
//     key,
//   ]);
//   if (existing.length) {
//     await pool.query(`UPDATE ${P}options SET option_value = ? WHERE option_name = ?`, [value, key]);
//   } else {
//     await pool.query(`INSERT INTO ${P}options (option_name, option_value, autoload) VALUES (?, ?, 'yes')`, [
//       key,
//       value,
//     ]);
//   }
// }

// function maskSecret(value) {
//   if (!value) return '';
//   const s = String(value);
//   if (s.length <= 4) return '****';
//   return `${'*'.repeat(Math.min(s.length - 4, 12))}${s.slice(-4)}`;
// }

// async function getSettings() {
//   const [blogname, adminEmail, currency, timezone, paytmRaw] = await Promise.all([
//     getOption('blogname'),
//     getOption('admin_email'),
//     getOption('woocommerce_currency'),
//     getOption('timezone_string'),
//     getOption('woocommerce_paytm_settings'),
//   ]);

//   const paytm = unserializePhp(paytmRaw) || {};

//   return {
//     store_name: blogname || 'Brassleaf',
//     store_email: adminEmail || '',
//     currency: currency || 'INR',
//     timezone: timezone || 'Asia/Kolkata',
//     paytm: {
//       enabled: paytm.enabled === 'yes',
//       description: paytm.description || '',
//       environment: paytm.environment === '0' ? 'production' : 'staging',
//       merchant_id: paytm.merchant_id || '',
//       merchant_key_masked: maskSecret(paytm.merchant_key),
//       has_merchant_key: Boolean(paytm.merchant_key),
//       website: paytm.website || '',
//       other_website_name: paytm.otherWebsiteName || '',
//       is_webhook: paytm.iswebhook === 'yes',
//       emi_subvention: paytm.emiSubvention === '1',
//       bank_offer: paytm.bankOffer === '1',
//       dc_emi: paytm.dcEmi === '1',
//     },
//   };
// }

// async function updateSettings(data = {}) {
//   if (data.store_name != null) await setOption('blogname', String(data.store_name));
//   if (data.store_email != null) await setOption('admin_email', String(data.store_email));
//   if (data.currency != null) await setOption('woocommerce_currency', String(data.currency));
//   if (data.timezone != null) await setOption('timezone_string', String(data.timezone));

//   if (data.paytm) {
//     const currentRaw = await getOption('woocommerce_paytm_settings');
//     const current = unserializePhp(currentRaw) || {};
//     const p = data.paytm;

//     const next = {
//       description:
//         p.description != null
//           ? String(p.description)
//           : current.description ||
//             'The best payment gateway provider in India for e-payment through credit card, debit card & netbanking.',
//       environment: p.environment === 'production' ? '0' : '1',
//       merchant_id: p.merchant_id != null ? String(p.merchant_id) : current.merchant_id || '',
//       merchant_key:
//         p.merchant_key && !String(p.merchant_key).includes('*')
//           ? String(p.merchant_key)
//           : current.merchant_key || '',
//       website: p.website != null ? String(p.website) : current.website || 'WEBSTAGING',
//       otherWebsiteName:
//         p.other_website_name != null ? String(p.other_website_name) : current.otherWebsiteName || '',
//       iswebhook: p.is_webhook ? 'yes' : 'no',
//       emiSubvention: p.emi_subvention ? '1' : '0',
//       bankOffer: p.bank_offer ? '1' : '0',
//       dcEmi: p.dc_emi ? '1' : '0',
//       invertLogo: current.invertLogo || '0',
//       enabled: p.enabled === false ? 'no' : 'yes',
//     };

//     if (!next.merchant_id) throw httpError(400, 'Paytm merchant ID is required when saving gateway settings');

//     await setOption('woocommerce_paytm_settings', serializePhp(next));
//   }

//   return getSettings();
// }

// module.exports = { getSettings, updateSettings };
