const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const testsRoutes = require('./routes/tests');
const attemptsRoutes = require('./routes/attempts');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/tests', testsRoutes);
  app.use('/api/attempts', attemptsRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
