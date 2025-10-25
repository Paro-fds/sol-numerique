// backend/src/services/transferService.js
const Transfer = require('../models/Transfer');
const db = require('../config/database');
const logger = require('../utils/logger');

class TransferService {

  /**
   * Obtenir l'historique des transferts d'un utilisateur
   */
  async getUserTransferHistory(userId) {
    try {
      logger.info('📋 Récupération historique transferts', { userId });

      // Transferts reçus
      const received = await Transfer.findByReceiverId(userId);

      // Transferts où l'utilisateur a participé (payé)
      const participatedQuery = `
        SELECT DISTINCT t.*, s.nom as sol_name
        FROM transfers t
        JOIN sols s ON t.sol_id = s.id
        JOIN participations part ON part.sol_id = s.id
        WHERE part.user_id = ?
          AND t.receiver_id != ?
        ORDER BY t.created_at DESC
      `;
      const participated = await db.executeQuery(participatedQuery, [userId, userId]);

      return {
        received: received.map(t => t.toJSON()),
        participated: participated.map(t => new Transfer(t).toJSON())
      };

    } catch (error) {
      logger.error('❌ Erreur historique transferts:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des transferts
   */
  async getTransferStats(solId = null) {
    try {
      logger.info('📊 Récupération stats transferts', { solId });

      let query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'transferring' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
        FROM transfers
      `;

      const params = [];
      if (solId) {
        query += ' WHERE sol_id = ?';
        params.push(solId);
      }

      const result = await db.executeQuery(query, params);
      
      return {
        total: parseInt(result[0].total) || 0,
        completed: parseInt(result[0].completed) || 0,
        in_progress: parseInt(result[0].in_progress) || 0,
        ready: parseInt(result[0].ready) || 0,
        pending: parseInt(result[0].pending) || 0,
        total_amount: parseFloat(result[0].total_amount) || 0
      };

    } catch (error) {
      logger.error('❌ Erreur stats transferts:', error);
      throw error;
    }
  }

  /**
   * Initialiser les transferts pour un Sol
   */
  async initializeTransfersForSol(solId) {
    try {
      logger.info('🔄 Initialisation des transferts', { solId });

      // Récupérer les infos du Sol
      const solQuery = 'SELECT * FROM sols WHERE id = ?';
      const sols = await db.executeQuery(solQuery, [solId]);
      
      if (sols.length === 0) {
        throw new Error('Sol non trouvé');
      }

      const sol = sols[0];

      // Récupérer tous les participants ordonnés
      const participantsQuery = `
        SELECT part.*, u.email, u.firstname, u.lastname
        FROM participations part
        JOIN users u ON part.user_id = u.id
        WHERE part.sol_id = ?
        ORDER BY part.ordre ASC
      `;
      const participants = await db.executeQuery(participantsQuery, [solId]);

      if (participants.length === 0) {
        throw new Error('Aucun participant trouvé');
      }

      // Créer un transfert pour chaque tour
      const transfers = [];
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const tourNumber = i + 1;

        // Vérifier si le transfert existe déjà
        const existingQuery = `
          SELECT id FROM transfers 
          WHERE sol_id = ? AND tour_number = ?
        `;
        const existing = await db.executeQuery(existingQuery, [solId, tourNumber]);

        if (existing.length === 0) {
          const transfer = await Transfer.create({
            sol_id: solId,
            tour_number: tourNumber,
            receiver_id: participant.user_id,
            amount: sol.montant_par_periode * (participants.length - 1),
            status: tourNumber === 1 ? 'pending' : 'pending'
          });

          transfers.push(transfer);

          logger.info('✅ Transfer créé', {
            solId,
            tourNumber,
            receiverId: participant.user_id
          });
        }
      }

      logger.info('✅ Tous les transferts initialisés', {
        solId,
        count: transfers.length
      });

      return transfers;

    } catch (error) {
      logger.error('❌ Erreur initialisation transferts:', error);
      throw error;
    }
  }
}

module.exports = new TransferService();