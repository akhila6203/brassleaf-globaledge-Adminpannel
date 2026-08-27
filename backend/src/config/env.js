require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  wpSiteUrl: (process.env.WP_SITE_URL || 'https://brassleaf.store/cornerstone').replace(/\/$/, ''),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brassleaf',
  },
  prefix: 'wpwd_',
};
