const app = require('./app');

const logger = require('./utils/logger');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Vérifier la connexion à la base de données
    await db.createPool();
    logger.info('Database connection verified');

    // Créer le dossier uploads s'il n'existe pas
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info('Uploads directory created');
    }

    // Démarrer le serveur
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Sol API server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Version: ${process.env.APP_VERSION || '1.0.0'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Gestion de l'arrêt gracieux
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Fermer la connexion à la base de données
          await db.close();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Forcer l'arrêt après 30 secondes
      setTimeout(() => {
        logger.error('Forceful shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Démarrer le serveur seulement si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = startServer;