const db = require('../config/database');
const logger = require('../utils/logger');
const Sol = require('../models/Sol');

class TourDetectionService {

  /**
   * Vérifier si un tour est terminé et passer au suivant
   */
  async checkAndAdvanceTour(solId) {
    try {
      const sol = await Sol.findById(solId);
      
      if (!sol) {
        throw new Error('Sol non trouvé');
      }

      if (sol.statut !== 'active') {
        return {
          success: false,
          message: 'Le Sol n\'est pas actif'
        };
      }

      const tourActuel = sol.tour_actuel || 1;

      // Récupérer le bénéficiaire du tour actuel
      const beneficiaryQuery = `
        SELECT 
          p.id as participation_id,
          p.user_id,
          p.ordre,
          u.firstname,
          u.lastname,
          u.email
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ? AND p.ordre = ?
      `;
      
      const beneficiaries = await db.executeQuery(beneficiaryQuery, [solId, tourActuel]);
      
      if (beneficiaries.length === 0) {
        return {
          success: false,
          message: 'Aucun bénéficiaire trouvé pour ce tour'
        };
      }

      const beneficiary = beneficiaries[0];

      // Compter le nombre total de participants
      const countQuery = 'SELECT COUNT(*) as total FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [solId]);
      const totalParticipants = countResult[0].total;

      // ✅ Compter les paiements validés pour le tour actuel
      const paymentsQuery = `
        SELECT COUNT(*) as validated
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        WHERE p.sol_id = ? 
        AND pay.tour_number = ?
        AND pay.status IN ('validated', 'completed')
      `;
      
      const paymentsResult = await db.executeQuery(paymentsQuery, [solId, tourActuel]);
      const validatedPayments = paymentsResult[0].validated;

      logger.info('Tour check', {
        solId,
        tourActuel,
        validatedPayments,
        totalParticipants
      });

      // Si tous les paiements sont validés
      if (validatedPayments >= totalParticipants) {
        
        // Marquer la participation du bénéficiaire comme complète
        await db.executeQuery(
          'UPDATE participations SET statut_tour = ? WHERE id = ?',
          ['complete', beneficiary.participation_id]
        );

        // Vérifier si c'est le dernier tour
        if (tourActuel >= totalParticipants) {
          // Terminer le Sol
          await db.executeQuery(
            'UPDATE sols SET statut = ?, updated_at = NOW() WHERE id = ?',
            ['completed', solId]
          );

          logger.info('Sol completed', { solId });

          return {
            success: true,
            tourComplete: true,
            solComplete: true,
            message: 'Tour terminé - Sol terminé !',
            beneficiary,
            nextTour: null
          };
        } else {
          // Passer au tour suivant
          const nextTour = tourActuel + 1;
          
          await db.executeQuery(
            'UPDATE sols SET tour_actuel = ?, updated_at = NOW() WHERE id = ?',
            [nextTour, solId]
          );

          // Récupérer le prochain bénéficiaire
          const nextBeneficiaryResult = await db.executeQuery(beneficiaryQuery, [solId, nextTour]);
          const nextBeneficiary = nextBeneficiaryResult[0] || null;

          logger.info('Tour advanced', {
            solId,
            fromTour: tourActuel,
            toTour: nextTour,
            nextBeneficiary: nextBeneficiary?.user_id
          });

          return {
            success: true,
            tourComplete: true,
            solComplete: false,
            message: `Tour ${tourActuel} terminé - Passage au tour ${nextTour}`,
            beneficiary,
            nextTour,
            nextBeneficiary
          };
        }
      } else {
        return {
          success: false,
          tourComplete: false,
          message: `Tour ${tourActuel} en cours (${validatedPayments}/${totalParticipants} paiements validés)`,
          validatedPayments,
          totalParticipants,
          remaining: totalParticipants - validatedPayments
        };
      }

    } catch (error) {
      logger.error('Check and advance tour error:', error);
      throw error;
    }
  }

