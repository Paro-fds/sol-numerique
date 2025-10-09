const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Toutes les routes nécessitent l'authentification ET le rôle admin
router.use(AuthMiddleware.authenticateToken);
router.use(AuthMiddleware.requireAdmin);

// Dashboard
router.get('/dashboard',
  ErrorHandler.asyncWrapper(adminController.getDashboardStats)
);

// Reçus
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

// Virements
router.get('/transfers/pending',
  ErrorHandler.asyncWrapper(adminController.getTransferRequests)
);

router.post('/transfers/:id/complete',
  [
    body('notes').optional().trim()
  ],
  ErrorHandler.asyncWrapper(adminController.markTransferCompleted)
);

// Utilisateurs
router.get('/users',
  ErrorHandler.asyncWrapper(adminController.getUsers)
);

router.put('/users/:id/status',
  [
    body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
  ],
  ErrorHandler.asyncWrapper(adminController.updateUserStatus)
);

// Rapports
router.get('/reports',
  ErrorHandler.asyncWrapper(adminController.getReports)
);

router.get('/reports/export/:format',
  ErrorHandler.asyncWrapper(adminController.exportReport)
);

module.exports = router;