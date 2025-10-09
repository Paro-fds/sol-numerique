const db = require('../config/database');
const logger = require('../utils/logger');

class Sol {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(solData, creatorId) {
    try {
      const query = `
        INSERT INTO sols (nom, description, montant_par_periode, frequence, created_by, max_participants)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await db.executeQuery(query, [
        solData.nom,
        solData.description || null,
        solData.montant_par_periode,
        solData.frequence,
        creatorId,
        solData.max_participants || 12
      ]);

      logger.info('Sol created', {
        solId: result.insertId,
        createdBy: creatorId,
        nom: solData.nom
      });

      // Ajouter automatiquement le créateur comme premier participant
      await db.executeQuery(
        'INSERT INTO participations (sol_id, user_id, ordre, statut_tour) VALUES (?, ?, 1, "en_attente")',
        [result.insertId, creatorId]
      );

      return await Sol.findById(result.insertId);
    } catch (error) {
      logger.error('Error creating sol:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT s.*, 
             u.firstname as creator_firstname, 
             u.lastname as creator_lastname,
             COUNT(DISTINCT p.id) as participants_count
      FROM sols s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN participations p ON s.id = p.sol_id
      WHERE s.id = ?
      GROUP BY s.id
    `;
    const sols = await db.executeQuery(query, [id]);
    return sols.length > 0 ? new Sol(sols[0]) : null;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT s.*, 
             u.firstname as creator_firstname, 
             u.lastname as creator_lastname,
             COUNT(DISTINCT p.id) as participants_count
      FROM sols s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN participations p ON s.id = p.sol_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.statut) {
      query += ' AND s.statut = ?';
      params.push(filters.statut);
    }

    if (filters.createdBy) {
      query += ' AND s.created_by = ?';
      params.push(filters.createdBy);
    }

    if (filters.userId) {
      query += ' AND EXISTS (SELECT 1 FROM participations WHERE sol_id = s.id AND user_id = ?)';
      params.push(filters.userId);
    }

    if (filters.search) {
      query += ' AND (s.nom LIKE ? OR s.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' GROUP BY s.id ORDER BY s.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const sols = await db.executeQuery(query, params);
    return sols.map(sol => new Sol(sol));
  }

  static async findByUserId(userId) {
    const query = `
      SELECT DISTINCT s.*, 
             u.firstname as creator_firstname, 
             u.lastname as creator_lastname,
             COUNT(DISTINCT p2.id) as participants_count,
             p.ordre as my_ordre,
             p.statut_tour as my_statut
      FROM sols s
      INNER JOIN participations p ON s.id = p.sol_id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN participations p2 ON s.id = p2.sol_id
      WHERE p.user_id = ? AND s.statut != 'cancelled'
      GROUP BY s.id, p.ordre, p.statut_tour
      ORDER BY s.created_at DESC
    `;
    
    const sols = await db.executeQuery(query, [userId]);
    return sols.map(sol => new Sol(sol));
  }

  async getParticipants() {
    const query = `
      SELECT p.*, 
             u.firstname, 
             u.lastname, 
             u.email,
             u.phone
      FROM participations p
      JOIN users u ON p.user_id = u.id
      WHERE p.sol_id = ?
      ORDER BY p.ordre ASC
    `;
    return await db.executeQuery(query, [this.id]);
  }

