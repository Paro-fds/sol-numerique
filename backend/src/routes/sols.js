const express = require('express');
const { body } = require('express-validator');
const solController = require('../controllers/solController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(AuthMiddleware.authenticateToken);

// Validation pour créer un sol
const createSolValidation = [
  body('nom')
    .trim()
    .notEmpty()
    .withMessage('Sol name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Name must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description too long'),
  
  body('montant_par_periode')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  
  body('frequence')
    .isIn(['weekly', 'monthly', 'quarterly'])
    .withMessage('Invalid frequency'),
  
  body('max_participants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100')
];

// GET /api/sols - Obtenir mes sols
router.get('/', ErrorHandler.asyncWrapper(solController.getMySols));

// GET /api/sols/all - Obtenir tous les sols (admin)
router.get('/all', 
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncWrapper(solController.getAllSols)
);

// POST /api/sols - Créer un nouveau sol
router.post('/', 
  createSolValidation,
  ErrorHandler.asyncWrapper(solController.createSol)
);

// GET /api/sols/:id - Obtenir un sol par ID
router.get('/:id', 
  ErrorHandler.asyncWrapper(solController.getSolById)
);

// PUT /api/sols/:id - Mettre à jour un sol
router.put('/:id', 
  ErrorHandler.validateIdParam('id'),
  [
    body('nom').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('statut').optional().isIn(['active', 'completed', 'cancelled'])
  ],
  ErrorHandler.asyncWrapper(solController.updateSol)
);

// DELETE /api/sols/:id - Supprimer un sol
router.delete('/:id', 
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(solController.deleteSol)
);

// POST /api/sols/:id/join - Rejoindre un sol
router.post('/:id/join', 
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(solController.joinSol)
);

// POST /api/sols/:id/leave - Quitter un sol
router.post('/:id/leave', 
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(solController.leaveSol)
);

// GET /api/sols/:id/participants - Obtenir les participants
router.get('/:id/participants', 
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(solController.getParticipants)
);

// GET /api/sols/:id/statistics - Obtenir les statistiques
router.get('/:id/statistics', 
  ErrorHandler.validateIdParam('id'),
  ErrorHandler.asyncWrapper(solController.getStatistics)
);

module.exports = router;