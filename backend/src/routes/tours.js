// backend/src/routes/tours.js
const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const { authenticateToken } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

/**
 * @route   POST /api/tours/start
 * @desc    Démarrer un tour
 * @access  Private (Créateur ou Admin)
 */
router.post('/start', tourController.startTour);

/**
 * @route   POST /api/tours/complete
 * @desc    Terminer le tour actuel
 * @access  Private (Créateur ou Admin)
 */
router.post('/complete', tourController.completeTour);

/**
 * @route   POST /api/tours/next
 * @desc    Passer au tour suivant
 * @access  Private (Créateur ou Admin)
 */
router.post('/next', tourController.nextTour);

module.exports = router;