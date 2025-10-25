// backend/src/routes/transfer.js
const express = require('express');
const transferController = require('../controllers/transferController');
const AuthMiddleware = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// ✅ Authentification requise pour toutes les routes
router.use(AuthMiddleware.authenticateToken);

/**
 * @route   POST /api/transfers/initialize/:solId
 * @desc    Initialiser les transferts pour un Sol
 * @access  Private (Créateur ou Admin)
 */
router.post('/initialize/:solId',
  ErrorHandler.asyncWrapper(transferController.initializeTransfers)
);

/**
 * @route   GET /api/transfers/sol/:solId/current
 * @desc    Obtenir le tour actif d'un Sol
 * @access  Private
 */
router.get('/sol/:solId/current',
  ErrorHandler.asyncWrapper(transferController.getCurrentTour)
);

/**
 * @route   GET /api/transfers/sol/:solId
 * @desc    Obtenir tous les transferts d'un Sol
 * @access  Private
 */
router.get('/sol/:solId',
  ErrorHandler.asyncWrapper(transferController.getTransfersBySol)
);

/**
 * @route   GET /api/transfers/pending
 * @desc    Obtenir les transferts en attente
 * @access  Private
 */
router.get('/pending',
  ErrorHandler.asyncWrapper(transferController.getPendingTransfers)
);

/**
 * @route   GET /api/transfers/my-history
 * @desc    Obtenir l'historique des transferts de l'utilisateur
 * @access  Private
 */
router.get('/my-history',
  ErrorHandler.asyncWrapper(transferController.getMyTransferHistory)
);

/**
 * @route   GET /api/transfers/stats
 * @desc    Obtenir les statistiques des transferts
 * @access  Private
 * @query   solId (optionnel)
 */
router.get('/stats',
  ErrorHandler.asyncWrapper(transferController.getTransferStats)
);

/**
 * @route   GET /api/transfers/:transferId
 * @desc    Obtenir un transfert par ID
 * @access  Private
 */
router.get('/:transferId',
  ErrorHandler.asyncWrapper(transferController.getTransferById)
);

/**
 * @route   POST /api/transfers/:transferId/mark-transferred
 * @desc    Marquer un transfert comme effectué
 * @access  Private (Créateur ou Admin)
 */
router.post('/:transferId/mark-transferred',
  ErrorHandler.asyncWrapper(transferController.markAsTransferred)
);

/**
 * @route   POST /api/transfers/:transferId/confirm-receipt
 * @desc    Confirmer la réception d'un transfert
 * @access  Private (Bénéficiaire uniquement)
 */
router.post('/:transferId/confirm-receipt',
  ErrorHandler.asyncWrapper(transferController.confirmReceipt)
);

/**
 * @route   POST /api/transfers/:transferId/dispute
 * @desc    Signaler un litige sur un transfert
 * @access  Private (Bénéficiaire uniquement)
 */
router.post('/:transferId/dispute',
  ErrorHandler.asyncWrapper(transferController.markAsDisputed)
);
// Récupérer les paiements en attente de transfert (admin)
router.get('/pending',
  authenticateToken,
  paymentController.getPendingTransfers
);

// Marquer un paiement comme transféré (admin)
router.post('/:id/mark-transferred',
  authenticateToken,
  paymentController.markAsTransferred
);
module.exports = router;