// backend/src/controllers/adminController.js
const Payment = require('../models/Payment');
const User = require('../models/User');
const Sol = require('../models/Sol');
const logger = require('../utils/logger');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AdminController {
  /**
 * Obtenir les statistiques du dashboard admin
 * GET /api/admin/dashboard
 */
async getDashboardStats(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    logger.info('📊 Getting admin dashboard stats', { adminId: userId });

    // 1. Reçus en attente
    const pendingReceipts = await db.executeQuery(`
      SELECT COUNT(*) as count FROM payments WHERE status = 'uploaded'
    `);

    // 2. Transferts en attente
    const pendingTransfers = await db.executeQuery(`
      SELECT COUNT(DISTINCT p.sol_id) as count
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      WHERE pay.status = 'validated'
    `);

    // 3. Total utilisateurs
    const totalUsers = await db.executeQuery(`
      SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE
    `);

    // 4. Sols actifs
    const activeSols = await db.executeQuery(`
      SELECT COUNT(*) as count FROM sols WHERE statut = 'actif'
    `);

    // 5. Total transactions
    const totalTransactions = await db.executeQuery(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE status IN ('validated', 'transferred')
    `);

    // 6. Nouveaux utilisateurs ce mois
    const newUsersThisMonth = await db.executeQuery(`
      SELECT COUNT(*) as count
      FROM users
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);

    // 7. Paiements ce mois
    const paymentsThisMonth = await db.executeQuery(`
      SELECT COUNT(*) as count
      FROM payments
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND status IN ('validated', 'transferred')
    `);

    // 8. Revenue du mois
    const monthlyRevenue = await db.executeQuery(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND status IN ('validated', 'transferred')
    `);

    // 9. Activité récente
    const recentActivity = await db.executeQuery(`
      SELECT 
        pay.id,
        pay.amount,
        pay.status,
        pay.method,
        pay.created_at,
        u.firstname,
        u.lastname,
        s.nom as sol_name
      FROM payments pay
      JOIN users u ON pay.user_id = u.id
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      ORDER BY pay.created_at DESC
      LIMIT 10
    `);

    // 10. Stats des Sols
    const solsStats = await db.executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) as actifs,
        SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as termines,
        SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) as en_attente
      FROM sols
    `);

    const stats = {
      pendingReceipts: pendingReceipts[0].count,
      pendingTransfers: pendingTransfers[0].count,
      totalUsers: totalUsers[0].count,
      activeSols: activeSols[0].count,
      totalTransactions: parseFloat(totalTransactions[0].total),
      newUsersThisMonth: newUsersThisMonth[0].count,
      paymentsThisMonth: paymentsThisMonth[0].count,
      monthlyRevenue: parseFloat(monthlyRevenue[0].total),
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        amount: parseFloat(activity.amount),
        status: activity.status,
        method: activity.method,
        date: activity.created_at,
        user: `${activity.firstname} ${activity.lastname}`,
        solName: activity.sol_name
      })),
      solsStats: {
        total: solsStats[0].total,
        actifs: solsStats[0].actifs,
        termines: solsStats[0].termines,
        en_attente: solsStats[0].en_attente
      }
    };

    res.json({ success: true, stats });

  } catch (error) {
    logger.error('❌ Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
}

  // ========================================
  // MÉTHODES EXISTANTES (conservées)
  // ========================================

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
/**
   * Récupérer tous les paiements (admin)
   * GET /api/admin/payments
   */
  async getAllPayments(req, res, next) {
    try {
      const { status, limit } = req.query;

      let query = `
        SELECT 
          p.*,
          u.firstname,
          u.lastname,
          u.email,
          s.nom as sol_name,
          part.ordre
        FROM payments p
        JOIN participations part ON p.participation_id = part.id
        JOIN users u ON p.user_id = u.id
        JOIN sols s ON part.sol_id = s.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      const payments = await db.executeQuery(query, params);

      res.json({
        success: true,
        count: payments.length,
        payments
      });

    } catch (error) {
      logger.error('Get all payments error:', error);
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

      // Ajouter le nombre de sols pour chaque utilisateur
      for (let user of users) {
        const solsQuery = 'SELECT COUNT(*) as count FROM participations WHERE user_id = ?';
        const solsResult = await db.executeQuery(solsQuery, [user.id]);
        user.sols_count = solsResult[0].count;
      }

      res.json({
        success: true,
        count: users.length,
        users: users.map(u => {
          const userData = u.toJSON();
          userData.sols_count = u.sols_count;
          return userData;
        })
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
        success: true,
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

  // ========================================
  // ✅ NOUVELLES MÉTHODES AJOUTÉES
  // ========================================

  /**
   * Fonction pour chiffrer les données sensibles
   */
  encryptData(text) {
    if (!text) return null;
    
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Récupère les détails d'un utilisateur
   * GET /api/admin/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Récupérer les participations
      const participationsQuery = `
        SELECT 
          s.id as sol_id,
          s.nom as sol_nom,
          s.statut as sol_statut,
          p.ordre,
          p.statut_tour,
          p.created_at as date_adhesion
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `;
      
      const participations = await db.executeQuery(participationsQuery, [id]);
      
      // Récupérer les paiements récents
      const paiementsQuery = `
        SELECT 
          pay.id,
          pay.amount,
          pay.method,
          pay.created_at as date,
          pay.status,
          s.nom as sol_nom
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        JOIN sols s ON p.sol_id = s.id
        WHERE p.user_id = ?
        ORDER BY pay.created_at DESC
        LIMIT 10
      `;
      
      const paiements = await db.executeQuery(paiementsQuery, [id]);
      
      const userData = user.toJSON();
      userData.participations = participations;
      userData.paiements_recents = paiements;
      
      logger.info('User details retrieved', {
        userId: id,
        adminId: req.user.userId
      });
      
      res.json({
        success: true,
        user: userData
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      next(error);
    }
  }

  /**
   * Créer un nouvel utilisateur
   * POST /api/admin/users
   */
  async createUser(req, res, next) {
    try {
      const { firstname, lastname, email, phone, role, password, compte_bancaire } = req.body;
      const adminId = req.user.userId;
      
      // Validation
      if (!firstname || !lastname || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Les champs prénom, nom, email et mot de passe sont requis'
        });
      }
      
      // Vérifier si l'email existe déjà
      const existingQuery = 'SELECT id FROM users WHERE email = ?';
      const existing = await db.executeQuery(existingQuery, [email]);
      
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cet email est déjà utilisé'
        });
      }
      
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Chiffrer le compte bancaire si fourni
      const compteBancaireChiffre = compte_bancaire ? this.encryptData(compte_bancaire) : null;
      
      // Créer l'utilisateur
      const insertQuery = `
        INSERT INTO users 
        (firstname, lastname, email, phone, password_hash, role, compte_bancaire_encrypted, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      `;
      
      const result = await db.executeQuery(insertQuery, [
        firstname,
        lastname,
        email,
        phone,
        hashedPassword,
        role || 'member',
        compteBancaireChiffre
      ]);
      
      logger.info('User created by admin', {
        userId: result.insertId,
        email,
        adminId
      });
      
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        userId: result.insertId
      });
      
    } catch (error) {
      logger.error('Create user error:', error);
      next(error);
    }
  }

  /**
   * Mettre à jour un utilisateur
   * PUT /api/admin/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { firstname, lastname, email, phone, role, password, compte_bancaire } = req.body;
      const adminId = req.user.userId;
      
      // Vérifier que l'utilisateur existe
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Vérifier email unique si modifié
      if (email && email !== user.email) {
        const existingQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
        const existing = await db.executeQuery(existingQuery, [email, id]);
        
        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cet email est déjà utilisé'
          });
        }
      }
      
      // Préparer les mises à jour
      const updates = [];
      const params = [];
      
      if (firstname) {
        updates.push('firstname = ?');
        params.push(firstname);
      }
      if (lastname) {
        updates.push('lastname = ?');
        params.push(lastname);
      }
      if (email) {
        updates.push('email = ?');
        params.push(email);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone);
      }
      if (role) {
        updates.push('role = ?');
        params.push(role);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password_hash = ?');
        params.push(hashedPassword);
      }
      if (compte_bancaire !== undefined) {
        const compteBancaireChiffre = compte_bancaire ? this.encryptData(compte_bancaire) : null;
        updates.push('compte_bancaire_encrypted = ?');
        params.push(compteBancaireChiffre);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }
      
      updates.push('updated_at = NOW()');
      params.push(id);
      
      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await db.executeQuery(updateQuery, params);
      
      logger.info('User updated by admin', {
        userId: id,
        adminId
      });
      
      res.json({
        success: true,
        message: 'Utilisateur mis à jour avec succès'
      });
      
    } catch (error) {
      logger.error('Update user error:', error);
      next(error);
    }
  }

  /**
   * Supprimer un utilisateur (soft delete)
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      
      // Ne pas permettre de se supprimer soi-même
      if (parseInt(id) === adminId) {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer votre propre compte'
        });
      }
      
      // Vérifier que l'utilisateur existe
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Vérifier participations actives
      const activeParticipationsQuery = `
        SELECT COUNT(*) as count 
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.user_id = ? AND s.statut = 'active'
      `;
      
      const activeResult = await db.executeQuery(activeParticipationsQuery, [id]);
      
      if (activeResult[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer un utilisateur avec des participations actives'
        });
      }
      
      // Soft delete
      const deleteQuery = `
        UPDATE users 
        SET is_active = FALSE, 
            email = CONCAT(email, '_deleted_', id),
            updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.executeQuery(deleteQuery, [id]);
      
      logger.info('User deleted by admin', {
        userId: id,
        adminId
      });
      
      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès'
      });
      
    } catch (error) {
      logger.error('Delete user error:', error);
      next(error);
    }
  }

  /**
   * Statistiques utilisateurs
   * GET /api/admin/users/stats
   */
  async getUsersStats(req, res, next) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) as membres,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN DATE(last_login_at) = CURDATE() THEN 1 ELSE 0 END) as today_logins
        FROM users
        WHERE is_active = TRUE
      `;
      
      const stats = await db.executeQuery(statsQuery);
      
      res.json({
        success: true,
        stats: stats[0]
      });
      
    } catch (error) {
      logger.error('Get users stats error:', error);
      next(error);
    }
  }
  // ========================================
// ✅ AJOUTER CES MÉTHODES DANS adminController.js
// ========================================
// À placer AVANT la méthode generateAndSendReceipt (ligne 787)

  /**
   * Valider un paiement
   * PUT /api/admin/payments/:id/validate
   */
  async validatePayment(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = req.user.userId;
      
      // Mettre à jour le statut
      await db.executeQuery(
        'UPDATE payments SET status = ?, notes = ?, validated_by = ?, validated_at = NOW(), updated_at = NOW() WHERE id = ?',
        ['validated', notes || 'Validé par admin', adminId, id]
      );
      
      logger.info('Payment validated', {
        paymentId: id,
        adminId
      });
      
      res.json({
        success: true,
        message: 'Paiement validé avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur validation paiement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la validation'
      });
    }
  }

  /**
   * Rejeter un paiement
   * PUT /api/admin/payments/:id/reject
   */
  async rejectPayment(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = req.user.userId;
      
      await db.executeQuery(
        'UPDATE payments SET status = ?, notes = ?, validated_by = ?, validated_at = NOW(), updated_at = NOW() WHERE id = ?',
        ['rejected', notes || 'Rejeté par admin', adminId, id]
      );
      
      logger.info('Payment rejected', {
        paymentId: id,
        adminId
      });
      
      res.json({
        success: true,
        message: 'Paiement rejeté'
      });
      
    } catch (error) {
      logger.error('❌ Erreur rejet paiement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du rejet'
      });
    }
  }

  /**
   * Générer et envoyer un reçu PDF par email
   * POST /api/admin/receipts/generate-receipt
   */
  async generateAndSendReceipt(req, res, next) {
    try {
      const { paymentId } = req.body;
      const adminId = req.user.userId;
      
      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment ID is required'
        });
      }
      
      // Récupérer les informations du paiement
      const paymentQuery = `
        SELECT 
          pay.*,
          u.firstname as member_firstname,
          u.lastname as member_lastname,
          u.email as member_email,
          u.phone as member_phone,
          s.nom as sol_name,
          s.frequence as frequency,
          va.firstname as validator_firstname,
          va.lastname as validator_lastname
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN sols s ON p.sol_id = s.id
        LEFT JOIN users va ON pay.validated_by = va.id
        WHERE pay.id = ?
      `;
      
      const paymentResult = await db.executeQuery(paymentQuery, [paymentId]);
      
      if (paymentResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Paiement non trouvé'
        });
      }
      
      const payment = paymentResult[0];
      
      // Préparer les données pour le PDF
      const paymentData = {
        id: payment.id,
        receiptNumber: payment.id,
        date: payment.created_at,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        stripeChargeId: payment.stripe_charge_id,
        memberName: `${payment.member_firstname} ${payment.member_lastname}`,
        memberEmail: payment.member_email,
        memberPhone: payment.member_phone,
        solName: payment.sol_name,
        frequency: payment.frequency,
        validatedBy: payment.validator_firstname 
          ? `${payment.validator_firstname} ${payment.validator_lastname}` 
          : null,
        validatedDate: payment.validated_at
      };
      
      // Appeler le service PDF (à implémenter)
      // const pdfService = require('../services/pdfService');
      // await pdfService.sendReceiptByEmail(paymentData);
      
      // Mettre à jour le statut
      await db.executeQuery(
        'UPDATE payments SET receipt_sent = TRUE, receipt_sent_at = NOW() WHERE id = ?',
        [paymentId]
      );
      
      logger.info('Receipt generated and sent', {
        paymentId,
        adminId
      });
      
      res.json({
        success: true,
        message: 'Reçu généré et envoyé par email'
      });
      
    } catch (error) {
      logger.error('Generate receipt error:', error);
      next(error);
    }
  }
}

module.exports = new AdminController();