  async addParticipant(userId) {
    try {
      // Vérifier si l'utilisateur participe déjà
      const existingQuery = 'SELECT id FROM participations WHERE sol_id = ? AND user_id = ?';
      const existing = await db.executeQuery(existingQuery, [this.id, userId]);
      
      if (existing.length > 0) {
        throw new Error('User already participating in this sol');
      }

      // Vérifier le nombre max de participants
      const countQuery = 'SELECT COUNT(*) as count FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [this.id]);
      
      if (countResult[0].count >= this.max_participants) {
        throw new Error('Sol is full');
      }

      // Déterminer l'ordre suivant
      const orderQuery = 'SELECT COALESCE(MAX(ordre), 0) + 1 as next_order FROM participations WHERE sol_id = ?';
      const orderResult = await db.executeQuery(orderQuery, [this.id]);
      const nextOrder = orderResult[0].next_order;

      // Ajouter la participation
      const insertQuery = `
        INSERT INTO participations (sol_id, user_id, ordre, statut_tour)
        VALUES (?, ?, ?, 'en_attente')
      `;
      await db.executeQuery(insertQuery, [this.id, userId, nextOrder]);

      logger.info('User joined sol', {
        solId: this.id,
        userId,
        ordre: nextOrder
      });

      return nextOrder;
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  async removeParticipant(userId) {
    // Vérifier qu'il n'y a pas de paiements en cours
    const paymentQuery = `
      SELECT COUNT(*) as count 
      FROM payments p 
      JOIN participations part ON p.participation_id = part.id
      WHERE part.sol_id = ? AND part.user_id = ? AND p.status IN ('pending', 'uploaded')
    `;
    const paymentResult = await db.executeQuery(paymentQuery, [this.id, userId]);

    if (paymentResult[0].count > 0) {
      throw new Error('Cannot remove participant with pending payments');
    }

    // Supprimer la participation
    const deleteQuery = 'DELETE FROM participations WHERE sol_id = ? AND user_id = ?';
    await db.executeQuery(deleteQuery, [this.id, userId]);

    // Réorganiser les ordres
    await this.reorderParticipants();

    logger.info('User left sol', {
      solId: this.id,
      userId
    });
  }

  async reorderParticipants() {
    const participants = await db.executeQuery(
      'SELECT id FROM participations WHERE sol_id = ? ORDER BY ordre ASC',
      [this.id]
    );

    for (let i = 0; i < participants.length; i++) {
      await db.executeQuery(
        'UPDATE participations SET ordre = ? WHERE id = ?',
        [i + 1, participants[i].id]
      );
    }
  }

  async updateStatus(newStatus) {
    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status');
    }

    const query = 'UPDATE sols SET statut = ?, updated_at = NOW() WHERE id = ?';
    await db.executeQuery(query, [newStatus, this.id]);

    this.statut = newStatus;

    logger.info('Sol status changed', {
      solId: this.id,
      newStatus
    });
  }

  async getStatistics() {
    const queries = [
      // Total collecté
      `SELECT COALESCE(SUM(amount), 0) as total_collected
       FROM payments p
       JOIN participations part ON p.participation_id = part.id
       WHERE part.sol_id = ? AND p.status = 'completed'`,
      
      // Nombre de tours complétés
      `SELECT COUNT(*) as completed_turns
       FROM participations
       WHERE sol_id = ? AND statut_tour = 'complete'`,
      
      // Paiements en attente
      `SELECT COUNT(*) as pending_payments
       FROM participations p
       LEFT JOIN payments pay ON p.id = pay.participation_id
       WHERE p.sol_id = ? AND p.statut_tour = 'en_attente'
         AND (pay.id IS NULL OR pay.status NOT IN ('completed', 'validated'))`
    ];

    const results = await Promise.all(
      queries.map(query => db.executeQuery(query, [this.id]))
    );

    const participantsCount = parseInt(this.participants_count) || 0;

    return {
      totalCollected: parseFloat(results[0][0].total_collected) || 0,
      completedTurns: parseInt(results[1][0].completed_turns) || 0,
      pendingPayments: parseInt(results[2][0].pending_payments) || 0,
      totalParticipants: participantsCount,
      progressPercentage: participantsCount > 0 
        ? Math.round((parseInt(results[1][0].completed_turns) / participantsCount) * 100)
        : 0
    };
  }

  toJSON() {
    return {
      ...this,
      participants_count: parseInt(this.participants_count) || 0
    };
  }
}

module.exports = Sol;