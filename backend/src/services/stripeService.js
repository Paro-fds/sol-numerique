const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

class StripeService {
  
  async createCheckoutSession(paymentData) {
    try {
      const { amount, participationId, userId, solName, userEmail } = paymentData;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Paiement Sol - ${solName}`,
              description: `Contribution au sol ${solName}`
            },
            unit_amount: Math.round(amount * 100) // Stripe utilise les centimes
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payments/cancel`,
        customer_email: userEmail,
        metadata: {
          participationId: participationId.toString(),
          userId: userId.toString(),
          solName: solName
        }
      });

      logger.info('Stripe checkout session created', {
        sessionId: session.id,
        userId,
        participationId,
        amount
      });

      return {
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      logger.error('Stripe checkout session error:', error);
      throw error;
    }
  }

  async retrieveSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Error retrieving Stripe session:', error);
      throw error;
    }
  }

  async handleWebhook(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Stripe webhook received', {
        type: event.type,
        id: event.id
      });

      return event;
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId, amount = null) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined
      });

      logger.info('Stripe refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount
      });

      return refund;
    } catch (error) {
      logger.error('Stripe refund error:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();