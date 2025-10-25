const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting pour l'authentification
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 15 * 60 // secondes
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting général
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many requests from this IP'
  }
});

// Validation pour l'inscription
const registerValidation = [
  body('firstname')
    .trim()
    .notEmpty()
    .withMessage('Firstname is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Firstname must be between 2 and 100 characters'),
  
  body('lastname')
    .trim()
    .notEmpty()
    .withMessage('Lastname is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Lastname must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  
  body('phone')
    .optional()
    .trim(),
  
  body('compte_bancaire')
    .optional()
    .trim()
];

// Validation pour la connexion
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('mfaToken')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('MFA token must be 6 digits')
];

// Validation pour le changement de mot de passe
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Validation pour la mise à jour du profil
const updateProfileValidation = [
  body('firstname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Firstname must be between 2 and 50 characters'),
  
  body('lastname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Lastname must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]{10,20}$/)
    .withMessage('Invalid phone number format'),
  
  body('compte_bancaire')
    .optional()
    .trim()
    .isLength({ min: 10, max: 34 })
    .withMessage('Bank account number must be between 10 and 34 characters')
];

// Routes publiques (avec rate limiting)
router.post('/register', 
  authRateLimit,
  registerValidation, 
  ErrorHandler.asyncWrapper(authController.register)
);

router.post('/login', 
  authRateLimit,
  loginValidation, 
  ErrorHandler.asyncWrapper(authController.login)
);

router.post('/refresh-token', 
  generalRateLimit,
  ErrorHandler.asyncWrapper(authController.refreshToken)
);

/**
 * @route   GET /api/auth/verify
 * @desc    Vérifier si le token JWT est valide
 * @access  Private
 * ⭐ NOUVELLE ROUTE AJOUTÉE ⭐
 */
router.get('/verify', 
  AuthMiddleware.authenticateToken,
  ErrorHandler.asyncWrapper(authController.verifyToken)
);

// Routes protégées
router.post('/logout', 
  AuthMiddleware.authenticateToken,
  ErrorHandler.asyncWrapper(authController.logout)
);

router.get('/profile', 
  AuthMiddleware.authenticateToken,
  ErrorHandler.asyncWrapper(authController.getProfile)
);

router.put('/profile', 
  AuthMiddleware.authenticateToken,
  updateProfileValidation,
  ErrorHandler.asyncWrapper(authController.updateProfile)
);

router.put('/change-password', 
  AuthMiddleware.authenticateToken,
  changePasswordValidation,
  ErrorHandler.asyncWrapper(authController.changePassword)
);

// Routes MFA
router.post('/mfa/setup', 
  AuthMiddleware.authenticateToken,
  ErrorHandler.asyncWrapper(authController.setupMFA)
);

router.post('/mfa/verify', 
  AuthMiddleware.authenticateToken,
  [
    body('token')
      .trim()
      .matches(/^\d{6}$/)
      .withMessage('MFA token must be 6 digits')
  ],
  ErrorHandler.asyncWrapper(authController.verifyMFA)
);

router.post('/mfa/disable', 
  AuthMiddleware.authenticateToken,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  ErrorHandler.asyncWrapper(authController.disableMFA)
);

// --- EXPORTATION FINALE ---
module.exports = router;