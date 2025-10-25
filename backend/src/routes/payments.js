const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configuration multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// ========================================
// ROUTES SPÉCIFIQUES EN PREMIER
// ========================================

// Webhook Stripe (SANS authentification)
router.post('/stripe/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleStripeWebhook
);

// ========================================
// ROUTES AUTHENTIFIÉES
// ========================================

// Créer une session Stripe
router.post('/create-stripe-session',
  authenticateToken,
  paymentController.createStripeSession
);

// Upload d'un reçu
router.post('/upload-receipt',
  authenticateToken,
  upload.single('receipt'),
  paymentController.uploadReceipt
);

// Historique des paiements
router.get('/history',
  authenticateToken,
  paymentController.getPaymentHistory
);

// ========================================
// ROUTES ADMIN (AVANT /:id)
// ========================================

// Obtenir les reçus en attente de validation
router.get('/pending-receipts',
  authenticateToken,
  paymentController.getPendingReceipts
);

// ✅ Obtenir les paiements validés en attente de transfert
router.get('/pending-transfers',
  authenticateToken,
  paymentController.getPendingTransfers
);

// ========================================
// ROUTES AVEC PARAMÈTRES :id (EN DERNIER)
// ========================================

// Obtenir l'URL d'un reçu
router.get('/:id/receipt-url',
  authenticateToken,
  paymentController.getReceiptUrl
);

// Télécharger un reçu
router.get('/:id/receipt',
  authenticateToken,
  paymentController.downloadReceipt
);

// Valider un paiement (admin)
router.post('/:id/validate',
  authenticateToken,
  paymentController.validatePayment
);

// Rejeter un paiement (admin)
router.post('/:id/reject',
  authenticateToken,
  paymentController.rejectPayment
);

// ✅ Marquer un paiement comme transféré (admin)
router.post('/:id/mark-transferred',
  authenticateToken,
  paymentController.markAsTransferred
);

// Obtenir un paiement spécifique
router.get('/:id',
  authenticateToken,
  paymentController.getPayment
);
// Transférer tous les paiements d'un Sol (admin)
router.post('/sols/:solId/transfer-all',
  authenticateToken,
  paymentController.transferAllPayments
);
module.exports = router;