const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  name: 't.name',
  count: 'tt.count',
  id: 't.term_id',
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
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
         t.term_id,
         t.name,
         t.slug,
         tt.parent,
         tt.count AS product_count,
         tt.description
       FROM ${P}terms t
       JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
       WHERE ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json(listResponse(rows, total, page, limit));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const termId = parseInt(req.params.id, 10);
    const [[cat]] = await pool.query(
      `SELECT t.term_id, t.name, t.slug, tt.parent, tt.count AS product_count, tt.description
       FROM ${P}terms t
       JOIN ${P}term_taxonomy tt ON tt.term_id = t.term_id
       WHERE t.term_id = ? AND tt.taxonomy = 'product_cat'`,
      [termId]
    );
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const [products] = await pool.query(
      `SELECT
         p.ID, p.post_title AS name, p.post_name AS slug,
         ml.min_price, ml.max_price, ml.stock_status, ml.sku
       FROM ${P}term_relationships tr
       JOIN ${P}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
       JOIN ${P}posts p ON p.ID = tr.object_id
       LEFT JOIN ${P}wc_product_meta_lookup ml ON ml.product_id = p.ID
       WHERE tt.term_id = ? AND tt.taxonomy = 'product_cat'
         AND p.post_type = 'product'
       ORDER BY p.post_title`,
      [termId]
    );

    res.json({ ...cat, products });
  })
);

module.exports = router;
