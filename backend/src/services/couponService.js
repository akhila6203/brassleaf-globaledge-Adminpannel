const pool = require('../config/db');
const P = require('../config/prefix');
const env = require('../config/env');
const { parseList, listResponse } = require('../utils/listParams');
const { slugify, nowLocal, nowGmt } = require('../utils/datetime');
const { upsertPostMeta, getPostMetaMap } = require('../utils/meta');
const { withTransaction } = require('../utils/transaction');
const { httpError } = require('../utils/httpError');

const SORT = {
  id: 'p.ID',
  code: 'p.post_title',
  date: 'p.post_date',
  status: 'p.post_status',
};

const COUPON_META_KEYS = [
  'discount_type',
  'coupon_amount',
  'expiry_date',
  'date_expires',
  'usage_limit',
  'usage_limit_per_user',
  'usage_count',
  'individual_use',
  'product_ids',
  'excluded_product_ids',
  'product_categories',
  'excluded_product_categories',
  'minimum_amount',
  'maximum_amount',
  'customer_email',
  'free_shipping',
];

async function writeCouponMeta(conn, postId, data) {
  const amount = data.amount ?? data.coupon_amount ?? '0';
  const discountType = data.discount_type || 'percent';
  const pairs = {
    discount_type: discountType,
    coupon_amount: String(amount),
    usage_limit: data.usage_limit == null ? '' : String(data.usage_limit),
    usage_limit_per_user: data.usage_limit_per_user == null ? '' : String(data.usage_limit_per_user),
    usage_count: data.usage_count == null ? '0' : String(data.usage_count),
    individual_use: data.individual_use ? 'yes' : 'no',
    free_shipping: data.free_shipping ? 'yes' : 'no',
    product_ids: data.product_ids != null ? String(data.product_ids) : '',
    excluded_product_ids: data.excluded_product_ids != null ? String(data.excluded_product_ids) : '',
    product_categories: data.product_categories != null ? String(data.product_categories) : '',
    excluded_product_categories:
      data.excluded_product_categories != null ? String(data.excluded_product_categories) : '',
    minimum_amount: data.minimum_amount != null ? String(data.minimum_amount) : '',
    maximum_amount: data.maximum_amount != null ? String(data.maximum_amount) : '',
    customer_email: data.customer_email != null ? String(data.customer_email) : '',
    expiry_date: data.expiry_date || '',
    date_expires: data.date_expires || data.expiry_date || '',
  };

  for (const [k, v] of Object.entries(pairs)) {
    if (data[k] !== undefined || ['discount_type', 'coupon_amount', 'usage_count', 'individual_use', 'free_shipping'].includes(k)) {
      await upsertPostMeta(conn, P, postId, k, v);
    }
  }
}

function shapeCoupon(post, meta) {
  return {
    id: post.ID,
    ID: post.ID,
    code: post.post_title,
    post_title: post.post_title,
    description: post.post_excerpt,
    status: post.post_status,
    post_status: post.post_status,
    created_at: post.post_date,
    discount_type: meta.discount_type || 'percent',
    amount: meta.coupon_amount || '0',
    coupon_amount: meta.coupon_amount || '0',
    usage_limit: meta.usage_limit || '',
    usage_limit_per_user: meta.usage_limit_per_user || '',
    usage_count: meta.usage_count || '0',
    individual_use: meta.individual_use || 'no',
    free_shipping: meta.free_shipping || 'no',
    expiry_date: meta.expiry_date || meta.date_expires || '',
    date_expires: meta.date_expires || '',
    minimum_amount: meta.minimum_amount || '',
    maximum_amount: meta.maximum_amount || '',
    meta,
  };
}

