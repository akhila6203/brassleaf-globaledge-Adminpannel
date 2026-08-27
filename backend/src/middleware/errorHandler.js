function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.stack) console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    message: err.message,
  });
}

module.exports = errorHandler;
