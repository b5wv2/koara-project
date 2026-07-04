const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables early
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// STRICT SECURITY CHECK
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is not configured.');
  console.error('The application requires JWT_SECRET to start securely. Generating a fallback secret is disabled.');
  process.exit(1);
}

const initializeDatabase = require('./config/initDb');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const storeRoutes = require('./routes/store');
const merchantRoutes = require('./routes/merchant');
const catalogRoutes = require('./routes/catalog');
const merchantProductRoutes = require('./routes/merchantProducts');
const merchantTopupsRoutes = require('./routes/merchantTopups');
const storeTopupsRoutes = require('./routes/storeTopups');
const paymentRoutes = require('./routes/payments');
const localPaymentRoutes = require('./routes/localPayment');
const topupSyncService = require('./services/topupSyncService');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
const allowedOrigins = [
  'https://www.getkoara.com',
  'https://getkoara.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/merchant/products', merchantProductRoutes);
app.use('/api/merchant/topups', merchantTopupsRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/admin/catalog', catalogRoutes);
app.use('/api/store/topups', storeTopupsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/local', localPaymentRoutes);

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
    
    // Start background sync
    topupSyncService.start();

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
