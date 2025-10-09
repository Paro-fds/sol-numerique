const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Configuration Multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(AuthMiddleware.authenticateToken);

// POST /api/payments/stripe/create-session - Créer une session Stripe
router.post('/stripe/create-session',
  [
    body('participationId').isInt().withMessage('Participation ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required')
  ],
  ErrorHandler.asyncWrapper(paymentController.createStripeSession)
);

// POST /api/payments/upload-receipt - Upload un reçu
router.post('/upload-receipt',
  upload.single('receipt'),
  [
    body('participationId').isInt().withMessage('Participation ID is required')
  ],
  ErrorHandler.asyncWrapper(paymentController.uploadReceipt)
);

// GET /api/payments/history - Historique des paiements
router.get('/history',
  ErrorHandler.asyncWrapper(paymentController.getPaymentHistory)
);

// GET /api/payments/:id - Obtenir un paiement
router.get('/:id',
  ErrorHandler.asyncWrapper(paymentController.getPayment)
);

// GET /api/payments/:id/receipt - Télécharger un reçu
router.get('/:id/receipt',
  ErrorHandler.asyncWrapper(paymentController.downloadReceipt)
);

// POST /api/payments/webhook - Webhook Stripe (pas d'auth)
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  ErrorHandler.asyncWrapper(paymentController.handleStripeWebhook)
);

module.exports = router;