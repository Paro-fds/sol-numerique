const db = require('../config/database');
const logger = require('../utils/logger');

class Payment {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(paymentData) {
    try {
      const query = `
        INSERT INTO payments (participation_id, user_id, amount, method, status, receipt_path, stripe_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await db.executeQuery(query, [
        paymentData.participation_id,
        paymentData.user_id,
        paymentData.amount,
        paymentData.method,
        paymentData.status || 'pending',
        paymentData.receipt_path || null,
        paymentData.stripe_session_id || null
      ]);

      logger.info('Payment created', {
        paymentId: result.insertId,
        userId: paymentData.user_id,
        method: paymentData.method
      });

      return await Payment.findById(result.insertId);
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT p.*, 
               part.sol_id,
               part.ordre,
               s.nom as sol_name,
               s.montant_par_periode,
               u.firstname,
               u.lastname,
               u.email
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `;
      const payments = await db.executeQuery(query, [id]);
      return payments.length > 0 ? new Payment(payments[0]) : null;
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT p.*, 
               part.sol_id,
               part.ordre,
               s.nom as sol_name,
               s.montant_par_periode
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        WHERE p.user_id = ?
      `;
      const params = [userId];

      // Ajouter les filtres
      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.method) {
        query += ' AND p.method = ?';
        params.push(filters.method);
      }

      query += ' ORDER BY p.created_at DESC';

      // ✅ LIMIT HARDCODÉ - Contournement du bug MySQL avec paramètres préparés
      // Au lieu d'utiliser LIMIT ? avec un paramètre, on met la valeur directement
      query += ' LIMIT 50';

      logger.info('🔍 Executing findByUserId query', {
        userId,
        filters,
        query,
        params,
        paramsTypes: params.map(p => typeof p)
      });

      const payments = await db.executeQuery(query, params);
      
      logger.info('✅ Query executed successfully', {
        userId,
        paymentCount: payments.length
      });

      return payments.map(payment => new Payment(payment));

    } catch (error) {
      logger.error('❌ Error in findByUserId:', {
        error: error.message,
        stack: error.stack,
        userId,
        filters
      });
      throw error;
    }
  }

  static async findPendingReceipts() {
    try {
      const query = `
        SELECT p.*, 
               part.sol_id,
               part.ordre,
               s.nom as sol_name,
               u.firstname,
               u.lastname,
               u.email
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE p.method = 'offline' AND p.status = 'uploaded'
        ORDER BY p.created_at ASC
      `;
      const payments = await db.executeQuery(query);
      return payments.map(payment => new Payment(payment));
    } catch (error) {
      logger.error('Error in findPendingReceipts:', error);
      throw error;
    }
  }

  async updateStatus(newStatus, adminId = null, notes = null) {
    try {
      const validStatuses = ['pending', 'uploaded', 'validated', 'rejected', 'completed'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status');
      }

      const updates = ['status = ?', 'updated_at = NOW()'];
      const params = [newStatus];

      if (adminId) {
        updates.push('validated_by = ?', 'validated_at = NOW()');
        params.push(adminId);
      }

      if (notes) {
        updates.push('notes = ?');
        params.push(notes);
      }

      params.push(this.id);

      const query = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;
      await db.executeQuery(query, params);

      this.status = newStatus;

      logger.info('Payment status updated', {
        paymentId: this.id,
        newStatus,
        adminId
      });
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  async delete() {
    try {
      const query = 'DELETE FROM payments WHERE id = ?';
      await db.executeQuery(query, [this.id]);

      logger.info('Payment deleted', {
        paymentId: this.id
      });
    } catch (error) {
      logger.error('Error deleting payment:', error);
      throw error;
    }
  }

  toJSON() {
    const payment = { ...this };
    return payment;
  }
static async create(data) {
  try {
    // Récupérer le tour actuel du Sol
    const solQuery = `
      SELECT s.tour_actuel 
      FROM sols s
      JOIN participations p ON s.id = p.sol_id
      WHERE p.id = ?
    `;
    
    const solResult = await db.executeQuery(solQuery, [data.participation_id]);
    const tourActuel = solResult.length > 0 ? solResult[0].tour_actuel : 1;

    const query = `
      INSERT INTO payments (
        participation_id,
        tour_number,
        user_id,
        amount,
        method,
        status,
        receipt_path,
        stripe_session_id,
        stripe_payment_intent_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      data.participation_id,
      tourActuel, // ✅ AJOUTÉ
      data.user_id,
      data.amount,
      data.method || 'offline',
      data.status || 'pending',
      data.receipt_path || null,
      data.stripe_session_id || null,
      data.stripe_payment_intent_id || null
    ];

    const result = await db.executeQuery(query, values);

    logger.info('Payment created', {
      paymentId: result.insertId,
      userId: data.user_id,
      tourNumber: tourActuel
    });

    return await this.findById(result.insertId);
  } catch (error) {
    logger.error('Create payment error:', error);
    throw error;
  }
}

}

module.exports = Payment;