const config = require('./config');
const { getDb } = require('./db');
const { createApp } = require('./app');
const { ensureSeedData } = require('./seed');

const db = getDb();
ensureSeedData(db);

const app = createApp();
app.listen(config.PORT, () => {
  console.log(`Test Series API listening on http://localhost:${config.PORT}`);
});
