const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware et utilitaires
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const solRoutes = require('./routes/sols');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const exportRoutes = require('./routes/export'); 
//const transferRoutes = require('./routes/transfer');  // ⭐ AJOUTER CETTE LIGNE
const userRoutes = require('./routes/users');

const app = express();

// Trust proxy (pour les reverse proxies)
app.set('trust proxy', 1);

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  },
  name: 'sol.sid'
}));

// Sécurité avec Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Configuration CORS
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requêtes par IP
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ⚠️ CRITIQUE: Webhook Stripe AVANT express.json()
// Le webhook nécessite express.raw() et ne doit pas utiliser express.json()
app.post('/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const paymentController = require('./controllers/paymentController');
      await paymentController.handleStripeWebhook(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Parsing du body (APRÈS le webhook)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test de connexion à la base de données
app.get('/health/db', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.executeQuery('SELECT 1 as test');
    
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Sol Numérique API',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'API pour la gestion de sols numériques',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      sols: '/api/sols',
      payments: '/api/payments',
      admin: '/api/admin',
      health: '/health',
      'health-db': '/health/db'
    },
    status: 'Running'
  });
});

// ✅ Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sols', solRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/tours', require('./routes/tours')); // ✅ AJOUTER
//app.use('/api/transfers', transferRoutes);  // ⭐ AJOUTER CETTE LIGNE
app.use('/api/transfers', require('./routes/transfer'));
app.use('/api/users', userRoutes);
logger.info('✅ All routes loaded successfully');

// Route pour servir les fichiers uploadés (en développement)
if (process.env.NODE_ENV === 'development') {
  const path = require('path');
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsPath));
  logger.info(`✅ Uploads directory: ${uploadsPath}`);
}

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Gestionnaire d'erreurs global (doit être en dernier)
app.use((err, req, res, next) => {
  logger.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;