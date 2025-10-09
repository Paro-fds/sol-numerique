const winston = require('winston');

class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'sol-api',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Ajouter fichiers de log en production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }));
      this.logger.add(new winston.transports.File({ 
        filename: 'logs/combined.log' 
      }));
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : {};

    this.logger.error(message, {
      ...meta,
      ...errorMeta,
      timestamp: new Date().toISOString()
    });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  // Logs d'audit pour les actions sensibles
  audit(action, userId, details = {}) {
    this.logger.info('AUDIT_LOG', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    });
  }

  // Logs de sécurité
  security(event, details = {}) {
    this.logger.warn('SECURITY_EVENT', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new Logger();