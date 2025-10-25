// backend/src/controllers/transferController.js
const Transfer = require('../models/Transfer');
const transferService = require('../services/transferService');
const logger = require('../utils/logger');

class TransferController {

  /**
   * Initialiser les transferts pour un Sol
   * @route POST /api/transfers/initialize/:solId
   */
  async initializeTransfers(req, res, next) {
    try {
      const { solId } = req.params;
      const userId = req.user.id || req.user.userId;

      logger.info('🔄 Initialisation transferts', { solId, userId });

      // TODO: Vérifier que l'utilisateur est créateur ou admin
      
      const transfers = await transferService.initializeTransfersForSol(solId);

      res.json({
        success: true,
        message: 'Transferts initialisés avec succès',
        count: transfers.length,
        transfers: transfers.map(t => t.toJSON())
      });

    } catch (error) {
      logger.error('❌ Erreur initialisation transferts:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'initialisation des transferts'
      });
    }
  }

  /**
   * Obtenir le tour actif d'un Sol
   * @route GET /api/transfers/sol/:solId/current
   */
  async getCurrentTour(req, res, next) {
    try {
      const { solId } = req.params;

      logger.info('📋 Récupération tour actif', { solId });

      const currentTour = await transferService.getCurrentTour(solId);

      if (!currentTour) {
        return res.json({
          success: true,
          currentTour: null,
          message: 'Aucun tour actif'
        });
      }

      res.json({
        success: true,
        currentTour
      });

    } catch (error) {
      logger.error('❌ Erreur tour actif:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du tour actif'
      });
    }
  }

  /**
   * Obtenir tous les transferts d'un Sol
   * @route GET /api/transfers/sol/:solId
   */
  async getTransfersBySol(req, res, next) {
    try {
      const { solId } = req.params;

      logger.info('📋 Récupération transferts Sol', { solId });

      const transfers = await Transfer.findBySolId(solId);

      res.json({
        success: true,
        count: transfers.length,
        transfers: transfers.map(t => t.toJSON())
      });

    } catch (error) {
      logger.error('❌ Erreur transferts Sol:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des transferts'
      });
    }
  }

  /**
   * Obtenir les transferts en attente
   * @route GET /api/transfers/pending
   */
  async getPendingTransfers(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const isAdmin = req.user.role === 'admin';

      logger.info('📋 Récupération transferts en attente', { userId, isAdmin });

      let transfers = await Transfer.findPending();

      // Si pas admin, filtrer pour voir seulement ceux où il est bénéficiaire
      // TODO: Ajouter aussi les Sols où il est créateur une fois qu'on aura cette info
      if (!isAdmin) {
        transfers = transfers.filter(t => 
          t.receiver_id === userId
        );
      }

      res.json({
        success: true,
        count: transfers.length,
        transfers: transfers.map(t => t.toJSON())
      });

    } catch (error) {
      logger.error('❌ Erreur transferts en attente:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des transferts en attente'
      });
    }
  }

  /**
   * Obtenir l'historique des transferts de l'utilisateur
   * @route GET /api/transfers/my-history
   */
  async getMyTransferHistory(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;

      logger.info('📋 Historique transferts utilisateur', { userId });

      const history = await transferService.getUserTransferHistory(userId);

      res.json({
        success: true,
        received: {
          count: history.received.length,
          transfers: history.received
        },
        participated: {
          count: history.participated.length,
          transfers: history.participated
        }
      });

    } catch (error) {
      logger.error('❌ Erreur historique transferts:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }

  /**
   * Marquer un transfert comme effectué
   * @route POST /api/transfers/:transferId/mark-transferred
   */
  async markAsTransferred(req, res, next) {
    try {
      const { transferId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id || req.user.userId;

      logger.info('📤 Marquage transfert effectué', { transferId, userId });

      // TODO: Vérifier que l'utilisateur est créateur du Sol ou admin

      const transfer = await transferService.markTransferAsCompleted(
        transferId,
        userId,
        notes
      );

      res.json({
        success: true,
        message: 'Transfert marqué comme effectué',
        transfer: transfer.toJSON()
      });

    } catch (error) {
      logger.error('❌ Erreur marquage transfert:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors du marquage du transfert'
      });
    }
  }

  /**
   * Confirmer la réception d'un transfert
   * @route POST /api/transfers/:transferId/confirm-receipt
   */
  async confirmReceipt(req, res, next) {
    try {
      const { transferId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id || req.user.userId;

      logger.info('✅ Confirmation réception', { transferId, userId });

      const transfer = await transferService.confirmTransferReceipt(
        transferId,
        userId,
        notes
      );

      res.json({
        success: true,
        message: 'Réception confirmée avec succès',
        transfer: transfer.toJSON()
      });

    } catch (error) {
      logger.error('❌ Erreur confirmation réception:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la confirmation'
      });
    }
  }

  /**
   * Marquer un transfert comme litigieux
   * @route POST /api/transfers/:transferId/dispute
   */
  async markAsDisputed(req, res, next) {
    try {
      const { transferId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id || req.user.userId;

      if (!notes) {
        return res.status(400).json({
          success: false,
          error: 'Les notes sont requises pour signaler un litige'
        });
      }

      logger.info('⚠️ Marquage litige', { transferId, userId });

      const transfer = await Transfer.findById(transferId);

      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: 'Transfert non trouvé'
        });
      }

      // Vérifier que l'utilisateur est le bénéficiaire
      if (transfer.receiver_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Vous n\'êtes pas autorisé à signaler ce litige'
        });
      }

      await transfer.markAsDisputed(notes);

      res.json({
        success: true,
        message: 'Litige signalé. Un administrateur va intervenir.',
        transfer: transfer.toJSON()
      });

    } catch (error) {
      logger.error('❌ Erreur marquage litige:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du signalement du litige'
      });
    }
  }

  /**
   * Obtenir les statistiques des transferts
   * @route GET /api/transfers/stats
   */
  async getTransferStats(req, res, next) {
    try {
      const { solId } = req.query;

      logger.info('📊 Récupération stats transferts', { solId });

      const stats = await transferService.getTransferStats(solId || null);

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('❌ Erreur stats transferts:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Obtenir un transfert par ID
   * @route GET /api/transfers/:transferId
   */
  async getTransferById(req, res, next) {
    try {
      const { transferId } = req.params;

      logger.info('📋 Récupération transfert', { transferId });

      const transfer = await Transfer.findById(transferId);

      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: 'Transfert non trouvé'
        });
      }

      res.json({
        success: true,
        transfer: transfer.toJSON()
      });

    } catch (error) {
      logger.error('❌ Erreur récupération transfert:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du transfert'
      });
    }
  }
}

module.exports = new TransferController();