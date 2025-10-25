const crypto = require('crypto');
const logger = require('./logger');

// Clé de chiffrement (doit être en hexadecimal de 64 caractères = 32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // Pour AES, c'est toujours 16

// Vérifier que la clé est valide
if (!process.env.ENCRYPTION_KEY) {
  logger.warn('⚠️ ENCRYPTION_KEY not set in .env - using random key (data will be lost on restart)');
}

/**
 * Chiffrer des données sensibles
 * @param {string} text - Texte à chiffrer
 * @returns {string|null} - Texte chiffré au format "iv:encrypted"
 */
function encryptData(text) {
  if (!text) return null;
  
  try {
    // Générer un IV aléatoire
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
      iv
    );
    
    // Chiffrer
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Retourner IV:encrypted
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    return null;
  }
}

/**
 * Déchiffrer des données sensibles
 * @param {string} text - Texte chiffré au format "iv:encrypted"
 * @returns {string|null} - Texte déchiffré
 */
function decryptData(text) {
  if (!text) return null;
  
  try {
    // Séparer IV et données chiffrées
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
      iv
    );
    
    // Déchiffrer
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    return null;
  }
}

module.exports = {
  encryptData,
  decryptData
};