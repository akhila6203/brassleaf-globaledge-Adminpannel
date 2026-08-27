const pool = require('../config/db');
const P = require('../config/prefix');
const { parseList, listResponse } = require('../utils/listParams');
const { slugify } = require('../utils/datetime');
const { withTransaction } = require('../utils/transaction');
const { httpError } = require('../utils/httpError');

const SORT = {
  name: 't.name',
  count: 'tt.count',
  id: 't.term_id',
};

const PROTECTED_TERM_IDS = new Set([15]); // Uncategorized

async function list(req) {
  const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'name');
  const params = [];
  let where = `tt.taxonomy = 'product_cat'`;
  if (search) {
    where += ` AND (t.name LIKE ? OR t.slug LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM ${P}terms t
     JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
     WHERE ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       t.term_id, t.term_id AS id, t.name, t.slug,
       tt.term_taxonomy_id, tt.parent, tt.count AS product_count, tt.description
     FROM ${P}terms t
     JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
     WHERE ${where}
     ORDER BY ${sortCol} ${dir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return listResponse(rows, total, page, limit);
}

async function getById(termId) {
  const [[cat]] = await pool.query(
    `SELECT t.term_id, t.term_id AS id, t.name, t.slug, t.term_group,
            tt.term_taxonomy_id, tt.parent, tt.count AS product_count, tt.description
     FROM ${P}terms t
     JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
     WHERE t.term_id = ? AND tt.taxonomy = 'product_cat'`,
    [termId]
  );
  if (!cat) throw httpError(404, 'Category not found');

  let parent = null;
  if (cat.parent) {
    const [[p]] = await pool.query(
      `SELECT t.term_id, t.name, t.slug
       FROM ${P}terms t
       JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
       WHERE t.term_id = ? AND tt.taxonomy = 'product_cat'`,
      [cat.parent]
    );
    parent = p || null;
  }

  const [children] = await pool.query(
    `SELECT t.term_id, t.name, t.slug, tt.count AS product_count
     FROM ${P}terms t
     JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
     WHERE tt.taxonomy = 'product_cat' AND tt.parent = ?
     ORDER BY t.name`,
    [termId]
  );

  const [termmeta] = await pool.query(
    `SELECT meta_key, meta_value FROM ${P}termmeta WHERE term_id = ?`,
    [termId]
  );

  const [products] = await pool.query(
    `SELECT p.ID, p.ID AS id, p.post_title AS name, p.post_name AS slug,
            p.post_status AS status, p.post_date AS created_at,
            ml.min_price, ml.max_price, ml.stock_status, ml.stock_quantity, ml.sku, ml.total_sales,
            att.guid AS image_url
     FROM ${P}term_relationships tr
     JOIN ${P}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
     JOIN ${P}posts p ON p.ID = tr.object_id
     LEFT JOIN ${P}wc_product_meta_lookup ml ON ml.product_id = p.ID
     LEFT JOIN ${P}postmeta thumb ON thumb.post_id = p.ID AND thumb.meta_key = '_thumbnail_id'
     LEFT JOIN ${P}posts att ON att.ID = thumb.meta_value AND att.post_type = 'attachment'
     WHERE tt.term_id = ? AND tt.taxonomy = 'product_cat' AND p.post_type = 'product'
     ORDER BY p.post_title`,
    [termId]
  );

  return {
    ...cat,
    parent_category: parent,
    parent_name: parent?.name || null,
    children,
    termmeta,
    products,
  };
}

async function syncCategoryLookup(conn, termId, parentId) {
  await conn.query(`DELETE FROM ${P}wc_category_lookup WHERE category_id = ?`, [termId]);
  // Self + walk parents for tree
  let current = termId;
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    await conn.query(
      `INSERT INTO ${P}wc_category_lookup (category_tree_id, category_id) VALUES (?, ?)`,
      [current, termId]
    );
    if (current === parentId || !parentId) break;
    const [[row]] = await conn.query(
      `SELECT parent FROM ${P}term_taxonomy WHERE term_id = ? AND taxonomy = 'product_cat'`,
      [current === termId ? parentId : current]
    );
    // After inserting self, insert ancestors via parent chain of this category
    break;
  }
  // Insert ancestor chain starting from parent
  let ancestor = parentId;
  while (ancestor) {
    await conn.query(
      `INSERT IGNORE INTO ${P}wc_category_lookup (category_tree_id, category_id) VALUES (?, ?)`,
      [ancestor, termId]
    );
    const [[row]] = await conn.query(
      `SELECT parent FROM ${P}term_taxonomy WHERE term_id = ? AND taxonomy = 'product_cat' LIMIT 1`,
      [ancestor]
    );
    ancestor = row ? row.parent : 0;
    if (!ancestor) break;
  }
  // Ensure self row
  await conn.query(
    `INSERT IGNORE INTO ${P}wc_category_lookup (category_tree_id, category_id) VALUES (?, ?)`,
    [termId, termId]
  );
}

async function create(data) {
  if (!data?.name) throw httpError(400, 'name is required');
  const name = data.name;
  const slug = slugify(data.slug || name);
  const parent = Number(data.parent) || 0;
  const description = data.description || '';

  const termId = await withTransaction(pool, async (conn) => {
    const [termRes] = await conn.query(
      `INSERT INTO ${P}terms (name, slug, term_group) VALUES (?, ?, 0)`,
      [name, slug]
    );
    const id = termRes.insertId;
    await conn.query(
      `INSERT INTO ${P}term_taxonomy (term_id, taxonomy, description, parent, count)
       VALUES (?, 'product_cat', ?, ?, 0)`,
      [id, description, parent]
    );
    await syncCategoryLookup(conn, id, parent);
    return id;
  });

  return getById(termId);
}

async function update(termId, data) {
  const existing = await getById(termId);
  return withTransaction(pool, async (conn) => {
    if (data.name != null || data.slug != null) {
      await conn.query(
        `UPDATE ${P}terms SET name = ?, slug = ? WHERE term_id = ?`,
        [data.name ?? existing.name, data.slug ? slugify(data.slug) : existing.slug, termId]
      );
    }
    const parent = data.parent !== undefined ? Number(data.parent) || 0 : existing.parent;
    const description = data.description !== undefined ? data.description : existing.description;
    await conn.query(
      `UPDATE ${P}term_taxonomy SET description = ?, parent = ?
       WHERE term_id = ? AND taxonomy = 'product_cat'`,
      [description, parent, termId]
    );
    await syncCategoryLookup(conn, termId, parent);
    return getById(termId);
  });
}

async function remove(termId) {
  if (PROTECTED_TERM_IDS.has(Number(termId))) {
    throw httpError(400, 'Cannot delete default Uncategorized category');
  }
  const cat = await getById(termId);
  if (cat.product_count > 0) {
    throw httpError(400, 'Category has products; reassign them first');
  }

  return withTransaction(pool, async (conn) => {
    const ttId = cat.term_taxonomy_id;
    await conn.query(`DELETE FROM ${P}term_relationships WHERE term_taxonomy_id = ?`, [ttId]);
    await conn.query(`DELETE FROM ${P}termmeta WHERE term_id = ?`, [termId]);
    await conn.query(`DELETE FROM ${P}wc_category_lookup WHERE category_id = ? OR category_tree_id = ?`, [
      termId,
      termId,
    ]);
    await conn.query(`DELETE FROM ${P}term_taxonomy WHERE term_taxonomy_id = ?`, [ttId]);
    await conn.query(`DELETE FROM ${P}terms WHERE term_id = ?`, [termId]);
    return { ok: true, id: termId };
  });
}

async function assignProducts(termId, productIds = [], action = 'add') {
  const cat = await getById(termId);
  const ttId = cat.term_taxonomy_id;
  const ids = (Array.isArray(productIds) ? productIds : []).map(Number).filter(Boolean);
  if (!ids.length) throw httpError(400, 'product_ids required');

  return withTransaction(pool, async (conn) => {
    for (const pid of ids) {
      const [exists] = await conn.query(
        `SELECT object_id FROM ${P}term_relationships WHERE object_id = ? AND term_taxonomy_id = ?`,
        [pid, ttId]
      );
      if (action === 'remove') {
        if (exists.length) {
          await conn.query(
            `DELETE FROM ${P}term_relationships WHERE object_id = ? AND term_taxonomy_id = ?`,
            [pid, ttId]
          );
          await conn.query(
            `UPDATE ${P}term_taxonomy SET count = GREATEST(0, count - 1) WHERE term_taxonomy_id = ?`,
            [ttId]
          );
        }
      } else if (!exists.length) {
        await conn.query(
          `INSERT INTO ${P}term_relationships (object_id, term_taxonomy_id, term_order) VALUES (?, ?, 0)`,
          [pid, ttId]
        );
        await conn.query(
          `UPDATE ${P}term_taxonomy SET count = count + 1 WHERE term_taxonomy_id = ?`,
          [ttId]
        );
      }
    }
    return getById(termId);
  });
}

module.exports = { list, getById, create, update, remove, assignProducts };