  /**
   * Obtenir le statut du tour actuel pour un Sol
   */
  async getTourStatus(solId) {
    try {
      // Validation des paramètres
      if (!solId || solId === 'undefined' || solId === 'null') {
        throw new Error('solId est requis et ne peut pas être undefined');
      }

      const sol = await Sol.findById(solId);
      
      if (!sol) {
        throw new Error('Sol non trouvé');
      }

      const tourActuel = sol.tour_actuel || 1;

      // Bénéficiaire actuel
      const beneficiaryQuery = `
        SELECT 
          p.id as participation_id,
          p.user_id,
          p.ordre,
          p.statut_tour,
          u.firstname,
          u.lastname,
          u.email
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ? AND p.ordre = ?
      `;
      
      const beneficiaries = await db.executeQuery(beneficiaryQuery, [solId, tourActuel]);
      const beneficiary = beneficiaries[0] || null;

      // Nombre de participants
      const countQuery = 'SELECT COUNT(*) as total FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [solId]);
      const totalParticipants = countResult[0].total;

      // Paiements validés pour ce tour
      const paymentsQuery = `
        SELECT COUNT(*) as validated
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        WHERE p.sol_id = ? 
        AND pay.tour_number = ?
        AND pay.status IN ('validated', 'completed')
      `;
      
      const paymentsResult = await db.executeQuery(paymentsQuery, [solId, tourActuel]);
      const validatedPayments = paymentsResult[0].validated;

      // Paiements en attente
      const pendingQuery = `
        SELECT 
          pay.id,
          pay.amount,
          pay.status,
          pay.method,
          u.firstname,
          u.lastname
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ? 
        AND pay.tour_number = ?
        AND pay.status NOT IN ('validated', 'completed')
      `;
      
      const pendingPayments = await db.executeQuery(pendingQuery, [solId, tourActuel]);

      const progress = totalParticipants > 0 
        ? Math.round((validatedPayments / totalParticipants) * 100)
        : 0;

      return {
        success: true,
        solId,
        tourActuel,
        totalTours: totalParticipants,
        beneficiary,
        validatedPayments,
        totalParticipants,
        remaining: totalParticipants - validatedPayments,
        progress,
        isComplete: validatedPayments >= totalParticipants,
        pendingPayments,
        solStatut: sol.statut
      };

    } catch (error) {
      logger.error('Get tour status error:', error);
      throw error;
    }
  }

  /**
   * Vérifier tous les Sols actifs
   */
  async checkAllActiveSols() {
    try {
      const activeSolsQuery = 'SELECT id FROM sols WHERE statut = ?';
      const activeSols = await db.executeQuery(activeSolsQuery, ['active']);

      logger.info('Checking active sols', { count: activeSols.length });

      const results = [];

      for (const sol of activeSols) {
        try {
          const result = await this.checkAndAdvanceTour(sol.id);
          
          if (result.tourComplete) {
            results.push({
              solId: sol.id,
              ...result
            });
          }
        } catch (error) {
          logger.error('Error checking sol', { solId: sol.id, error: error.message });
        }
      }

      return {
        success: true,
        checked: activeSols.length,
        advanced: results.length,
        results
      };

    } catch (error) {
      logger.error('Check all active sols error:', error);
      throw error;
    }
  }

  /**
   * Forcer la progression au tour suivant (admin uniquement)
   */
  async forceAdvanceTour(solId, adminUserId) {
    try {
      const sol = await Sol.findById(solId);
      
      if (!sol) {
        throw new Error('Sol non trouvé');
      }

      const tourActuel = sol.tour_actuel || 1;

      // Marquer la participation actuelle comme complète
      await db.executeQuery(
        `UPDATE participations 
         SET statut_tour = ? 
         WHERE sol_id = ? AND ordre = ?`,
        ['complete', solId, tourActuel]
      );

      // Compter total participants
      const countQuery = 'SELECT COUNT(*) as total FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [solId]);
      const totalParticipants = countResult[0].total;

      if (tourActuel >= totalParticipants) {
        // Terminer le Sol
        await db.executeQuery(
          'UPDATE sols SET statut = ?, updated_at = NOW() WHERE id = ?',
          ['completed', solId]
        );

        logger.info('Sol force completed by admin', { solId, adminUserId });

        return {
          success: true,
          message: 'Sol marqué comme terminé',
          solComplete: true
        };
      } else {
        // Passer au tour suivant
        const nextTour = tourActuel + 1;
        
        await db.executeQuery(
          'UPDATE sols SET tour_actuel = ?, updated_at = NOW() WHERE id = ?',
          [nextTour, solId]
        );

        logger.info('Tour force advanced by admin', {
          solId,
          adminUserId,
          fromTour: tourActuel,
          toTour: nextTour
        });

        return {
          success: true,
          message: `Passage forcé au tour ${nextTour}`,
          nextTour
        };
      }

    } catch (error) {
      logger.error('Force advance tour error:', error);
      throw error;
    }
  }
}

module.exports = new TourDetectionService();