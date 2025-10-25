// backend/src/services/webhookService.js

const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const pdfService = require('./pdfService');

class WebhookService {
  
  /**
   * Gérer l'événement checkout.session.completed
   */
  async handleCheckoutCompleted(session) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { participationId, userId, solName } = session.metadata;
      const amount = session.amount_total / 100; // Convertir de centimes en euros
      
      logger.info('🎉 Webhook: Checkout completed', {
        sessionId: session.id,
        participationId,
        userId,
        amount
      });

      // 1. Mettre à jour le paiement dans la DB
      await connection.query(
        `UPDATE payments 
         SET status = 'completed',
             stripe_payment_intent_id = ?,
             updated_at = NOW()
         WHERE stripe_session_id = ?`,
        [session.payment_intent, session.id]
      );

      // 2. Mettre à jour la participation
      await connection.query(
        `UPDATE participations 
         SET statut_tour = 'payé',
             updated_at = NOW()
         WHERE id = ?`,
        [participationId]
      );

      // 3. Récupérer les infos complètes pour le reçu
      const [paymentInfo] = await connection.query(
        `SELECT 
          p.*,
          u.email,
          u.firstname,
          u.lastname,
          s.nom as sol_name,
          s.montant_par_periode,
          part.ordre
         FROM payments p
         JOIN participations part ON p.participation_id = part.id
         JOIN users u ON part.user_id = u.id
         JOIN sols s ON part.sol_id = s.id
         WHERE p.stripe_session_id = ?`,
        [session.id]
      );

      if (paymentInfo.length > 0) {
        const payment = paymentInfo[0];

        // 4. Générer le reçu PDF
        const receiptPath = await pdfService.generateReceipt({
          paymentId: payment.id,
          amount: payment.amount,
          solName: payment.sol_name,
          userName: `${payment.firstname} ${payment.lastname}`,
          date: new Date(),
          ordreParticipation: payment.ordre,
          paymentMethod: 'Stripe - Carte Bancaire',
          transactionId: session.payment_intent
        });

        // 5. Mettre à jour le chemin du reçu
        await connection.query(
          `UPDATE payments 
           SET receipt_path = ?
           WHERE id = ?`,
          [receiptPath, payment.id]
        );

        // 6. Envoyer l'email de confirmation avec le reçu
        await emailService.sendPaymentConfirmation({
          to: payment.email,
          userName: `${payment.firstname} ${payment.lastname}`,
          solName: payment.sol_name,
          amount: payment.amount,
          receiptPath,
          transactionId: session.payment_intent
        });

        logger.info('✅ Paiement traité complètement', {
          paymentId: payment.id,
          email: payment.email,
          receiptGenerated: true
        });
      }

      await connection.commit();
      
      return { success: true };

    } catch (error) {
      await connection.rollback();
      logger.error('❌ Erreur traitement webhook checkout.completed:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Gérer l'événement payment_intent.succeeded
   */
  async handlePaymentSucceeded(paymentIntent) {
    logger.info('💳 Webhook: Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100
    });

    // Log pour suivi
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO audit_logs (action, user_id, details, created_at)
         VALUES ('payment_intent_succeeded', NULL, ?, NOW())`,
        [JSON.stringify({
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status
        })]
      );
    } catch (error) {
      logger.error('Erreur log audit:', error);
    } finally {
      connection.release();
    }
  }

  /**
   * Gérer l'événement payment_intent.payment_failed
   */
  async handlePaymentFailed(paymentIntent) {
    const connection = await db.getConnection();
    
    try {
      logger.error('❌ Webhook: Payment failed', {
        paymentIntentId: paymentIntent.id,
        errorMessage: paymentIntent.last_payment_error?.message
      });

      // Mettre à jour le statut en échec
      await connection.query(
        `UPDATE payments 
         SET status = 'failed',
             updated_at = NOW()
         WHERE stripe_payment_intent_id = ?`,
        [paymentIntent.id]
      );

      // Récupérer l'email de l'utilisateur pour notification
      const [payment] = await connection.query(
        `SELECT u.email, u.firstname, u.lastname
         FROM payments p
         JOIN participations part ON p.participation_id = part.id
         JOIN users u ON part.user_id = u.id
         WHERE p.stripe_payment_intent_id = ?`,
        [paymentIntent.id]
      );

      if (payment.length > 0) {
        // Envoyer email de notification d'échec
        await emailService.sendPaymentFailed({
          to: payment[0].email,
          userName: `${payment[0].firstname} ${payment[0].lastname}`,
          reason: paymentIntent.last_payment_error?.message || 'Erreur inconnue'
        });
      }

    } catch (error) {
      logger.error('Erreur traitement payment failed:', error);
    } finally {
      connection.release();
    }
  }

  /**
   * Gérer l'événement charge.refunded
   */
  async handleChargeRefunded(charge) {
    const connection = await db.getConnection();
    
    try {
      logger.info('🔄 Webhook: Charge refunded', {
        chargeId: charge.id,
        amount: charge.amount_refunded / 100
      });

      await connection.query(
        `UPDATE payments 
         SET status = 'refunded',
             updated_at = NOW()
         WHERE stripe_charge_id = ?`,
        [charge.id]
      );

      // Réinitialiser le statut de la participation
      const [payment] = await connection.query(
        `SELECT participation_id, u.email, u.firstname, u.lastname
         FROM payments p
         JOIN participations part ON p.participation_id = part.id
         JOIN users u ON part.user_id = u.id
         WHERE p.stripe_charge_id = ?`,
        [charge.id]
      );

      if (payment.length > 0) {
        await connection.query(
          `UPDATE participations 
           SET statut_tour = 'en_attente'
           WHERE id = ?`,
          [payment[0].participation_id]
        );

        // Notifier l'utilisateur
        await emailService.sendRefundNotification({
          to: payment[0].email,
          userName: `${payment[0].firstname} ${payment[0].lastname}`,
          amount: charge.amount_refunded / 100
        });
      }

    } catch (error) {
      logger.error('Erreur traitement refund:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = new WebhookService();