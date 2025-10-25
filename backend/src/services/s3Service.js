
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');
const crypto = require('crypto');
const path = require('path');

class S3Service {
 constructor() {
  // ✅ FORCER le rechargement de .env
  const path = require('path');
  const dotenv = require('dotenv');
  
  // Charger .env depuis la racine du projet backend
  const envPath = path.join(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    logger.error('❌ Failed to load .env file:', result.error);
  } else {
    logger.info('✅ .env file loaded from:', envPath);
  }

  // ✅ LOGS DE DEBUG
  console.log('\n🔍 S3 Service Constructor:');
  console.log('  AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}****` : 'NOT SET');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 4)}****` : 'NOT SET');
  console.log('  AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME || 'NOT SET');

  // Vérifier si S3 est configuré
  this.useS3 = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );

  console.log('  useS3:', this.useS3);
  console.log('');

  if (this.useS3) {
    try {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
        },
      });

      this.bucketName = process.env.AWS_S3_BUCKET_NAME.trim();
      this.region = process.env.AWS_REGION || 'us-east-1';

      logger.info('✅ S3 Service initialized (AWS S3)', {
        bucket: this.bucketName,
        region: this.region
      });
    } catch (error) {
      logger.error('❌ S3 initialization failed:', error);
      this.useS3 = false;
    }
  }

  if (!this.useS3) {
    this.uploadDir = path.join(__dirname, '../../uploads/receipts');
    logger.warn('⚠️ S3 NOT configured - Using LOCAL storage', {
      uploadDir: this.uploadDir
    });
    
    require('fs').promises.mkdir(this.uploadDir, { recursive: true })
      .catch(err => logger.error('Failed to create upload dir:', err));
  }
}

  /**
   * Générer un nom de fichier unique
   */
  generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const basename = path.basename(originalFilename, extension);
    
    // Nettoyer le nom de fichier
    const cleanBasename = basename
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);

    return `receipts/${timestamp}-${randomString}-${cleanBasename}${extension}`;
  }

  /**
   * Upload un fichier vers S3
   * @param {string} originalFilename - Nom original du fichier
   * @param {Buffer} fileBuffer - Contenu du fichier
   * @param {string} mimetype - Type MIME du fichier
   * @returns {Promise<Object>} - Informations du fichier uploadé
   */
  async uploadFile(originalFilename, fileBuffer, mimetype) {
    try {
      const filename = this.generateUniqueFilename(originalFilename);

      logger.info('📤 Uploading file to S3', {
        originalFilename,
        filename,
        size: fileBuffer.length,
        mimetype
      });

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimetype,
        // ACL: 'private', // Fichier privé par défaut
        ServerSideEncryption: 'AES256', // Chiffrement côté serveur
        Metadata: {
          'original-filename': originalFilename,
          'uploaded-at': new Date().toISOString()
        }
      });

      await this.s3Client.send(command);

      logger.info('✅ File uploaded to S3', {
        filename,
        bucket: this.bucketName
      });

      // Générer l'URL (non signée, pour référence)
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;

      return {
        filename,
        originalFilename,
        url,
        bucket: this.bucketName,
        key: filename,
        size: fileBuffer.length,
        mimetype
      };
    } catch (error) {
      logger.error('❌ S3 upload error:', {
        error: error.message,
        stack: error.stack,
        code: error.Code
      });
      throw new Error(`Erreur lors de l'upload vers S3: ${error.message}`);
    }
  }

  /**
   * Obtenir une URL signée pour télécharger un fichier (valide temporairement)
   * @param {string} filename - Nom du fichier dans S3
   * @param {number} expiresIn - Durée de validité en secondes (défaut: 1h)
   * @returns {Promise<string>} - URL signée
   */
  async getSignedDownloadUrl(filename, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      logger.info('🔗 Signed URL generated', {
        filename,
        expiresIn: `${expiresIn}s`
      });

      return url;
    } catch (error) {
      logger.error('❌ Get signed URL error:', error);
      throw new Error('Erreur lors de la génération de l\'URL de téléchargement');
    }
  }

/**
 * Obtenir une URL signée pour afficher un fichier (dans le navigateur)
 * @param {string} filename - Nom du fichier dans S3
 * @param {number} expiresIn - Durée de validité en secondes (défaut: 1h)
 * @returns {Promise<string>} - URL signée
 */
async getSignedViewUrl(filename, expiresIn = 3600) {
  if (!this.useS3) {
    // Mode local
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/receipts/${filename.replace(/^receipts\//, '')}`;
  }

  try {
    logger.info('🔗 Generating S3 signed view URL', { 
      filename,
      bucket: this.bucketName,
      region: this.region
    });

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filename, // Doit inclure 'receipts/' si c'est le chemin complet
      ResponseContentDisposition: 'inline' // Afficher dans le navigateur
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    logger.info('✅ S3 signed view URL generated', {
      filename,
      expiresIn: `${expiresIn}s`,
      urlPreview: url.substring(0, 100) + '...'
    });

    return url;
  } catch (error) {
    logger.error('❌ Get signed view URL error:', {
      error: error.message,
      code: error.Code,
      filename,
      bucket: this.bucketName
    });
    throw new Error(`Erreur lors de la génération de l'URL de visualisation: ${error.message}`);
  }
}

  /**
   * Supprimer un fichier de S3
   * @param {string} filename - Nom du fichier dans S3
   * @returns {Promise<void>}
   */
  async deleteFile(filename) {
    try {
      logger.info('🗑️ Deleting file from S3', { filename });

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.s3Client.send(command);

      logger.info('✅ File deleted from S3', { filename });
    } catch (error) {
      logger.error('❌ S3 delete error:', error);
      throw new Error('Erreur lors de la suppression du fichier');
    }
  }

  /**
   * Vérifier si un fichier existe dans S3
   * @param {string} filename - Nom du fichier dans S3
   * @returns {Promise<boolean>}
   */
  async fileExists(filename) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obtenir les métadonnées d'un fichier
   * @param {string} filename - Nom du fichier dans S3
   * @returns {Promise<Object>}
   */
  async getFileMetadata(filename) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error('❌ Get metadata error:', error);
      throw new Error('Erreur lors de la récupération des métadonnées');
    }
  }

  /**
   * FALLBACK : Obtenir le chemin local (si S3 non configuré)
   * @param {string} filename - Nom du fichier
   * @returns {string} - Chemin local
   */
  getFilePath(filename) {
    const localPath = path.join(__dirname, '../../uploads', filename);
    logger.warn('⚠️ Using local file path (S3 not configured)', { localPath });
    return localPath;
  }

  /**
   * Tester la connexion S3
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const { ListBucketsCommand } = require('@aws-sdk/client-s3');
      const command = new ListBucketsCommand({});
      await this.s3Client.send(command);
      
      logger.info('✅ S3 connection successful');
      return true;
    } catch (error) {
      logger.error('❌ S3 connection failed:', {
        error: error.message,
        code: error.Code
      });
      return false;
    }
  }
}

module.exports = new S3Service();