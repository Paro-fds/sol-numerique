const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(userData) {
    try {
      // Validation des données
      if (!userData.email || !userData.password || !userData.firstname || !userData.lastname) {
        throw new Error('Missing required fields');
      }

      // Hash du mot de passe
      const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_ROUNDS) || 12);
      const passwordHash = bcrypt.hashSync(userData.password, salt);

      // Chiffrement simple du compte bancaire si fourni (pour l'exemple local)
      let compteBancaireEncrypted = null;
      if (userData.compte_bancaire) {
        // Pour l'environnement local, on utilise un chiffrement basique
        compteBancaireEncrypted = Buffer.from(userData.compte_bancaire).toString('base64');
      }

      const query = `
        INSERT INTO users (firstname, lastname, email, password_hash, salt, phone, compte_bancaire_encrypted, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await db.executeQuery(query, [
        userData.firstname,
        userData.lastname,
        userData.email.toLowerCase(),
        passwordHash,
        salt,
        userData.phone || null,
        compteBancaireEncrypted,
        userData.role || 'member'
      ]);

      logger.info('User created', {
        userId: result.insertId,
        email: userData.email,
        role: userData.role || 'member'
      });

      return await User.findById(result.insertId);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
    const users = await db.executeQuery(query, [id]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    const users = await db.executeQuery(query, [email.toLowerCase()]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT id, firstname, lastname, email, phone, role, created_at FROM users WHERE is_active = TRUE';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.search) {
      query += ' AND (firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const users = await db.executeQuery(query, params);
    return users.map(user => new User(user));
  }

  verifyPassword(password) {
    return bcrypt.compareSync(password, this.password_hash);
  }

  async updatePassword(newPassword) {
    const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    const query = 'UPDATE users SET password_hash = ?, salt = ?, updated_at = NOW() WHERE id = ?';
    await db.executeQuery(query, [passwordHash, salt, this.id]);

    logger.audit('PASSWORD_CHANGED', this.id, { userId: this.id });
  }

  async updateProfile(data) {
    const allowedFields = ['firstname', 'lastname', 'phone'];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (data.compte_bancaire) {
      // Chiffrement simple pour l'environnement local
      const encrypted = Buffer.from(data.compte_bancaire).toString('base64');
      updates.push('compte_bancaire_encrypted = ?');
      params.push(encrypted);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push('updated_at = NOW()');
    params.push(this.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.executeQuery(query, params);

    logger.audit('PROFILE_UPDATED', this.id, { 
      fields: Object.keys(data),
      userId: this.id 
    });
  }

  getDecryptedAccount() {
    if (!this.compte_bancaire_encrypted) {
      return null;
    }

    try {
      // Déchiffrement simple pour l'environnement local
      return Buffer.from(this.compte_bancaire_encrypted, 'base64').toString();
    } catch (error) {
      logger.error('Error decrypting account:', error);
      return null;
    }
  }

  async setupMFA() {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({
      name: `${this.firstname} ${this.lastname}`,
      issuer: process.env.MFA_ISSUER || 'Sol Numérique',
      length: 20
    });

    // Stocker le secret temporairement (pas encore activé)
    const query = 'UPDATE users SET mfa_secret = ? WHERE id = ?';
    await db.executeQuery(query, [secret.base32, this.id]);

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    };
  }

  async verifyMFA(token) {
    if (!this.mfa_secret) {
      throw new Error('MFA not set up for this user');
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: this.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (verified && !this.mfa_enabled) {
      // Première vérification - activer MFA
      await db.executeQuery(
        'UPDATE users SET mfa_enabled = TRUE WHERE id = ?',
        [this.id]
      );
      this.mfa_enabled = true;

      logger.audit('MFA_ENABLED', this.id, { userId: this.id });
    }

    return verified;
  }

  async disableMFA() {
    const query = 'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = ?';
    await db.executeQuery(query, [this.id]);

    logger.audit('MFA_DISABLED', this.id, { userId: this.id });
  }

  async getSols() {
    const query = `
      SELECT s.*, p.ordre, p.statut_tour, p.date_tour
      FROM sols s
      JOIN participations p ON s.id = p.sol_id
      WHERE p.user_id = ? AND s.statut != 'cancelled'
      ORDER BY s.created_at DESC
    `;
    return await db.executeQuery(query, [this.id]);
  }

  async getPaymentHistory() {
    const query = `
      SELECT p.*, part.ordre, s.nom as sol_name, s.montant_par_periode
      FROM payments p
      JOIN participations part ON p.participation_id = part.id
      JOIN sols s ON part.sol_id = s.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    return await db.executeQuery(query, [this.id]);
  }

  toJSON() {
    const user = { ...this };
    delete user.password_hash;
    delete user.salt;
    delete user.mfa_secret;
    delete user.compte_bancaire_encrypted;
    return user;
  }

  static async deactivate(userId) {
    const query = 'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await db.executeQuery(query, [userId]);

    logger.audit('USER_DEACTIVATED', null, { 
      targetUserId: userId,
      adminId: 'system'
    });
  }
}

module.exports = User;