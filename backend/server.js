require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port || 4000;

app.listen(PORT, () => {
  console.log(`Brassleaf Admin API listening on http://localhost:${PORT}`);
  console.log(`WP site URL: ${env.wpSiteUrl}`);
});
