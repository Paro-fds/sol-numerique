const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class S3Service {
  constructor() {
    this.uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  }

  async uploadFile(filename, buffer, mimetype) {
    try {
      // Créer le dossier uploads s'il n'existe pas
      await fs.mkdir(this.uploadsDir, { recursive: true });

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      const uniqueFilename = `${timestamp}-${basename}${ext}`;
      const filepath = path.join(this.uploadsDir, uniqueFilename);

      // Sauvegarder le fichier
      await fs.writeFile(filepath, buffer);

      logger.info('File uploaded locally', {
        filename: uniqueFilename,
        size: buffer.length,
        mimetype
      });

      return {
        filename: uniqueFilename,
        path: filepath,
        url: `/uploads/${uniqueFilename}`
      };
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  async deleteFile(filename) {
    try {
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);

      logger.info('File deleted', { filename });
    } catch (error) {
      logger.error('File deletion error:', error);
      throw error;
    }
  }

  async getFileUrl(filename) {
    return `/uploads/${filename}`;
  }

  getFilePath(filename) {
    return path.join(this.uploadsDir, filename);
  }
}

module.exports = new S3Service();