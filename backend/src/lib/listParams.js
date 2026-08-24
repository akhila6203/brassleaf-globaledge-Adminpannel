function parseList(req, sortMap, defaultSort) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const requested = req.query.sort;
  const sortCol = sortMap[requested] || sortMap[defaultSort] || Object.values(sortMap)[0];
  const dir = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const search = req.query.search ? String(req.query.search).trim() : '';
  return { page, limit, offset, sortCol, dir, search };
}

function listResponse(rows, total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    data: rows,
  };
}

module.exports = { parseList, listResponse };
