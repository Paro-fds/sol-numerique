const Payment = require('../models/Payment');
const Sol = require('../models/Sol');
const stripeService = require('../services/stripeService');
const s3Service = require('../services/s3Service');
const logger = require('../utils/logger');
const db = require('../config/database');

class PaymentController {

  // Créer une session Stripe
  async createStripeSession(req, res, next) {
    try {
      const { participationId, amount } = req.body;
      const userId = req.user.userId;

      // Vérifier la participation
      const participationQuery = `
        SELECT p.*, s.nom as sol_name, s.montant_par_periode, u.email
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ? AND p.user_id = ?
      `;
      const participations = await db.executeQuery(participationQuery, [participationId, userId]);

      if (participations.length === 0) {
        return res.status(404).json({
          error: 'Participation not found'
        });
      }

      const participation = participations[0];

      // Créer la session Stripe
      const session = await stripeService.createCheckoutSession({
        amount: amount || participation.montant_par_periode,
        participationId,
        userId,
        solName: participation.sol_name,
        userEmail: participation.email
      });

      // Créer un enregistrement de paiement
      await Payment.create({
        participation_id: participationId,
        user_id: userId,
        amount: amount || participation.montant_par_periode,
        method: 'stripe',
        status: 'pending',
        stripe_session_id: session.sessionId
      });

      res.json({
        sessionId: session.sessionId,
        url: session.url
      });

    } catch (error) {
      logger.error('Create Stripe session error:', error);
      next(error);
    }
  }

  // Upload d'un reçu
  async uploadReceipt(req, res, next) {
    try {
      const { participationId } = req.body;
      const userId = req.user.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: 'Receipt file is required'
        });
      }

      // Validation du type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type. Only JPEG, PNG and PDF are allowed.'
        });
      }

      // Vérifier la participation
      const participationQuery = `
        SELECT p.*, s.montant_par_periode
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.id = ? AND p.user_id = ?
      `;
      const participations = await db.executeQuery(participationQuery, [participationId, userId]);

      if (participations.length === 0) {
        return res.status(404).json({
          error: 'Participation not found'
        });
      }

      const participation = participations[0];

      // Upload du fichier
      const uploadResult = await s3Service.uploadFile(
        file.originalname,
        file.buffer,
        file.mimetype
      );

      // Créer le paiement
      const payment = await Payment.create({
        participation_id: participationId,
        user_id: userId,
        amount: participation.montant_par_periode,
        method: 'offline',
        status: 'uploaded',
        receipt_path: uploadResult.filename
      });

      logger.info('Receipt uploaded', {
        paymentId: payment.id,
        userId,
        participationId,
        filename: uploadResult.filename
      });

      res.json({
        message: 'Receipt uploaded successfully',
        payment: payment.toJSON(),
        receiptUrl: uploadResult.url
      });

    } catch (error) {
      logger.error('Upload receipt error:', error);
      next(error);
    }
  }

  // Historique des paiements
  async getPaymentHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { status, method, limit } = req.query;

      const filters = { status, method, limit };
      const payments = await Payment.findByUserId(userId, filters);

      res.json({
        count: payments.length,
        payments: payments.map(p => p.toJSON())
      });

    } catch (error) {
      logger.error('Get payment history error:', error);
      next(error);
    }
  }

  // Obtenir un paiement
  async getPayment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found'
        });
      }

      // Vérifier que l'utilisateur a accès
      if (payment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      res.json({
        payment: payment.toJSON()
      });

    } catch (error) {
      logger.error('Get payment error:', error);
      next(error);
    }
  }

  // Télécharger un reçu
  async downloadReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found'
        });
      }

      // Vérifier l'accès
      if (payment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      if (!payment.receipt_path) {
        return res.status(404).json({
          error: 'No receipt available'
        });
      }

      // Récupérer le fichier
      const filepath = s3Service.getFilePath(payment.receipt_path);
      res.download(filepath);

    } catch (error) {
      logger.error('Download receipt error:', error);
      next(error);
    }
  }

  // Webhook Stripe
  async handleStripeWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'];
      const event = await stripeService.handleWebhook(req.body, signature);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      logger.error('Stripe webhook error:', error);
      return res.status(400).json({
        error: 'Webhook error'
      });
    }
  }

  async handleCheckoutCompleted(session) {
    try {
      const { participationId, userId } = session.metadata;

      // Mettre à jour le paiement
      const query = `
        UPDATE payments 
        SET status = 'completed', 
            stripe_payment_intent_id = ?,
            updated_at = NOW()
        WHERE participation_id = ? 
          AND user_id = ? 
          AND stripe_session_id = ?
      `;

      await db.executeQuery(query, [
        session.payment_intent,
        participationId,
        userId,
        session.id
      ]);

      logger.info('Stripe payment completed', {
        sessionId: session.id,
        participationId,
        userId
      });

    } catch (error) {
      logger.error('Error handling checkout completed:', error);
      throw error;
    }
  }

  async handlePaymentSucceeded(paymentIntent) {
    logger.info('Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100
    });
  }
}

module.exports = new PaymentController();