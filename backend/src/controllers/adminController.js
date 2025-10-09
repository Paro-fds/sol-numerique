const Payment = require('../models/Payment');
const User = require('../models/User');
const Sol = require('../models/Sol');
const logger = require('../utils/logger');
const db = require('../config/database');

class AdminController {

  // Obtenir les reçus en attente de validation
  async getPendingReceipts(req, res, next) {
    try {
      const receipts = await Payment.findPendingReceipts();

      res.json({
        count: receipts.length,
        receipts: receipts.map(r => r.toJSON())
      });

    } catch (error) {
      logger.error('Get pending receipts error:', error);
      next(error);
    }
  }

  // Valider ou rejeter un reçu
  async validateReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const adminId = req.user.userId;

      // Vérifier que le statut est valide
      const validStatuses = ['validated', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be "validated" or "rejected"'
        });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found'
        });
      }

      if (payment.method !== 'offline') {
        return res.status(400).json({
          error: 'Only offline payments can be validated'
        });
      }

      if (payment.status !== 'uploaded') {
        return res.status(400).json({
          error: 'Payment is not in uploaded status'
        });
      }

      // Mettre à jour le statut
      await payment.updateStatus(status, adminId, notes);

      // Si validé, mettre à jour le statut de la participation
      if (status === 'validated') {
        await db.executeQuery(
          'UPDATE participations SET statut_tour = "valide" WHERE id = ?',
          [payment.participation_id]
        );
      }

      logger.info('Receipt validated/rejected', {
        paymentId: id,
        status,
        adminId
      });

      res.json({
        message: `Reçu ${status === 'validated' ? 'validé' : 'rejeté'} avec succès`,
        payment: payment.toJSON()
      });

    } catch (error) {
      logger.error('Validate receipt error:', error);
      next(error);
    }
  }

  // Obtenir les virements en attente
  async getTransferRequests(req, res, next) {
    try {
      const query = `
        SELECT p.*, 
               part.ordre,
               part.sol_id,
               s.nom as sol_name,
               s.montant_par_periode,
               u.firstname as beneficiary_firstname,
               u.lastname as beneficiary_lastname,
               u.email as beneficiary_email,
               u.compte_bancaire_encrypted
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        JOIN users u ON part.user_id = u.id
        WHERE p.status = 'validated'
        ORDER BY p.validated_at ASC
      `;

      const transfers = await db.executeQuery(query);

      res.json({
        count: transfers.length,
        transfers
      });

    } catch (error) {
      logger.error('Get transfer requests error:', error);
      next(error);
    }
  }

  // Marquer un virement comme effectué
  async markTransferCompleted(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = req.user.userId;

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found'
        });
      }

      if (payment.status !== 'validated') {
        return res.status(400).json({
          error: 'Payment is not validated'
        });
      }

      // Mettre à jour le statut
      await payment.updateStatus('completed', adminId, notes);

      // Mettre à jour la participation
      await db.executeQuery(
        'UPDATE participations SET statut_tour = "complete" WHERE id = ?',
        [payment.participation_id]
      );

      logger.info('Transfer marked as completed', {
        paymentId: id,
        adminId
      });

      res.json({
        message: 'Virement marqué comme effectué',
        payment: payment.toJSON()
      });

    } catch (error) {
      logger.error('Mark transfer completed error:', error);
      next(error);
    }
  }

  // Dashboard admin - Statistiques
  async getDashboardStats(req, res, next) {
    try {
      const queries = [
        // Total utilisateurs
        'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE',
        
        // Total sols
        'SELECT COUNT(*) as count FROM sols WHERE statut = "active"',
        
        // Reçus en attente
        'SELECT COUNT(*) as count FROM payments WHERE status = "uploaded"',
        
        // Virements en attente
        'SELECT COUNT(*) as count FROM payments WHERE status = "validated"',
        
        // Total des transactions
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ("completed", "validated")',
        
        // Nouveaux utilisateurs ce mois
        'SELECT COUNT(*) as count FROM users WHERE DATE_FORMAT(created_at, "%Y-%m") = DATE_FORMAT(NOW(), "%Y-%m")',
        
        // Paiements ce mois
        'SELECT COUNT(*) as count FROM payments WHERE DATE_FORMAT(created_at, "%Y-%m") = DATE_FORMAT(NOW(), "%Y-%m")'
      ];

      const results = await Promise.all(
        queries.map(query => db.executeQuery(query))
      );

      const stats = {
        totalUsers: results[0][0].count,
        activeSols: results[1][0].count,
        pendingReceipts: results[2][0].count,
        pendingTransfers: results[3][0].count,
        totalTransactions: parseFloat(results[4][0].total),
        newUsersThisMonth: results[5][0].count,
        paymentsThisMonth: results[6][0].count
      };

      res.json({ stats });

    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      next(error);
    }
  }

  // Gestion des utilisateurs - Liste
  async getUsers(req, res, next) {
    try {
      const { role, search, limit } = req.query;

      const filters = { role, search, limit };
      const users = await User.findAll(filters);

      res.json({
        count: users.length,
        users: users.map(u => u.toJSON())
      });

    } catch (error) {
      logger.error('Get users error:', error);
      next(error);
    }
  }

  // Mettre à jour le statut d'un utilisateur
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user.userId;

      // Ne pas permettre de se désactiver soi-même
      if (parseInt(id) === adminId) {
        return res.status(400).json({
          error: 'Cannot deactivate your own account'
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (status === 'inactive') {
        await User.deactivate(id);
      } else {
        await db.executeQuery(
          'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = ?',
          [id]
        );
      }

      logger.info('User status updated', {
        userId: id,
        newStatus: status,
        adminId
      });

      res.json({
        message: `Utilisateur ${status === 'inactive' ? 'désactivé' : 'activé'} avec succès`
      });

    } catch (error) {
      logger.error('Update user status error:', error);
      next(error);
    }
  }

  // Rapports - Liste des paiements
  async getReports(req, res, next) {
    try {
      const { startDate, endDate, solId, status } = req.query;

      let query = `
        SELECT p.*, 
               part.ordre,
               s.nom as sol_name,
               u.firstname,
               u.lastname,
               u.email
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (startDate) {
        query += ' AND DATE(p.created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(p.created_at) <= ?';
        params.push(endDate);
      }

      if (solId) {
        query += ' AND part.sol_id = ?';
        params.push(solId);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC';

      const payments = await db.executeQuery(query, params);

      res.json({
        count: payments.length,
        payments
      });

    } catch (error) {
      logger.error('Get reports error:', error);
      next(error);
    }
  }

  // Export de rapport (CSV)
  async exportReport(req, res, next) {
    try {
      const { format } = req.params;
      const { startDate, endDate, solId } = req.query;

      if (format !== 'csv') {
        return res.status(400).json({
          error: 'Only CSV format is supported for now'
        });
      }

      // Récupérer les données
      const query = `
        SELECT p.id, p.created_at, p.amount, p.method, p.status,
               s.nom as sol_name,
               u.firstname, u.lastname, u.email
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE 1=1
        ${startDate ? 'AND DATE(p.created_at) >= ?' : ''}
        ${endDate ? 'AND DATE(p.created_at) <= ?' : ''}
        ${solId ? 'AND part.sol_id = ?' : ''}
        ORDER BY p.created_at DESC
      `;

      const params = [];
      if (startDate) params.push(startDate);
      if (endDate) params.push(endDate);
      if (solId) params.push(solId);

      const payments = await db.executeQuery(query, params);

      // Générer le CSV
      const headers = ['ID', 'Date', 'Montant', 'Méthode', 'Statut', 'Sol', 'Prénom', 'Nom', 'Email'];
      const csvRows = [headers.join(',')];

      payments.forEach(payment => {
        const row = [
          payment.id,
          new Date(payment.created_at).toLocaleDateString('fr-FR'),
          payment.amount,
          payment.method,
          payment.status,
          payment.sol_name,
          payment.firstname,
          payment.lastname,
          payment.email
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=rapport-${Date.now()}.csv`);
      res.send(csv);

    } catch (error) {
      logger.error('Export report error:', error);
      next(error);
    }
  }
}

module.exports = new AdminController();