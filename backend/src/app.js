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

// Parsing du body
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
      health: '/health',
      'health-db': '/health/db'
    },
    status: 'Running'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sols', require('./routes/sols'));  // ← Ajoutez cette ligne
app.use('/api/payments', require('./routes/payments')); 
app.use('/api/admin', require('./routes/admin')); 

// Route pour servir les fichiers uploadés (en développement)
if (process.env.NODE_ENV === 'development') {
  const path = require('path');
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsPath));
}

// Middleware pour les routes non trouvées
app.use('*', errorHandler.notFound);

// Gestionnaire d'erreurs global (doit être en dernier)
app.use(errorHandler);

module.exports = app;