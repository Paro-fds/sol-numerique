// backend/src/services/exportService.js
// backend/src/services/exportService.js
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const db = require('../config/database');

class ExportService {

  /**
   * Exporter l'historique des paiements en CSV
   * @param {Object} filters - Filtres de recherche
   * @param {number} userId - ID utilisateur (optionnel, pour filtrer par user)
   * @returns {Promise<string>} - CSV string
   */
  async exportPaymentsToCSV(filters = {}) {
    try {
      logger.info('📥 Export paiements CSV', { filters });

      // Construire la requête
      let query = `
        SELECT 
          p.id,
          p.created_at as date_paiement,
          CONCAT(u.firstname, ' ', u.lastname) as membre,
          u.email,
          s.nom as sol,
          p.amount as montant,
          p.method as methode,
          p.status as statut,
          p.receipt_path as recu,
          part.ordre as tour,
          p.validated_at as date_validation,
          CONCAT(admin.firstname, ' ', admin.lastname) as valide_par
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN participations part ON p.participation_id = part.id
        JOIN sols s ON part.sol_id = s.id
        LEFT JOIN users admin ON p.validated_by = admin.id
        WHERE 1=1
      `;

      const params = [];

      // Filtres
      if (filters.userId) {
        query += ' AND p.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.solId) {
        query += ' AND part.sol_id = ?';
        params.push(filters.solId);
      }

      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.method) {
        query += ' AND p.method = ?';
        params.push(filters.method);
      }

      if (filters.startDate) {
        query += ' AND p.created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND p.created_at <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY p.created_at DESC';

      const payments = await db.executeQuery(query, params);

      // Formater les données pour CSV
      const csvData = payments.map(payment => ({
        'ID': payment.id,
        'Date': new Date(payment.date_paiement).toLocaleDateString('fr-FR'),
        'Membre': payment.membre,
        'Email': payment.email,
        'Sol': payment.sol,
        'Montant (HTG)': parseFloat(payment.montant).toFixed(2),
        'Méthode': payment.methode === 'stripe' ? 'Stripe (en ligne)' : 'Virement bancaire',
        'Statut': this._getStatusLabel(payment.statut),
        'Tour': payment.tour || '-',
        'Date validation': payment.date_validation ? 
          new Date(payment.date_validation).toLocaleDateString('fr-FR') : '-',
        'Validé par': payment.valide_par || '-'
      }));

      // Convertir en CSV
      const fields = [
        'ID', 
        'Date', 
        'Membre', 
        'Email', 
        'Sol', 
        'Montant (HTG)', 
        'Méthode', 
        'Statut', 
        'Tour',
        'Date validation',
        'Validé par'
      ];

      const parser = new Parser({ fields, delimiter: ';' });
      const csv = parser.parse(csvData);

      logger.info('✅ Export CSV généré', { count: payments.length });

      return csv;

    } catch (error) {
      logger.error('❌ Erreur export CSV:', error);
      throw error;
    }
  }

