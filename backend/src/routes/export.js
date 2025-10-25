// backend/src/routes/export.js
const express = require('express');
const exportController = require('../controllers/exportController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// ✅ Toutes les routes nécessitent authentification
router.use(AuthMiddleware.authenticateToken);

/**
 * @route   GET /api/export/options
 * @desc    Obtenir les options d'export disponibles
 * @access  Private
 */
router.get('/options',
  ErrorHandler.asyncWrapper(exportController.getExportOptions)
);

/**
 * @route   GET /api/export/payments/csv
 * @desc    Exporter l'historique des paiements en CSV
 * @access  Private
 * @query   userId (admin only), solId, status, method, startDate, endDate
 */
router.get('/payments/csv',
  ErrorHandler.asyncWrapper(exportController.exportPaymentsCSV)
);

/**
 * @route   GET /api/export/payments/pdf
 * @desc    Générer un rapport PDF des paiements
 * @access  Private
 * @query   userId (admin only), solId, startDate, endDate
 */
router.get('/payments/pdf',
  ErrorHandler.asyncWrapper(exportController.exportPaymentsPDF)
);

/**
 * @route   GET /api/export/sols/:solId/participants/csv
 * @desc    Exporter les participants d'un Sol en CSV
 * @access  Private (créateur ou admin)
 */
router.get('/sols/:solId/participants/csv',
  ErrorHandler.asyncWrapper(exportController.exportSolParticipantsCSV)
);

/**
 * @route   GET /api/export/sols/:solId/monthly-report
 * @desc    Générer un rapport mensuel pour un Sol
 * @access  Private (créateur ou admin)
 * @query   month (YYYY-MM)
 */
router.get('/sols/:solId/monthly-report',
  ErrorHandler.asyncWrapper(exportController.exportMonthlyReport)
);

module.exports = router;