async function list(req) {
  const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
  const params = [];
  let where = `p.post_type = 'shop_coupon' AND p.post_status NOT IN ('trash','auto-draft')`;
  if (search) {
    where += ` AND (p.post_title LIKE ? OR p.post_excerpt LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${P}posts p WHERE ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT p.ID, p.post_title, p.post_excerpt, p.post_status, p.post_date, p.post_modified
     FROM ${P}posts p
     WHERE ${where}
     ORDER BY ${sortCol} ${dir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const data = [];
  for (const row of rows) {
    const meta = await getPostMetaMap(pool, P, row.ID);
    data.push(shapeCoupon(row, meta));
  }

  return listResponse(data, total, page, limit);
}

async function getById(id) {
  const [[post]] = await pool.query(
    `SELECT ID, post_title, post_excerpt, post_status, post_date, post_modified, post_content
     FROM ${P}posts WHERE ID = ? AND post_type = 'shop_coupon'`,
    [id]
  );
  if (!post) throw httpError(404, 'Coupon not found');
  const meta = await getPostMetaMap(pool, P, id);
  return shapeCoupon(post, meta);
}

async function create(data, authorId = 1) {
  const code = data.code || data.post_title;
  if (!code) throw httpError(400, 'code is required');

  const id = await withTransaction(pool, async (conn) => {
    const local = nowLocal();
    const gmt = nowGmt();
    const slug = slugify(code);
    const status = data.status || 'publish';
    const excerpt = data.description || '';

    const [result] = await conn.query(
      `INSERT INTO ${P}posts
        (post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt,
         post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged,
         post_modified, post_modified_gmt, post_content_filtered, post_parent, guid,
         menu_order, post_type, post_mime_type, comment_count)
       VALUES (?, ?, ?, '', ?, ?, ?, 'closed', 'closed', '', ?, '', '', ?, ?, '', 0, '', 0, 'shop_coupon', '', 0)`,
      [authorId, local, gmt, code, excerpt, status, slug, local, gmt]
    );
    const newId = result.insertId;
    await conn.query(`UPDATE ${P}posts SET guid = ? WHERE ID = ?`, [
      `${env.wpSiteUrl}/?post_type=shop_coupon&p=${newId}`,
      newId,
    ]);
    await writeCouponMeta(conn, newId, data);
    return newId;
  });

  return getById(id);
}

async function update(id, data) {
  await getById(id);
  return withTransaction(pool, async (conn) => {
    const local = nowLocal();
    const gmt = nowGmt();
    const fields = ['post_modified = ?', 'post_modified_gmt = ?'];
    const params = [local, gmt];
    if (data.code != null || data.post_title != null) {
      fields.push('post_title = ?', 'post_name = ?');
      const code = data.code || data.post_title;
      params.push(code, slugify(code));
    }
    if (data.description != null) {
      fields.push('post_excerpt = ?');
      params.push(data.description);
    }
    if (data.status != null) {
      fields.push('post_status = ?');
      params.push(data.status);
    }
    params.push(id);
    await conn.query(`UPDATE ${P}posts SET ${fields.join(', ')} WHERE ID = ?`, params);

    const existing = await getPostMetaMap(conn, P, id);
    await writeCouponMeta(conn, id, {
      discount_type: data.discount_type ?? existing.discount_type,
      amount: data.amount ?? data.coupon_amount ?? existing.coupon_amount,
      usage_limit: data.usage_limit !== undefined ? data.usage_limit : existing.usage_limit,
      usage_limit_per_user:
        data.usage_limit_per_user !== undefined
          ? data.usage_limit_per_user
          : existing.usage_limit_per_user,
      usage_count: existing.usage_count || '0',
      individual_use: data.individual_use != null ? data.individual_use : existing.individual_use === 'yes',
      free_shipping: data.free_shipping != null ? data.free_shipping : existing.free_shipping === 'yes',
      expiry_date: data.expiry_date !== undefined ? data.expiry_date : existing.expiry_date,
      date_expires: data.date_expires !== undefined ? data.date_expires : existing.date_expires,
      minimum_amount: data.minimum_amount !== undefined ? data.minimum_amount : existing.minimum_amount,
      maximum_amount: data.maximum_amount !== undefined ? data.maximum_amount : existing.maximum_amount,
      product_ids: data.product_ids !== undefined ? data.product_ids : existing.product_ids,
      excluded_product_ids:
        data.excluded_product_ids !== undefined
          ? data.excluded_product_ids
          : existing.excluded_product_ids,
      product_categories:
        data.product_categories !== undefined ? data.product_categories : existing.product_categories,
      excluded_product_categories:
        data.excluded_product_categories !== undefined
          ? data.excluded_product_categories
          : existing.excluded_product_categories,
      customer_email: data.customer_email !== undefined ? data.customer_email : existing.customer_email,
    });

    return getById(id);
  });
}

async function trash(id) {
  await getById(id);
  await pool.query(
    `UPDATE ${P}posts SET post_status = 'trash', post_modified = ?, post_modified_gmt = ? WHERE ID = ?`,
    [nowLocal(), nowGmt(), id]
  );
  return { ok: true, id, status: 'trash' };
}

module.exports = { list, getById, create, update, trash, COUPON_META_KEYS };
