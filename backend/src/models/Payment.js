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
  }

  static async findByUserId(userId, filters = {}) {
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

    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.method) {
      query += ' AND p.method = ?';
      params.push(filters.method);
    }

    query += ' ORDER BY p.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const payments = await db.executeQuery(query, params);
    return payments.map(payment => new Payment(payment));
  }

  static async findPendingReceipts() {
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
  }

  async updateStatus(newStatus, adminId = null, notes = null) {
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
  }

  async delete() {
    const query = 'DELETE FROM payments WHERE id = ?';
    await db.executeQuery(query, [this.id]);

    logger.info('Payment deleted', {
      paymentId: this.id
    });
  }

  toJSON() {
    const payment = { ...this };
    return payment;
  }
}

module.exports = Payment;