const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const ErrorHandler = require('../middleware/errorHandler');

class AuthController {
  
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { firstname, lastname, email, password, phone, compte_bancaire } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists with this email'
        });
      }

      // Créer l'utilisateur
      const userData = {
        firstname,
        lastname,
        email,
        password,
        phone,
        compte_bancaire
      };

      const user = await User.create(userData);

      // Générer les tokens JWT
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '24h'
      });

      const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
      });

      // Stocker le refresh token en session
      req.session.refreshToken = refreshToken;

      logger.audit('USER_REGISTERED', user.id, {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        token: accessToken,
        mfaRequired: false
      });

    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, mfaToken } = req.body;

      // Trouver l'utilisateur
      const user = await User.findByEmail(email);
      if (!user || !user.verifyPassword(password)) {
        logger.security('LOGIN_FAILED', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'invalid_credentials'
        });

        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Vérifier MFA si activé
      if (user.mfa_enabled) {
        if (!mfaToken) {
          return res.status(200).json({
            mfaRequired: true,
            message: 'MFA token required'
          });
        }

        const mfaValid = await user.verifyMFA(mfaToken);
        if (!mfaValid) {
          logger.security('MFA_FAILED', {
            userId: user.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(401).json({
            error: 'Invalid MFA token'
          });
        }
      }

      // Générer les tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '24h'
      });

      const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
      });

      req.session.refreshToken = refreshToken;

      logger.audit('USER_LOGIN', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        mfaUsed: user.mfa_enabled
      });

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token: accessToken,
        mfaRequired: false
      });

    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user?.id;

      // Supprimer le refresh token de la session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destroy error:', err);
        }
      });

      if (userId) {
        logger.audit('USER_LOGOUT', userId, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.session;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'No refresh token provided'
        });
      }

      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          error: 'User not found'
        });
      }

      // Générer un nouveau access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '24h'
      });

      res.json({
        token: newAccessToken,
        user: user.toJSON()
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }
      next(error);
    }
  }

  async setupMFA(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const mfaSetup = await user.setupMFA();

      logger.audit('MFA_SETUP_INITIATED', user.id, {
        ip: req.ip
      });

      res.json({
        secret: mfaSetup.secret,
        qrCode: mfaSetup.qrCode,
        manualEntryKey: mfaSetup.manualEntryKey
      });

    } catch (error) {
      next(error);
    }
  }

  async verifyMFA(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'MFA token is required'
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const isValid = await user.verifyMFA(token);

      if (isValid) {
        logger.audit('MFA_VERIFIED', user.id, {
          ip: req.ip,
          activated: !user.mfa_enabled
        });

        res.json({
          message: user.mfa_enabled ? 'MFA verified' : 'MFA activated successfully',
          mfaEnabled: true
        });
      } else {
        logger.security('MFA_VERIFICATION_FAILED', {
          userId: user.id,
          ip: req.ip
        });

        res.status(400).json({
          error: 'Invalid MFA token'
        });
      }

    } catch (error) {
      next(error);
    }
  }

  async disableMFA(req, res, next) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          error: 'Password is required to disable MFA'
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (!user.verifyPassword(password)) {
        return res.status(401).json({
          error: 'Invalid password'
        });
      }

      await user.disableMFA();

      logger.audit('MFA_DISABLED', user.id, {
        ip: req.ip
      });

      res.json({
        message: 'MFA disabled successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Ajouter le compte bancaire déchiffré si nécessaire
      const userProfile = user.toJSON();
      if (user.compte_bancaire_encrypted) {
        userProfile.compte_bancaire = user.getDecryptedAccount();
      }

      res.json({
        user: userProfile
      });

    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const { firstname, lastname, phone, compte_bancaire } = req.body;

      await user.updateProfile({
        firstname,
        lastname,
        phone,
        compte_bancaire
      });

      res.json({
        message: 'Profile updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current password and new password are required'
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (!user.verifyPassword(currentPassword)) {
        return res.status(401).json({
          error: 'Current password is incorrect'
        });
      }

      await user.updatePassword(newPassword);

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();