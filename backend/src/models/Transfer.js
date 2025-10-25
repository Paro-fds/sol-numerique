// backend/src/models/Transfer.js
const db = require('../config/database');
const logger = require('../utils/logger');

class Transfer {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Créer un nouveau transfert
   */
  static async create(transferData) {
    try {
      const query = `
        INSERT INTO transfers (
          sol_id, 
          tour_number, 
          receiver_id, 
          amount, 
          status
        )
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = await db.executeQuery(query, [
        transferData.sol_id,
        transferData.tour_number,
        transferData.receiver_id,
        transferData.amount,
        transferData.status || 'pending'
      ]);

      logger.info('✅ Transfer created', {
        transferId: result.insertId,
        solId: transferData.sol_id,
        tourNumber: transferData.tour_number
      });

      return await Transfer.findById(result.insertId);
    } catch (error) {
      logger.error('❌ Error creating transfer:', error);
      throw error;
    }
  }

  /**
   * Trouver un transfert par ID
   */
  static async findById(id) {
    try {
      const query = `
        SELECT 
          t.*,
          s.nom as sol_name,
          s.montant_par_periode,
          s.nombre_participants,
          receiver.firstname as receiver_firstname,
          receiver.lastname as receiver_lastname,
          receiver.email as receiver_email,
          marker.firstname as marked_by_firstname,
          marker.lastname as marked_by_lastname,
          confirmer.firstname as confirmed_by_firstname,
          confirmer.lastname as confirmed_by_lastname
        FROM transfers t
        JOIN sols s ON t.sol_id = s.id
        JOIN users receiver ON t.receiver_id = receiver.id
        LEFT JOIN users marker ON t.marked_by = marker.id
        LEFT JOIN users confirmer ON t.confirmed_by = confirmer.id
        WHERE t.id = ?
      `;

      const transfers = await db.executeQuery(query, [id]);
      return transfers.length > 0 ? new Transfer(transfers[0]) : null;
    } catch (error) {
      logger.error('❌ Error finding transfer:', error);
      throw error;
    }
  }

  /**
   * Trouver les transferts d'un Sol
   */
  static async findBySolId(solId) {
    try {
      const query = `
        SELECT 
          t.*,
          receiver.firstname as receiver_firstname,
          receiver.lastname as receiver_lastname,
          receiver.email as receiver_email,
          marker.firstname as marked_by_firstname,
          marker.lastname as marked_by_lastname
        FROM transfers t
        JOIN users receiver ON t.receiver_id = receiver.id
        LEFT JOIN users marker ON t.marked_by = marker.id
        WHERE t.sol_id = ?
        ORDER BY t.tour_number DESC
      `;

      const transfers = await db.executeQuery(query, [solId]);
      return transfers.map(t => new Transfer(t));
    } catch (error) {
      logger.error('❌ Error finding transfers by sol:', error);
      throw error;
    }
  }

  /**
   * Trouver les transferts en attente (ready ou pending)
   */
  static async findPending() {
    try {
      const query = `
        SELECT 
          t.*,
          s.nom as sol_name,
          receiver.firstname as receiver_firstname,
          receiver.lastname as receiver_lastname,
          receiver.email as receiver_email
        FROM transfers t
        JOIN sols s ON t.sol_id = s.id
        JOIN users receiver ON t.receiver_id = receiver.id
        WHERE t.status IN ('pending', 'ready', 'transferring')
        ORDER BY t.created_at ASC
      `;

      const transfers = await db.executeQuery(query);
      return transfers.map(t => new Transfer(t));
    } catch (error) {
      logger.error('❌ Error finding pending transfers:', error);
      throw error;
    }
  }

  /**
   * Trouver les transferts d'un utilisateur (où il est bénéficiaire)
   */
  static async findByReceiverId(receiverId) {
    try {
      const query = `
        SELECT 
          t.*,
          s.nom as sol_name,
          marker.firstname as marked_by_firstname,
          marker.lastname as marked_by_lastname
        FROM transfers t
        JOIN sols s ON t.sol_id = s.id
        LEFT JOIN users marker ON t.marked_by = marker.id
        WHERE t.receiver_id = ?
        ORDER BY t.created_at DESC
      `;

      const transfers = await db.executeQuery(query, [receiverId]);
      return transfers.map(t => new Transfer(t));
    } catch (error) {
      logger.error('❌ Error finding transfers by receiver:', error);
      throw error;
    }
  }

  /**
   * Obtenir le transfert actif d'un Sol (tour en cours)
   */
  static async getCurrentTransferBySolId(solId) {
    try {
      const query = `
        SELECT 
          t.*,
          s.nom as sol_name,
          receiver.firstname as receiver_firstname,
          receiver.lastname as receiver_lastname,
          receiver.email as receiver_email
        FROM transfers t
        JOIN sols s ON t.sol_id = s.id
        JOIN users receiver ON t.receiver_id = receiver.id
        WHERE t.sol_id = ?
          AND t.status IN ('pending', 'ready', 'transferring')
        ORDER BY t.tour_number DESC
        LIMIT 1
      `;

      const transfers = await db.executeQuery(query, [solId]);
      return transfers.length > 0 ? new Transfer(transfers[0]) : null;
    } catch (error) {
      logger.error('❌ Error finding current transfer:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un transfert
   */
  async updateStatus(newStatus, userId = null, notes = null) {
    try {
      const validStatuses = ['pending', 'ready', 'transferring', 'completed', 'disputed'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const updates = ['status = ?', 'updated_at = NOW()'];
      const params = [newStatus];

      // Si marqué comme transféré
      if (newStatus === 'transferring' && userId) {
        updates.push('marked_by = ?', 'marked_at = NOW()');
        params.push(userId);
      }

      // Si confirmé comme reçu
      if (newStatus === 'completed' && userId) {
        updates.push('confirmed_by = ?', 'confirmed_at = NOW()');
        params.push(userId);
      }

      if (notes) {
        updates.push('notes = ?');
        params.push(notes);
      }

      params.push(this.id);

      const query = `UPDATE transfers SET ${updates.join(', ')} WHERE id = ?`;
      await db.executeQuery(query, params);

      this.status = newStatus;

      logger.info('✅ Transfer status updated', {
        transferId: this.id,
        newStatus,
        userId
      });

      return this;
    } catch (error) {
      logger.error('❌ Error updating transfer status:', error);
      throw error;
    }
  }

  /**
   * Marquer un transfert comme transféré
   */
  async markAsTransferred(userId, notes = null) {
    return await this.updateStatus('transferring', userId, notes);
  }

  /**
   * Confirmer la réception d'un transfert
   */
  async confirmReceipt(userId, notes = null) {
    return await this.updateStatus('completed', userId, notes);
  }

  /**
   * Marquer un transfert comme litigieux
   */
  async markAsDisputed(notes) {
    return await this.updateStatus('disputed', null, notes);
  }

  /**
   * Vérifier si tous les paiements du tour sont validés
   */
  async checkIfReady() {
    try {
      const query = `
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'validated' OR status = 'completed' THEN 1 ELSE 0 END) as validated
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        WHERE part.sol_id = ?
          AND part.ordre != ?
      `;

      const result = await db.executeQuery(query, [this.sol_id, this.tour_number]);
      const { total, validated } = result[0];

      // Si tous les paiements sont validés (sauf celui du bénéficiaire)
      if (validated === total && total > 0) {
        await this.updateStatus('ready');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ Error checking transfer readiness:', error);
      throw error;
    }
  }

  /**
   * Supprimer un transfert
   */
  async delete() {
    try {
      const query = 'DELETE FROM transfers WHERE id = ?';
      await db.executeQuery(query, [this.id]);

      logger.info('✅ Transfer deleted', { transferId: this.id });
    } catch (error) {
      logger.error('❌ Error deleting transfer:', error);
      throw error;
    }
  }

  /**
   * Convertir en JSON
   */
  toJSON() {
    return {
      id: this.id,
      sol_id: this.sol_id,
      sol_name: this.sol_name,
      tour_number: this.tour_number,
      receiver_id: this.receiver_id,
      receiver_name: `${this.receiver_firstname} ${this.receiver_lastname}`,
      receiver_email: this.receiver_email,
      amount: parseFloat(this.amount),
      status: this.status,
      marked_by: this.marked_by,
      marked_by_name: this.marked_by_firstname ? 
        `${this.marked_by_firstname} ${this.marked_by_lastname}` : null,
      marked_at: this.marked_at,
      confirmed_by: this.confirmed_by,
      confirmed_by_name: this.confirmed_by_firstname ?
        `${this.confirmed_by_firstname} ${this.confirmed_by_lastname}` : null,
      confirmed_at: this.confirmed_at,
      notes: this.notes,
      proof_path: this.proof_path,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Transfer;