// backend/src/routes/sols.js
const express = require('express');
const router = express.Router();
const solController = require('../controllers/solController');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth'); // ✅ IMPORTANT
const { body } = require('express-validator');

// Validation rules
const createSolValidation = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  body('montant_par_periode').isFloat({ min: 0 }).withMessage('Montant invalide'),
  body('frequence')
    .isIn(['hebdomadaire', 'mensuel', 'trimestriel', 'annuel'])  // ✅ CORRIGÉ : EN FRANÇAIS
    .withMessage('Fréquence invalide. Valeurs acceptées: hebdomadaire, mensuel, trimestriel, annuel')
];

const updateSolValidation = [
  body('nom').optional().trim().notEmpty(),
  body('description').optional(),
  body('statut').optional().isIn(['draft', 'active', 'completed', 'cancelled'])
];

// ========================================
// ROUTES PUBLIQUES (ou avec auth légère)
// ========================================

// Obtenir les sols disponibles à rejoindre
router.get('/available', 
  authenticateToken,
  solController.getAvailableSols
);

// ========================================
// ROUTES UTILISATEUR (authentification requise)
// ========================================

// Créer un nouveau sol
router.post('/',
  authenticateToken,
  createSolValidation,
  solController.createSol
);

// Obtenir tous mes sols
router.get('/my-sols',
  authenticateToken,
  solController.getMySols
);

// Obtenir tous les sols (admin ou filtrés)
router.get('/',
  authenticateToken,
  solController.getAllSols
);

// Obtenir un sol par ID
router.get('/:id',
  authenticateToken,
  solController.getSolById
);

// Obtenir les détails complets d'un sol
router.get('/:id/details',
  authenticateToken,
  solController.getSolDetails
);

// Rejoindre un sol
router.post('/:id/join',
  authenticateToken,
  solController.joinSol
);

// Quitter un sol
router.post('/:id/leave',
  authenticateToken,
  solController.leaveSol
);

// Mettre à jour un sol
router.put('/:id',
  authenticateToken,
  updateSolValidation,
  solController.updateSol
);

// Supprimer un sol
router.delete('/:id',
  authenticateToken,
  solController.deleteSol
);

// Obtenir les statistiques d'un sol
router.get('/:id/statistics',
  authenticateToken,
  solController.getStatistics
);

// ========================================
// GESTION DE L'ORDRE DES PARTICIPANTS
// ========================================

// Récupérer les participants avec leur ordre
router.get('/:id/participants',
  authenticateToken,
  solController.getParticipants
);

// Mettre à jour l'ordre des participants
router.put('/:id/order',
  authenticateToken,
  solController.updateParticipantsOrder
);

// Randomiser l'ordre
router.post('/:id/randomize-order',
  authenticateToken,
  solController.randomizeOrder
);

// ========================================
// DÉTECTION AUTOMATIQUE DE FIN DE TOUR
// ========================================

// Vérifier et avancer le tour si terminé
router.post('/:id/check-tour',
  authenticateToken,
  solController.checkTour
);

// Obtenir le statut du tour actuel
router.get('/:id/tour-status',
  authenticateToken,
  solController.getTourStatus
);

// Forcer le passage au tour suivant (admin)
router.post('/:id/force-advance',
  authenticateToken,
  solController.forceAdvanceTour
);

// ========================================
// GESTION DES TRANSFERTS (ADMIN)
// ========================================

// ✅ Récupérer les infos du bénéficiaire actuel
router.get('/:solId/beneficiary',
  authenticateToken, // ✅ Doit être défini
  paymentController.getBeneficiaryInfo
);

// ✅ Transférer tous les paiements d'un tour (admin)
router.post('/:solId/transfer-all',
  authenticateToken, // ✅ Doit être défini
  paymentController.transferAllPayments
);

module.exports = router;