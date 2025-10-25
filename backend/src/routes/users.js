// backend/src/routes/users.js
const express = require('express');
const userController = require('../controllers/userController');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(AuthMiddleware.authenticateToken);

// GET /api/users/me - Profil utilisateur
router.get('/me', 
  ErrorHandler.asyncWrapper(userController.getProfile)
);

// PUT /api/users/me - Mettre à jour le profil
router.put('/me', 
  ErrorHandler.asyncWrapper(userController.updateProfile)
);

// PUT /api/users/me/bank - Mettre à jour le compte bancaire
router.put('/me/bank', 
  ErrorHandler.asyncWrapper(userController.updateBankAccount)
);

// PUT /api/users/me/password - Changer le mot de passe
router.put('/me/password', 
  ErrorHandler.asyncWrapper(userController.changePassword)
);

// GET /api/users/me/stats - Statistiques utilisateur
router.get('/me/stats', 
  ErrorHandler.asyncWrapper(userController.getUserStats)
);

module.exports = router;