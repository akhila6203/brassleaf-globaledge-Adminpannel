/**
 * Upsert a single meta row (postmeta / usermeta / orders_meta style).
 */
async function upsertMeta(conn, table, idCol, id, keyCol, key, valueCol, value) {
  const [existing] = await conn.query(
    `SELECT * FROM ?? WHERE ?? = ? AND ?? = ? LIMIT 1`,
    [table, idCol, id, keyCol, key]
  );
  if (existing.length) {
    await conn.query(`UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?`, [
      table,
      valueCol,
      value == null ? '' : String(value),
      idCol,
      id,
      keyCol,
      key,
    ]);
  } else {
    await conn.query(`INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?)`, [
      table,
      idCol,
      keyCol,
      valueCol,
      id,
      key,
      value == null ? '' : String(value),
    ]);
  }
}

async function upsertPostMeta(conn, P, postId, key, value) {
  return upsertMeta(conn, `${P}postmeta`, 'post_id', postId, 'meta_key', key, 'meta_value', value);
}

async function upsertUserMeta(conn, P, userId, key, value) {
  return upsertMeta(conn, `${P}usermeta`, 'user_id', userId, 'meta_key', key, 'meta_value', value);
}

async function upsertOrderMeta(conn, P, orderId, key, value) {
  const table = `${P}wc_orders_meta`;
  const [existing] = await conn.query(
    `SELECT id FROM ?? WHERE order_id = ? AND meta_key = ? LIMIT 1`,
    [table, orderId, key]
  );
  if (existing.length) {
    await conn.query(`UPDATE ?? SET meta_value = ? WHERE id = ?`, [
      table,
      value == null ? '' : String(value),
      existing[0].id,
    ]);
  } else {
    await conn.query(`INSERT INTO ?? (order_id, meta_key, meta_value) VALUES (?, ?, ?)`, [
      table,
      orderId,
      key,
      value == null ? '' : String(value),
    ]);
  }
}

async function getPostMetaMap(connOrPool, P, postId) {
  const [rows] = await connOrPool.query(
    `SELECT meta_key, meta_value FROM ?? WHERE post_id = ?`,
    [`${P}postmeta`, postId]
  );
  const map = {};
  for (const r of rows) map[r.meta_key] = r.meta_value;
  return map;
}

async function deletePostMetaKey(conn, P, postId, key) {
  await conn.query(`DELETE FROM ?? WHERE post_id = ? AND meta_key = ?`, [`${P}postmeta`, postId, key]);
}

module.exports = {
  upsertPostMeta,
  upsertUserMeta,
  upsertOrderMeta,
  getPostMetaMap,
  deletePostMetaKey,
};
