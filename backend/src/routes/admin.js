// backend/src/routes/admin.js
const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Toutes les routes nécessitent l'authentification ET le rôle admin
router.use(AuthMiddleware.authenticateToken);
router.use(AuthMiddleware.requireAdmin);

// ========================================
// DASHBOARD
// ========================================

router.get('/dashboard',
  ErrorHandler.asyncWrapper(adminController.getDashboardStats)
);
// Dashboard stats
router.get('/dashboard',
  ErrorHandler.asyncWrapper(adminController.getDashboardStats)
);

// ✅ AJOUTER CETTE ROUTE (alias pour compatibilité)
router.get('/dashboard-stats',
  ErrorHandler.asyncWrapper(adminController.getDashboardStats)
);
// GET /api/admin/payments - Récupérer tous les paiements
router.get('/payments',
  ErrorHandler.asyncWrapper(adminController.getAllPayments)
);
// ========================================
// REÇUS
// ========================================

router.get('/receipts/pending',
  ErrorHandler.asyncWrapper(adminController.getPendingReceipts)
);

router.post('/receipts/:id/validate',
  [
    body('status').isIn(['validated', 'rejected']).withMessage('Invalid status'),
    body('notes').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.validateReceipt)
);

// ✅ NOUVEAU - Générer et envoyer un reçu PDF
router.post('/receipts/generate-receipt',
  [
    body('paymentId').isInt().withMessage('Payment ID must be an integer')
  ],
  ErrorHandler.asyncWrapper(adminController.generateAndSendReceipt)
);

// ========================================
// VIREMENTS
// ========================================

router.get('/transfers/pending',
  ErrorHandler.asyncWrapper(adminController.getTransferRequests)
);

router.post('/transfers/:id/complete',
  [
    body('notes').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.markTransferCompleted)
);
// ========================================
// ✅ AJOUTER CES ROUTES DANS admin.js
// ========================================
// À placer APRÈS les routes VIREMENTS (ligne 48) et AVANT GESTION DES UTILISATEURS

// ========================================
// VALIDATION DES PAIEMENTS
// ========================================

// PUT /api/admin/payments/:id/validate - Valider un paiement
router.put('/payments/:id/validate',
  ErrorHandler.validateIdParam('id'),
  [
    body('notes').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.validatePayment)
);

// PUT /api/admin/payments/:id/reject - Rejeter un paiement
router.put('/payments/:id/reject',
  ErrorHandler.validateIdParam('id'),
  [
    body('notes').isString().withMessage('Notes requises pour le rejet')
  ],
  ErrorHandler.asyncWrapper(adminController.rejectPayment)
);
// ========================================
// ✅ GESTION DES UTILISATEURS (NOUVELLES ROUTES)
// ========================================

// GET /api/admin/users - Liste des utilisateurs
router.get('/users',
  ErrorHandler.asyncWrapper(adminController.getUsers)
);

// GET /api/admin/users/stats - Statistiques utilisateurs
router.get('/users/stats',
  ErrorHandler.asyncWrapper(adminController.getUsersStats)
);

// GET /api/admin/users/:id - Détails d'un utilisateur
router.get('/users/:id',
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(adminController.getUserById)
);

// POST /api/admin/users - Créer un utilisateur
router.post('/users',
  [
    body('firstname').trim().notEmpty().withMessage('Prénom requis'),
    body('lastname').trim().notEmpty().withMessage('Nom requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe min 8 caractères'),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'member']).withMessage('Rôle invalide'),
    body('compte_bancaire').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.createUser)
);

// PUT /api/admin/users/:id - Mettre à jour un utilisateur
router.put('/users/:id',
  ErrorHandler.validateIdParam('id'),
  [
    body('firstname').optional().trim().notEmpty(),
    body('lastname').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'member']),
    body('password').optional().isLength({ min: 8 }),
    body('compte_bancaire').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.updateUser)
);

// PATCH /api/admin/users/:id/status - Changer le statut
router.patch('/users/:id/status',
  ErrorHandler.validateIdParam('id'),
  [
    body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
  ],
  ErrorHandler.asyncWrapper(adminController.updateUserStatus)
);

// DELETE /api/admin/users/:id - Supprimer un utilisateur
router.delete('/users/:id',
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(adminController.deleteUser)
);

// ========================================
// RAPPORTS
// ========================================

router.get('/reports',
  ErrorHandler.asyncWrapper(adminController.getReports)
);

router.get('/reports/export/:format',
  ErrorHandler.asyncWrapper(adminController.exportReport)
);

module.exports = router;