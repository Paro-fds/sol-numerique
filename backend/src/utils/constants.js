// Rôles utilisateur
const USER_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin'
};

// Statuts des sols
const SOL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Statuts des tours
const TOUR_STATUS = {
  EN_ATTENTE: 'en_attente',
  PAYE: 'paye',
  VALIDE: 'valide',
  COMPLETE: 'complete'
};

// Méthodes de paiement
const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  OFFLINE: 'offline'
};

// Statuts des paiements
const PAYMENT_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

// Fréquences des sols
const SOL_FREQUENCIES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
};

// Types de fichiers autorisés
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf']
};

// Tailles de fichier
const FILE_SIZE_LIMITS = {
  MAX_RECEIPT_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_AVATAR_SIZE: 2 * 1024 * 1024   // 2MB
};

// Messages d'erreur
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden',
  VALIDATION_FAILED: 'Validation failed',
  DATABASE_ERROR: 'Database error occurred',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  SOL_NOT_FOUND: 'Sol not found',
  PARTICIPATION_EXISTS: 'User already participating',
  SOL_FULL: 'Sol is full',
  PAYMENT_NOT_FOUND: 'Payment not found',
  MFA_REQUIRED: 'MFA token required',
  INVALID_MFA: 'Invalid MFA token'
};

// Configuration MFA
const MFA_CONFIG = {
  WINDOW: 2,
  ISSUER: process.env.MFA_ISSUER || 'Sol Numérique',
  SECRET_LENGTH: 20
};

// Configuration JWT
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: process.env.JWT_EXPIRY || '24h',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d'
};

// Rate limiting
const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5 // login attempts
  },
  UPLOAD: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10 // file uploads
  }
};

module.exports = {
  USER_ROLES,
  SOL_STATUS,
  TOUR_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SOL_FREQUENCIES,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  ERROR_MESSAGES,
  MFA_CONFIG,
  JWT_CONFIG,
  RATE_LIMITS
};