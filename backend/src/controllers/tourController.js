// backend/src/controllers/tourController.js
const db = require('../config/database');
const tourService = require('../services/TourDetectionService');
const logger = require('../utils/logger');

class TourController {
  
  /**
   * Démarrer un tour
   * POST /api/tours/start
   */
  async startTour(req, res, next) {
    try {
      const { solId, dateDebut } = req.body;
      const userId = req.user.userId || req.user.id;

      logger.info('🚀 Starting tour', { solId, dateDebut, userId });

      // Vérifier que l'utilisateur est admin ou créateur du Sol
      const solQuery = `
        SELECT created_by, statut 
        FROM sols 
        WHERE id = ?
      `;
      const sols = await db.executeQuery(solQuery, [solId]);

      if (sols.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sol non trouvé'
        });
      }

      const sol = sols[0];

      if (req.user.role !== 'admin' && sol.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul le créateur ou un admin peut démarrer un tour'
        });
      }

      // Démarrer le tour
      await tourService.startTour(solId, dateDebut ? new Date(dateDebut) : new Date());

      // Récupérer le Sol mis à jour
      const updatedSol = await db.executeQuery(
        'SELECT * FROM sols WHERE id = ?',
        [solId]
      );

      res.json({
        success: true,
        message: 'Tour démarré avec succès',
        sol: updatedSol[0]
      });

    } catch (error) {
      logger.error('❌ Start tour error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du démarrage du tour'
      });
    }
  }

  /**
   * Terminer le tour actuel
   * POST /api/tours/complete
   */
  async completeTour(req, res, next) {
    try {
      const { solId } = req.body;
      const userId = req.user.userId || req.user.id;

      logger.info('✅ Completing tour', { solId, userId });

      // Vérifier les permissions
      const solQuery = `
        SELECT created_by, tour_actuel 
        FROM sols 
        WHERE id = ?
      `;
      const sols = await db.executeQuery(solQuery, [solId]);

      if (sols.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sol non trouvé'
        });
      }

      const sol = sols[0];

      if (req.user.role !== 'admin' && sol.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul le créateur ou un admin peut terminer un tour'
        });
      }

      // Vérifier que tous les paiements sont transférés
      const allTransferred = await tourService.areAllPaymentsTransferred(
        solId,
        sol.tour_actuel
      );

      if (!allTransferred) {
        return res.status(400).json({
          success: false,
          error: 'Tous les paiements doivent être transférés avant de terminer le tour'
        });
      }

      // Terminer le tour
      await tourService.completeTour(solId);

      res.json({
        success: true,
        message: 'Tour terminé avec succès'
      });

    } catch (error) {
      logger.error('❌ Complete tour error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la finalisation du tour'
      });
    }
  }

  /**
   * Passer au tour suivant
   * POST /api/tours/next
   */
  async nextTour(req, res, next) {
    try {
      const { solId } = req.body;
      const userId = req.user.userId || req.user.id;

      logger.info('➡️ Moving to next tour', { solId, userId });

      // Terminer le tour actuel
      await this.completeTour(req, res, () => {});

      // Démarrer le nouveau tour
      await tourService.startTour(solId);

      res.json({
        success: true,
        message: 'Passage au tour suivant effectué'
      });

    } catch (error) {
      logger.error('❌ Next tour error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du passage au tour suivant'
      });
    }
  }
}

module.exports = new TourController();