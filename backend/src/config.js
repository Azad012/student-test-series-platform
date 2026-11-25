const path = require('path');

module.exports = {
  PORT: Number(process.env.PORT || 4000),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-test-series-secret-change-in-prod',
  JWT_EXPIRES_IN: '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'),
};