  /**
   * Exporter les participations d'un Sol en CSV
   * @param {number} solId - ID du Sol
   * @returns {Promise<string>} - CSV string
   */
  async exportSolParticipantsToCSV(solId) {
    try {
      logger.info('📥 Export participants Sol CSV', { solId });

      const query = `
        SELECT 
          part.id,
          part.ordre as tour,
          CONCAT(u.firstname, ' ', u.lastname) as membre,
          u.email,
          u.phone as telephone,
          part.statut_tour as statut,
          part.created_at as date_inscription,
          COUNT(p.id) as nb_paiements,
          SUM(CASE WHEN p.status = 'validated' OR p.status = 'completed' 
              THEN p.amount ELSE 0 END) as total_paye
        FROM participations part
        JOIN users u ON part.user_id = u.id
        LEFT JOIN payments p ON part.id = p.participation_id
        WHERE part.sol_id = ?
        GROUP BY part.id, u.id
        ORDER BY part.ordre ASC
      `;

      const participants = await db.executeQuery(query, [solId]);

      // Récupérer les infos du Sol
      const solQuery = 'SELECT nom, montant_par_periode FROM sols WHERE id = ?';
      const sols = await db.executeQuery(solQuery, [solId]);
      const sol = sols[0];

      // Formater pour CSV
      const csvData = participants.map(p => ({
        'Tour': p.tour,
        'Membre': p.membre,
        'Email': p.email,
        'Téléphone': p.telephone || '-',
        'Statut': this._getParticipationStatusLabel(p.statut),
        'Date inscription': new Date(p.date_inscription).toLocaleDateString('fr-FR'),
        'Nb paiements': p.nb_paiements,
        'Total payé (HTG)': parseFloat(p.total_paye || 0).toFixed(2),
        'Montant dû (HTG)': parseFloat(sol.montant_par_periode).toFixed(2)
      }));

      const fields = [
        'Tour',
        'Membre',
        'Email',
        'Téléphone',
        'Statut',
        'Date inscription',
        'Nb paiements',
        'Total payé (HTG)',
        'Montant dû (HTG)'
      ];

      const parser = new Parser({ fields, delimiter: ';' });
      const csv = parser.parse(csvData);

      logger.info('✅ Export participants CSV généré', { 
        solId, 
        count: participants.length 
      });

      return csv;

    } catch (error) {
      logger.error('❌ Erreur export participants CSV:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport PDF des paiements
   * @param {Object} filters - Filtres
   * @returns {Promise<Buffer>} - PDF Buffer
   */
  async generatePaymentsReportPDF(filters = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info('📄 Génération rapport PDF', { filters });

        // Récupérer les données
        let query = `
          SELECT 
            p.id,
            p.created_at,
            CONCAT(u.firstname, ' ', u.lastname) as membre,
            s.nom as sol,
            p.amount,
            p.method,
            p.status
          FROM payments p
          JOIN users u ON p.user_id = u.id
          JOIN participations part ON p.participation_id = part.id
          JOIN sols s ON part.sol_id = s.id
          WHERE 1=1
        `;

        const params = [];

        if (filters.userId) {
          query += ' AND p.user_id = ?';
          params.push(filters.userId);
        }

        if (filters.solId) {
          query += ' AND part.sol_id = ?';
          params.push(filters.solId);
        }

        if (filters.startDate) {
          query += ' AND p.created_at >= ?';
          params.push(filters.startDate);
        }

        if (filters.endDate) {
          query += ' AND p.created_at <= ?';
          params.push(filters.endDate);
        }

        query += ' ORDER BY p.created_at DESC';

        const payments = await db.executeQuery(query, params);

        // Calculer les stats
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const validatedCount = payments.filter(p => 
          p.status === 'validated' || p.status === 'completed'
        ).length;
        const pendingCount = payments.filter(p => 
          p.status === 'pending' || p.status === 'uploaded'
        ).length;

        // Créer le PDF
        const doc = new PDFDocument({ 
          size: 'A4',
          margin: 50,
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;

        // En-tête
        doc.rect(0, 0, pageWidth, 80).fill('#1e40af');

        doc.fillColor('#FFFFFF')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('RAPPORT DES PAIEMENTS', 0, 20, { align: 'center' });

        doc.fontSize(12)
           .font('Helvetica')
           .text(
             `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
             0,
             55,
             { align: 'center' }
           );

        doc.fillColor('#000000');
        doc.moveDown(3);

        // Période
        if (filters.startDate || filters.endDate) {
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .text('Période:', 50);

          let periode = '';
          if (filters.startDate) {
            periode += `Du ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`;
          }
          if (filters.endDate) {
            periode += ` au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`;
          }

          doc.font('Helvetica')
             .text(periode, 120, doc.y - 12);

          doc.moveDown();
        }

        // Statistiques
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Résumé', 50);

        doc.moveDown(0.5);

        // Boîtes de stats
        const statsY = doc.y;
        const boxWidth = (pageWidth - 120) / 3;
        const boxHeight = 70;

        // Box 1 - Total paiements
        doc.roundedRect(50, statsY, boxWidth, boxHeight, 5)
           .fillAndStroke('#eff6ff', '#2563eb');

        doc.fillColor('#1e40af')
           .fontSize(10)
           .font('Helvetica')
           .text('Total paiements', 60, statsY + 15, { width: boxWidth - 20 });

        doc.fillColor('#1e40af')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text(payments.length.toString(), 60, statsY + 35, { width: boxWidth - 20 });

        // Box 2 - Montant total
        const box2X = 60 + boxWidth;
        doc.roundedRect(box2X, statsY, boxWidth, boxHeight, 5)
           .fillAndStroke('#f0fdf4', '#10b981');

        doc.fillColor('#047857')
           .fontSize(10)
           .font('Helvetica')
           .text('Montant total', box2X + 10, statsY + 15, { width: boxWidth - 20 });

        doc.fillColor('#047857')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text(
             `${totalAmount.toFixed(2)} HTG`,
             box2X + 10,
             statsY + 35,
             { width: boxWidth - 20 }
           );

        // Box 3 - Validés
        const box3X = 70 + boxWidth * 2;
        doc.roundedRect(box3X, statsY, boxWidth, boxHeight, 5)
           .fillAndStroke('#fef3c7', '#f59e0b');

        doc.fillColor('#92400e')
           .fontSize(10)
           .font('Helvetica')
           .text('Validés / En attente', box3X + 10, statsY + 15, { width: boxWidth - 20 });

        doc.fillColor('#92400e')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text(
             `${validatedCount} / ${pendingCount}`,
             box3X + 10,
             statsY + 35,
             { width: boxWidth - 20 }
           );

        doc.fillColor('#000000');
        doc.y = statsY + boxHeight + 30;

        // Tableau des paiements
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Détails des paiements', 50);

        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colPositions = [50, 110, 230, 340, 430, 500];
        const colWidths = [60, 120, 110, 90, 70, 50];

        // En-tête du tableau
        doc.rect(50, tableTop, pageWidth - 100, 25).fill('#f3f4f6');

        doc.fillColor('#374151')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Date', colPositions[0], tableTop + 8)
           .text('Membre', colPositions[1], tableTop + 8)
           .text('Sol', colPositions[2], tableTop + 8)
           .text('Montant', colPositions[3], tableTop + 8)
           .text('Méthode', colPositions[4], tableTop + 8)
           .text('Statut', colPositions[5], tableTop + 8);

        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(8).fillColor('#000000');

        // Lignes du tableau
        payments.forEach((payment, index) => {
          // Nouvelle page si nécessaire
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
          }

          // Alterner les couleurs
          if (index % 2 === 0) {
            doc.rect(50, currentY, pageWidth - 100, 20).fill('#fafafa');
          }

          doc.fillColor('#000000');

          // Date
          doc.text(
            new Date(payment.created_at).toLocaleDateString('fr-FR'),
            colPositions[0],
            currentY + 6,
            { width: colWidths[0] }
          );

          // Membre
          doc.text(
            payment.membre.substring(0, 18),
            colPositions[1],
            currentY + 6,
            { width: colWidths[1] }
          );

          // Sol
          doc.text(
            payment.sol.substring(0, 15),
            colPositions[2],
            currentY + 6,
            { width: colWidths[2] }
          );

          // Montant
          doc.text(
            `${parseFloat(payment.amount).toFixed(2)}`,
            colPositions[3],
            currentY + 6,
            { width: colWidths[3] }
          );

          // Méthode
          doc.text(
            payment.method === 'stripe' ? 'Stripe' : 'Offline',
            colPositions[4],
            currentY + 6,
            { width: colWidths[4] }
          );

          // Statut
          const statusLabel = this._getStatusLabel(payment.status);
          doc.text(
            statusLabel.substring(0, 8),
            colPositions[5],
            currentY + 6,
            { width: colWidths[5] }
          );

          currentY += 20;
        });

        // Pied de page
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          const pageHeight = doc.page.height;
          const footerY = pageHeight - 60;

          doc.moveTo(50, footerY)
             .lineTo(pageWidth - 50, footerY)
             .stroke('#e5e7eb');

          doc.fontSize(8)
             .fillColor('#6b7280')
             .text(
               'Rapport généré automatiquement par Sol Numérique',
               0,
               footerY + 10,
               { align: 'center', width: pageWidth }
             );

          doc.text(
             `Page ${i + 1} sur ${pages.count}`,
             0,
             footerY + 25,
             { align: 'center', width: pageWidth }
           );
        }

        doc.end();

        logger.info('✅ Rapport PDF généré', { paymentsCount: payments.length });

      } catch (error) {
        logger.error('❌ Erreur génération PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Générer un rapport mensuel pour un Sol
   * @param {number} solId - ID du Sol
   * @param {string} month - Mois (YYYY-MM)
   * @returns {Promise<Buffer>} - PDF Buffer
   */
  async generateMonthlyReportPDF(solId, month) {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info('📄 Génération rapport mensuel', { solId, month });

        // Récupérer les infos du Sol
        const solQuery = 'SELECT * FROM sols WHERE id = ?';
        const sols = await db.executeQuery(solQuery, [solId]);
        const sol = sols[0];

        if (!sol) {
          throw new Error('Sol non trouvé');
        }

        // Période du mois
        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Récupérer les paiements du mois
        const paymentsQuery = `
          SELECT 
            p.*,
            CONCAT(u.firstname, ' ', u.lastname) as membre,
            part.ordre
          FROM payments p
          JOIN participations part ON p.participation_id = part.id
          JOIN users u ON p.user_id = u.id
          WHERE part.sol_id = ?
            AND DATE(p.created_at) >= ?
            AND DATE(p.created_at) <= ?
          ORDER BY p.created_at DESC
        `;

        const payments = await db.executeQuery(paymentsQuery, [
          solId,
          startDate,
          endDateStr
        ]);

        // Statistiques
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const validatedCount = payments.filter(p => 
          p.status === 'validated' || p.status === 'completed'
        ).length;
        const pendingCount = payments.filter(p => p.status === 'pending' || p.status === 'uploaded').length;

        // Créer le PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;

        // En-tête
        doc.rect(0, 0, pageWidth, 100).fill('#1e40af');

        doc.fillColor('#FFFFFF')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('RAPPORT MENSUEL', 0, 20, { align: 'center' });

        doc.fontSize(14)
           .font('Helvetica')
           .text(sol.nom, 0, 55, { align: 'center' });

        const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        });

        doc.fontSize(12)
           .text(monthName.toUpperCase(), 0, 75, { align: 'center' });

        doc.fillColor('#000000');
        doc.moveDown(3);

        // Informations du Sol
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Informations du Sol', 50);

        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000');

        doc.text(`Fréquence: ${this._getFrequencyLabel(sol.frequence)}`, 70);
        doc.text(`Montant par période: ${parseFloat(sol.montant_par_periode).toFixed(2)} HTG`, 70);
        doc.text(`Nombre de participants: ${sol.nombre_participants}`, 70);

        doc.moveDown(2);

        // Statistiques
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Statistiques du mois', 50);

        doc.moveDown(0.5);

        const statsData = [
          { label: 'Total des paiements', value: payments.length.toString() },
          { label: 'Montant total collecté', value: `${totalAmount.toFixed(2)} HTG` },
          { label: 'Paiements validés', value: validatedCount.toString() },
          { label: 'En attente de validation', value: pendingCount.toString() },
          { 
            label: 'Montant attendu', 
            value: `${(sol.montant_par_periode * sol.nombre_participants).toFixed(2)} HTG` 
          }
        ];

        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        statsData.forEach(stat => {
          doc.text(`${stat.label}:`, 70);
          doc.font('Helvetica-Bold')
             .text(stat.value, 250, doc.y - 12);
          doc.font('Helvetica');
          doc.moveDown(0.3);
        });

        doc.moveDown(2);

        // Liste des paiements
        if (payments.length > 0) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#1e40af')
             .text('Détails des paiements', 50);

          doc.moveDown(0.5);

          // Tableau
          const tableTop = doc.y;
          const colPositions = [50, 120, 280, 380, 480];

          doc.rect(50, tableTop, pageWidth - 100, 20).fill('#f3f4f6');

          doc.fillColor('#374151')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text('Date', colPositions[0], tableTop + 6)
             .text('Membre', colPositions[1], tableTop + 6)
             .text('Montant', colPositions[2], tableTop + 6)
             .text('Méthode', colPositions[3], tableTop + 6)
             .text('Statut', colPositions[4], tableTop + 6);

          let currentY = tableTop + 20;
          doc.font('Helvetica').fontSize(8).fillColor('#000000');

          payments.forEach((payment, index) => {
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = 50;
            }

            if (index % 2 === 0) {
              doc.rect(50, currentY, pageWidth - 100, 18).fill('#fafafa');
            }

            doc.fillColor('#000000');

            doc.text(
              new Date(payment.created_at).toLocaleDateString('fr-FR'),
              colPositions[0],
              currentY + 5
            );

            doc.text(
              payment.membre.substring(0, 20),
              colPositions[1],
              currentY + 5
            );

            doc.text(
              `${parseFloat(payment.amount).toFixed(2)} HTG`,
              colPositions[2],
              currentY + 5
            );

            doc.text(
              payment.method === 'stripe' ? 'Stripe' : 'Offline',
              colPositions[3],
              currentY + 5
            );

            doc.text(
              this._getStatusLabel(payment.status),
              colPositions[4],
              currentY + 5
            );

            currentY += 18;
          });
        }

        // Pied de page
        const footerY = doc.page.height - 60;

        doc.moveTo(50, footerY)
           .lineTo(pageWidth - 50, footerY)
           .stroke('#e5e7eb');

        doc.fontSize(8)
           .fillColor('#6b7280')
           .text(
             `Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`,
             0,
             footerY + 10,
             { align: 'center', width: pageWidth }
           );

        doc.end();

        logger.info('✅ Rapport mensuel généré', { solId, month });

      } catch (error) {
        logger.error('❌ Erreur génération rapport mensuel:', error);
        reject(error);
      }
    });
  }

  /**
   * Helpers
   */
  _getStatusLabel(status) {
    const labels = {
      'pending': 'En attente',
      'uploaded': 'Uploadé',
      'validated': 'Validé',
      'rejected': 'Rejeté',
      'completed': 'Complété'
    };
    return labels[status] || status;
  }

  _getParticipationStatusLabel(status) {
    const labels = {
      'en_attente': 'En attente',
      'payé': 'Payé',
      'reçu': 'Reçu',
      'terminé': 'Terminé'
    };
    return labels[status] || status;
  }

  _getFrequencyLabel(frequency) {
    const labels = {
      'hebdomadaire': 'Hebdomadaire',
      'bimensuel': 'Bimensuel',
      'mensuel': 'Mensuel'
    };
    return labels[frequency] || frequency;
  }
}

module.exports = new ExportService();