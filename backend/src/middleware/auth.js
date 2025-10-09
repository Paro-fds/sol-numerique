const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { ERROR_MESSAGES, USER_ROLES } = require('../utils/constants');

class AuthMiddleware {
  
  // Vérification du token JWT
  static async authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
          message: 'Access token is required'
        });
      }

      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Récupérer l'utilisateur
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        logger.security('INVALID_TOKEN_USER_NOT_FOUND', {
          userId: decoded.userId,
          ip: req.ip
        });

        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
          message: 'Invalid or expired token'
        });
      }

      // Ajouter les infos utilisateur à la requête
      req.user = {
        id: user.id,
        userId: user.id, // Compatibilité
        email: user.email,
        role: user.role,
        firstname: user.firstname,
        lastname: user.lastname
      };

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        logger.security('INVALID_JWT_TOKEN', {
          error: error.message,
          ip: req.ip
        });

        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
          message: 'Invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED,
          message: 'Token expired'
        });
      }

      logger.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed'
      });
    }
  }

  // Middleware pour vérifier le rôle admin
  static requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: ERROR_MESSAGES.UNAUTHORIZED
      });
    }

    if (req.user.role !== USER_ROLES.ADMIN) {
      logger.security('UNAUTHORIZED_ADMIN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        error: ERROR_MESSAGES.FORBIDDEN,
        message: 'Admin access required'
      });
    }

    next();
  }

  // Middleware pour vérifier si l'utilisateur peut accéder à ses propres ressources
  static requireOwnershipOrAdmin(paramName = 'userId') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED
        });
      }

      const resourceUserId = parseInt(req.params[paramName]);
      const currentUserId = req.user.id;
      const isAdmin = req.user.role === USER_ROLES.ADMIN;

      if (!isAdmin && resourceUserId !== currentUserId) {
        logger.security('UNAUTHORIZED_RESOURCE_ACCESS', {
          userId: currentUserId,
          requestedUserId: resourceUserId,
          resource: req.path,
          ip: req.ip
        });

        return res.status(403).json({
          error: ERROR_MESSAGES.FORBIDDEN,
          message: 'Access denied to this resource'
        });
      }

      next();
    };
  }

  // Middleware optionnel - n'échoue pas si pas de token
  static optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.userId,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      // Ignorer les erreurs de token en mode optionnel
      logger.debug('Optional auth failed:', error.message);
    }

    next();
  }

  // Middleware pour vérifier la propriété d'un sol
  static async requireSolOwnership(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED
        });
      }

      const solId = parseInt(req.params.solId || req.params.id);
      if (!solId) {
        return res.status(400).json({
          error: 'Sol ID is required'
        });
      }

      const Sol = require('../models/Sol');
      const sol = await Sol.findById(solId);

      if (!sol) {
        return res.status(404).json({
          error: ERROR_MESSAGES.SOL_NOT_FOUND
        });
      }

      const isOwner = sol.created_by === req.user.id;
      const isAdmin = req.user.role === USER_ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        logger.security('UNAUTHORIZED_SOL_ACCESS', {
          userId: req.user.id,
          solId: solId,
          ownerId: sol.created_by,
          ip: req.ip
        });

        return res.status(403).json({
          error: ERROR_MESSAGES.FORBIDDEN,
          message: 'Sol ownership or admin access required'
        });
      }

      req.sol = sol;
      next();
    } catch (error) {
      logger.error('Sol ownership check error:', error);
      return res.status(500).json({
        error: 'Authorization check failed'
      });
    }
  }

  // Middleware pour vérifier la participation à un sol
  static async requireSolParticipation(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: ERROR_MESSAGES.UNAUTHORIZED
        });
      }

      const solId = parseInt(req.params.solId || req.params.id);
      const db = require('../config/database');

      const participation = await db.executeQuery(
        'SELECT * FROM participations WHERE sol_id = ? AND user_id = ?',
        [solId, req.user.id]
      );

      const isAdmin = req.user.role === USER_ROLES.ADMIN;

      if (participation.length === 0 && !isAdmin) {
        return res.status(403).json({
          error: ERROR_MESSAGES.FORBIDDEN,
          message: 'Sol participation required'
        });
      }

      req.participation = participation[0] || null;
      next();
    } catch (error) {
      logger.error('Sol participation check error:', error);
      return res.status(500).json({
        error: 'Participation check failed'
      });
    }
  }

  // Rate limiting par utilisateur
  static userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!requests.has(userId)) {
        requests.set(userId, []);
      }

      const userRequests = requests.get(userId);
      
      // Nettoyer les anciennes requêtes
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(userId, validRequests);

      if (validRequests.length >= maxRequests) {
        logger.security('USER_RATE_LIMIT_EXCEEDED', {
          userId: userId,
          requestCount: validRequests.length,
          limit: maxRequests,
          ip: req.ip
        });

        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      validRequests.push(now);
      requests.set(userId, validRequests);
      
      next();
    };
  }
}

module.exports = AuthMiddleware;