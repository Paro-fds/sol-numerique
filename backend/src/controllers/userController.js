// backend/src/controllers/userController.js
const User = require('../models/User');
const db = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class UserController {

  /**
   * Récupérer le profil de l'utilisateur connecté
   * GET /api/users/me
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      res.json({
        success: true,
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   * PUT /api/users/me
   */
  async updateProfile(req, res, next) {
    try {
      const { firstname, lastname, email, phone } = req.body;
      const userId = req.user.userId;
      
      // Vérifier email unique si modifié
      if (email) {
        const existingQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
        const existing = await db.executeQuery(existingQuery, [email, userId]);
        
        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cet email est déjà utilisé'
          });
        }
      }
      
      // Préparer la mise à jour
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
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }
      
      updates.push('updated_at = NOW()');
      params.push(userId);
      
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await db.executeQuery(query, params);
      
      // Récupérer l'utilisateur mis à jour
      const user = await User.findById(userId);
      
      logger.info('Profile updated', { userId });
      
      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        user: user.toJSON()
      });
      
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  /**
   * Mettre à jour le compte bancaire (chiffré)
   * PUT /api/users/me/bank
   */
async updateBankAccount(req, res, next) {
  try {
    const { account_number, account_type, bank_name } = req.body;
    const userId = req.user.userId || req.user.id;

    logger.info('Update bank account request', {
      userId,
      account_type,
      bank_name
    });

    // Validation
    if (!account_number) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de compte est requis'
      });
    }

    // ✅ UTILISER CORRECTEMENT LE MODULE
    const encryption = require('../utils/encryption');
    
    // Chiffrer le numéro de compte
    const encryptedAccountNumber = encryption.encryptData(account_number);

    if (!encryptedAccountNumber) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du chiffrement des données bancaires'
      });
    }

    // Mettre à jour les informations bancaires
    const query = `
      UPDATE users 
      SET account_number = ?,
          account_type = ?,
          bank_name = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await db.executeQuery(query, [
      encryptedAccountNumber,
      account_type || null,
      bank_name || null,
      userId
    ]);

    logger.info('Bank account updated successfully', { userId });

    res.json({
      success: true,
      message: 'Informations bancaires mises à jour avec succès'
    });

  } catch (error) {
    logger.error('Update bank account error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des informations bancaires',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

  /**
   * Changer le mot de passe
   * PUT /api/users/me/password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe actuel et nouveau requis'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }
      
      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Vérifier le mot de passe actuel
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Mot de passe actuel incorrect'
        });
      }
      
      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.executeQuery(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
      );
      
      logger.info('Password changed', { userId });
      
      res.json({
        success: true,
        message: 'Mot de passe changé avec succès'
      });
      
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }

  /**
   * Récupérer les statistiques utilisateur
   * GET /api/users/me/stats
   */
  async getUserStats(req, res, next) {
    try {
      const userId = req.user.userId;
      
      // Total sols
      const solsQuery = `
        SELECT COUNT(DISTINCT s.id) as total
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.user_id = ?
      `;
      const sols = await db.executeQuery(solsQuery, [userId]);
      
      // Sols actifs
      const activeSolsQuery = `
        SELECT COUNT(DISTINCT s.id) as total
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.user_id = ? AND s.statut = 'active'
      `;
      const activeSols = await db.executeQuery(activeSolsQuery, [userId]);
      
      // Total payé
      const paidQuery = `
        SELECT COALESCE(SUM(pay.amount), 0) as total
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        WHERE p.user_id = ? AND pay.status IN ('validated', 'completed')
      `;
      const paid = await db.executeQuery(paidQuery, [userId]);
      
      // Total reçu (via la table transfers avec receiver_id)
      const receivedQuery = `
        SELECT COALESCE(SUM(t.amount), 0) as total
        FROM transfers t
        WHERE t.receiver_id = ? AND t.status = 'completed'
      `;
      const received = await db.executeQuery(receivedQuery, [userId]);
      
      res.json({
        success: true,
        stats: {
          totalSols: sols[0].total || 0,
          activeSols: activeSols[0].total || 0,
          totalPaid: parseFloat(paid[0].total) || 0,
          totalReceived: parseFloat(received[0].total) || 0
        }
      });
      
    } catch (error) {
      logger.error('Get user stats error:', error);
      next(error);
    }
  }

  /**
   * Fonction pour chiffrer les données sensibles
   */
  encryptData(text) {
    if (!text) return null;
    
    const algorithm = 'aes-256-cbc';
    
    // Vérifier si la clé existe dans l'environnement
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Fonction pour déchiffrer les données sensibles
   */
  decryptData(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decrypt error:', error);
      return null;
    }
  }

}

module.exports = new UserController();