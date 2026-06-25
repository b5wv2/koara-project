const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables early
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const initializeDatabase = require('./config/initDb');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const storeRoutes = require('./routes/store');
const merchantRoutes = require('./routes/merchant');
const catalogRoutes = require('./routes/catalog');
const merchantProductRoutes = require('./routes/merchantProducts');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/admin/catalog', catalogRoutes);
app.use('/api/merchant/products', merchantProductRoutes);

// API Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'koara-backend-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Bootstrap application database tables and start listening
const bootstrap = async () => {
  try {
    // Automatically check DDL tables on launch
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`-----------------------------------------------`);
      console.log(`Koara Backend Service listening on port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
      console.log(`-----------------------------------------------`);
    });
  } catch (error) {
    console.error('CRITICAL: Server boot failed during database initialization!');
    console.error(error.message);
    process.exit(1);
  }
};

bootstrap();
