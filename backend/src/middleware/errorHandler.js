const logger = require('../utils/logger');

// Middleware principal de gestion des erreurs
function errorHandler(err, req, res, next) {
  // Log de l'erreur
  logger.error('API Error:', err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Erreurs de validation Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Erreurs MySQL
  if (err.code) {
    return handleDatabaseError(err, res);
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Erreurs de validation Express Validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.array()
    });
  }

  // Erreur personnalisée avec status
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'An error occurred'
    });
  }

  // Erreur générique
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && {
      message: err.message,
      stack: err.stack
    })
  });
}

// Gestion des erreurs de base de données
function handleDatabaseError(err, res) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      const field = extractDuplicateField(err.message);
      return res.status(409).json({
        error: 'Duplicate entry',
        field: field,
        message: `${field} already exists`
      });

    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'Referenced record does not exist'
      });

    case 'ECONNREFUSED':
      logger.error('Database connection refused');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database connection failed'
      });

    case 'ER_ACCESS_DENIED_ERROR':
      logger.error('Database access denied');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database access denied'
      });

    default:
      logger.error('Unknown database error:', { code: err.code, message: err.message });
      return res.status(500).json({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
  }
}

// Extraire le champ dupliqué depuis le message d'erreur MySQL
function extractDuplicateField(message) {
  const match = message.match(/for key '(\w+)'/);
  return match ? match[1] : 'unknown field';
}

// Middleware pour gérer les 404
function notFound(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
}

// Wrapper pour les fonctions async dans les routes
function asyncWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Créer une erreur personnalisée avec status
function createError(status, message, details = null) {
  const error = new Error(message);
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
}

// Middleware pour validation des paramètres d'ID
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = parseInt(req.params[paramName]);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid ID parameter',
        parameter: paramName,
        message: 'ID must be a positive integer'
      });
    }

    req.params[paramName] = id;
    next();
  };
}

// Export du middleware principal et des utilitaires
module.exports = errorHandler;
module.exports.notFound = notFound;
module.exports.asyncWrapper = asyncWrapper;
module.exports.createError = createError;
module.exports.validateIdParam = validateIdParam;