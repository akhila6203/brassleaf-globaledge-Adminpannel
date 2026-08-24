const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  id: 'p.ID',
  name: 'p.post_title',
  date: 'p.post_date',
  sku: 'ml.sku',
  price: 'ml.min_price',
  sales: 'ml.total_sales',
  stock: 'ml.stock_status',
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
    const stockStatus = req.query.stock_status || '';
    const category = req.query.category || '';
    const params = [];
    let where = `p.post_type = 'product' AND p.post_status IN ('publish','draft','private')`;

    if (search) {
      where += ` AND (p.post_title LIKE ? OR ml.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (stockStatus) {
      where += ` AND ml.stock_status = ?`;
      params.push(stockStatus);
    }
    if (category) {
      where += ` AND EXISTS (
        SELECT 1 FROM ${P}term_relationships tr
        JOIN ${P}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
        JOIN ${P}terms t ON t.term_id = tt.term_id
        WHERE tr.object_id = p.ID AND tt.taxonomy = 'product_cat' AND t.slug = ?
      )`;
      params.push(category);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ${P}posts p
       LEFT JOIN ${P}wc_product_meta_lookup ml ON ml.product_id = p.ID
       WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         p.ID,
         p.post_title AS name,
         p.post_name AS slug,
         p.post_status AS status,
         p.post_date AS created_at,
         ml.sku,
         ml.min_price,
         ml.max_price,
         ml.stock_status,
         ml.stock_quantity,
         ml.onsale,
         ml.total_sales,
         ml.average_rating,
         ml.rating_count,
         att.guid AS image_url,
         file_pm.meta_value AS image_file
       FROM ${P}posts p
       LEFT JOIN ${P}wc_product_meta_lookup ml ON ml.product_id = p.ID
       LEFT JOIN ${P}postmeta thumb
         ON thumb.post_id = p.ID AND thumb.meta_key = '_thumbnail_id'
       LEFT JOIN ${P}posts att ON att.ID = thumb.meta_value AND att.post_type = 'attachment'
       LEFT JOIN ${P}postmeta file_pm
         ON file_pm.post_id = att.ID AND file_pm.meta_key = '_wp_attached_file'
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
    const id = parseInt(req.params.id, 10);
    const [[product]] = await pool.query(
      `SELECT
         p.ID,
         p.post_title AS name,
         p.post_name AS slug,
         p.post_content AS description,
         p.post_excerpt AS short_description,
         p.post_status AS status,
         p.post_date AS created_at,
         p.post_modified AS updated_at,
         ml.sku,
         ml.min_price,
         ml.max_price,
         ml.stock_status,
         ml.stock_quantity,
         ml.onsale,
         ml.total_sales,
         ml.average_rating,
         ml.rating_count,
         ml.virtual,
         ml.downloadable,
         ml.tax_status,
         ml.tax_class
       FROM ${P}posts p
       LEFT JOIN ${P}wc_product_meta_lookup ml ON ml.product_id = p.ID
       WHERE p.ID = ? AND p.post_type = 'product'`,
      [id]
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const [meta] = await pool.query(
      `SELECT meta_key, meta_value FROM ${P}postmeta WHERE post_id = ?`,
      [id]
    );

    const [variations] = await pool.query(
      `SELECT
         v.ID,
         v.post_title AS name,
         v.post_status AS status,
         pm_price.meta_value AS price,
         pm_reg.meta_value AS regular_price,
         pm_sale.meta_value AS sale_price,
         pm_sku.meta_value AS sku,
         pm_stock.meta_value AS stock_quantity,
         pm_ss.meta_value AS stock_status,
         pm_size.meta_value AS size
       FROM ${P}posts v
       LEFT JOIN ${P}postmeta pm_price ON pm_price.post_id = v.ID AND pm_price.meta_key = '_price'
       LEFT JOIN ${P}postmeta pm_reg   ON pm_reg.post_id   = v.ID AND pm_reg.meta_key   = '_regular_price'
       LEFT JOIN ${P}postmeta pm_sale  ON pm_sale.post_id  = v.ID AND pm_sale.meta_key  = '_sale_price'
       LEFT JOIN ${P}postmeta pm_sku   ON pm_sku.post_id   = v.ID AND pm_sku.meta_key   = '_sku'
       LEFT JOIN ${P}postmeta pm_stock ON pm_stock.post_id = v.ID AND pm_stock.meta_key = '_stock'
       LEFT JOIN ${P}postmeta pm_ss    ON pm_ss.post_id    = v.ID AND pm_ss.meta_key    = '_stock_status'
       LEFT JOIN ${P}postmeta pm_size  ON pm_size.post_id  = v.ID AND pm_size.meta_key  = 'attribute_pa_size'
       WHERE v.post_parent = ? AND v.post_type = 'product_variation'
       ORDER BY CAST(pm_size.meta_value AS UNSIGNED) ASC`,
      [id]
    );

    const [categories] = await pool.query(
      `SELECT t.term_id, t.name, t.slug
       FROM ${P}term_relationships tr
       JOIN ${P}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
       JOIN ${P}terms t ON t.term_id = tt.term_id
       WHERE tr.object_id = ? AND tt.taxonomy = 'product_cat'`,
      [id]
    );

    const thumb = meta.find((m) => m.meta_key === '_thumbnail_id');
    const galleryMeta = meta.find((m) => m.meta_key === '_product_image_gallery');
    const galleryIds = galleryMeta?.meta_value
      ? galleryMeta.meta_value.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const imageIds = [...new Set([thumb?.meta_value, ...galleryIds].filter(Boolean))];

    let images = [];
    if (imageIds.length) {
      const [atts] = await pool.query(
        `SELECT
           a.ID,
           a.post_title AS title,
           a.guid AS guid,
           f.meta_value AS file
         FROM ${P}posts a
         LEFT JOIN ${P}postmeta f ON f.post_id = a.ID AND f.meta_key = '_wp_attached_file'
         WHERE a.ID IN (${imageIds.map(() => '?').join(',')})
           AND a.post_type = 'attachment'`,
        imageIds
      );
      images = atts;
    }

    const interesting = meta.filter((m) =>
      [
        '_sku', '_price', '_regular_price', '_sale_price', '_stock', '_stock_status',
        '_weight', '_length', '_width', '_height', '_tax_status', 'total_sales',
        '_manage_stock', '_virtual', '_downloadable', '_product_attributes',
      ].includes(m.meta_key)
    );

    res.json({ ...product, variations, categories, images, thumbnail_id: thumb?.meta_value || null, galleryIds, meta: interesting });
  })
);

module.exports = router;
