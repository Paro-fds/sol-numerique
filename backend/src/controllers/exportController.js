// backend/src/controllers/exportController.js
const exportService = require('../services/exportService');
const logger = require('../utils/logger');

class ExportController {

  /**
   * Exporter l'historique des paiements en CSV
   * @route GET /api/export/payments/csv
   */
  async exportPaymentsCSV(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const isAdmin = req.user.role === 'admin';

      logger.info('📥 Export paiements CSV', { userId, isAdmin });

      const filters = {
        userId: isAdmin ? req.query.userId : userId, // Admin peut voir tous les users
        solId: req.query.solId,
        status: req.query.status,
        method: req.query.method,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // Générer le CSV
      const csv = await exportService.exportPaymentsToCSV(filters);

      // Nom du fichier
      const filename = `paiements_${new Date().toISOString().split('T')[0]}.csv`;

      // Envoyer le fichier
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));

      res.send('\uFEFF' + csv); // BOM pour Excel

      logger.info('✅ Export CSV envoyé', { filename });

    } catch (error) {
      logger.error('❌ Erreur export CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'export CSV'
      });
    }
  }

  /**
   * Exporter les participants d'un Sol en CSV
   * @route GET /api/export/sols/:solId/participants/csv
   */
  async exportSolParticipantsCSV(req, res, next) {
    try {
      const { solId } = req.params;
      const userId = req.user.id || req.user.userId;

      logger.info('📥 Export participants Sol CSV', { solId, userId });

      // Vérifier que l'utilisateur a accès à ce Sol
      // (soit admin, soit créateur, soit participant)
      // TODO: Ajouter vérification des permissions

      const csv = await exportService.exportSolParticipantsToCSV(solId);

      const filename = `participants_sol_${solId}_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));

      res.send('\uFEFF' + csv);

      logger.info('✅ Export participants CSV envoyé', { filename });

    } catch (error) {
      logger.error('❌ Erreur export participants CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'export des participants'
      });
    }
  }

  /**
   * Générer un rapport PDF des paiements
   * @route GET /api/export/payments/pdf
   */
  async exportPaymentsPDF(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const isAdmin = req.user.role === 'admin';

      logger.info('📄 Export paiements PDF', { userId, isAdmin });

      const filters = {
        userId: isAdmin ? req.query.userId : userId,
        solId: req.query.solId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // Générer le PDF
      const pdfBuffer = await exportService.generatePaymentsReportPDF(filters);

      const filename = `rapport_paiements_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      logger.info('✅ Export PDF envoyé', { filename });

    } catch (error) {
      logger.error('❌ Erreur export PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération du PDF'
      });
    }
  }

  /**
   * Générer un rapport mensuel pour un Sol
   * @route GET /api/export/sols/:solId/monthly-report
   */
  async exportMonthlyReport(req, res, next) {
    try {
      const { solId } = req.params;
      const { month } = req.query; // Format: YYYY-MM

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
          success: false,
          error: 'Format de mois invalide. Utilisez YYYY-MM'
        });
      }

      logger.info('📄 Génération rapport mensuel', { solId, month });

      const pdfBuffer = await exportService.generateMonthlyReportPDF(solId, month);

      const filename = `rapport_mensuel_sol_${solId}_${month}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      logger.info('✅ Rapport mensuel envoyé', { filename });

    } catch (error) {
      logger.error('❌ Erreur rapport mensuel:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération du rapport mensuel'
      });
    }
  }

  /**
   * Obtenir les options d'export disponibles
   * @route GET /api/export/options
   */
  async getExportOptions(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const isAdmin = req.user.role === 'admin';

      res.json({
        success: true,
        options: {
          formats: [
            { value: 'csv', label: 'CSV (Excel)', icon: '📊' },
            { value: 'pdf', label: 'PDF', icon: '📄' }
          ],
          filters: {
            status: [
              { value: 'all', label: 'Tous les statuts' },
              { value: 'pending', label: 'En attente' },
              { value: 'validated', label: 'Validés' },
              { value: 'completed', label: 'Complétés' },
              { value: 'rejected', label: 'Rejetés' }
            ],
            method: [
              { value: 'all', label: 'Toutes les méthodes' },
              { value: 'stripe', label: 'Stripe' },
              { value: 'offline', label: 'Hors ligne' }
            ]
          },
          canExportAll: isAdmin
        }
      });

    } catch (error) {
      logger.error('❌ Erreur options export:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du chargement des options'
      });
    }
  }
}

module.exports = new ExportController();