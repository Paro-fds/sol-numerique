// backend/src/services/pdfService.js
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class PDFService {
  /**
   * Génère un reçu de paiement en PDF
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Buffer>} - Buffer du PDF généré
   */
  generatePaymentReceipt(paymentData) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width;

      // En-tête avec couleur
      doc.rect(0, 0, pageWidth, 80).fill('#2874A6');
      
      // Logo/Titre
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('SOL NUMÉRIQUE', 0, 20, { align: 'center' });
      
      doc.fontSize(14)
         .font('Helvetica')
         .text('Reçu de Paiement', 0, 50, { align: 'center' });
      
      // Réinitialiser la couleur
      doc.fillColor('#000000');
      
      // Informations du reçu
      doc.moveDown(3);
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Numéro de reçu: ${paymentData.receiptNumber || paymentData.id}`, 50);
      
      doc.text(`Date: ${new Date(paymentData.date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      
      doc.text(`Statut: ${paymentData.status === 'validated' ? '✓ VALIDÉ' : '⏳ EN ATTENTE'}`);
      
      // Ligne de séparation
      doc.moveDown();
      doc.strokeColor('#CCCCCC')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(pageWidth - 50, doc.y)
         .stroke();
      
      // Informations du membre
      doc.moveDown();
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2874A6')
         .text('Informations du Membre');
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');
      
      doc.text(`Nom: ${paymentData.memberName}`, { indent: 20 });
      doc.text(`Email: ${paymentData.memberEmail}`, { indent: 20 });
      
      if (paymentData.memberPhone) {
        doc.text(`Téléphone: ${paymentData.memberPhone}`, { indent: 20 });
      }
      
      // Informations du Sol
      doc.moveDown();
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2874A6')
         .text('Informations du Sol');
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');
      
      doc.text(`Nom du Sol: ${paymentData.solName}`, { indent: 20 });
      doc.text(`Fréquence: ${this.getFrequencyLabel(paymentData.frequency)}`, { indent: 20 });
      
      // Détails du paiement - Cadre
      doc.moveDown();
      const detailsY = doc.y;
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2874A6')
         .text('Détails du Paiement');
      
      doc.moveDown(0.5);
      
      // Tableau des détails
      const tableTop = doc.y;
      const col1X = 70;
      const col2X = pageWidth - 150;
      
      // En-tête du tableau
      doc.rect(50, tableTop, pageWidth - 100, 25)
         .fill('#F0F0F0');
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Description', col1X, tableTop + 8);
      
      doc.text('Montant', col2X, tableTop + 8);
      
      // Lignes du tableau
      let currentY = tableTop + 25;
      const rowHeight = 30;
      
      // Ligne 1 - Contribution
      doc.font('Helvetica')
         .text('Contribution au Sol', col1X, currentY + 8);
      
      doc.font('Helvetica-Bold')
         .text(`${paymentData.amount.toFixed(2)} HTG`, col2X, currentY + 8);
      
      currentY += rowHeight;
      
      // Ligne 2 - Méthode
      doc.font('Helvetica')
         .text('Méthode de paiement', col1X, currentY + 8);
      
      doc.text(paymentData.method === 'stripe' ? 'Stripe (en ligne)' : 'Hors ligne', col2X, currentY + 8);
      
      currentY += rowHeight;
      
      // Ligne 3 - ID Transaction (si Stripe)
      if (paymentData.stripeChargeId) {
        doc.text('ID Transaction Stripe', col1X, currentY + 8);
        doc.fontSize(8)
           .text(paymentData.stripeChargeId, col2X, currentY + 8, { width: 100 });
        doc.fontSize(10);
        currentY += rowHeight;
      }
      
      // Ligne de séparation finale
      doc.strokeColor('#2874A6')
         .lineWidth(2)
         .moveTo(50, currentY + 5)
         .lineTo(pageWidth - 50, currentY + 5)
         .stroke();
      
      // Total
      currentY += 15;
      doc.rect(50, currentY, pageWidth - 100, 30)
         .fill('#2874A6');
      
      doc.fillColor('#FFFFFF')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL:', col1X, currentY + 8);
      
      doc.text(`${paymentData.amount.toFixed(2)} HTG`, col2X, currentY + 8);
      
      // Note de validation
      doc.fillColor('#000000');
      currentY += 50;
      
      if (paymentData.status === 'validated' && paymentData.validatedBy) {
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .fillColor('#27AE60');
        
        doc.text(`✓ Validé par: ${paymentData.validatedBy}`, 50, currentY);
        
        if (paymentData.validatedDate) {
          doc.text(
            `Date de validation: ${new Date(paymentData.validatedDate).toLocaleDateString('fr-FR')}`,
            50
          );
        }
      }
      
      // Pied de page
      const footerY = doc.page.height - 80;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#888888');
      
      doc.text(
        'Ce reçu est généré automatiquement par le système Sol Numérique',
        50,
        footerY,
        { align: 'center', width: pageWidth - 100 }
      );
      
      doc.text(
        'Pour toute question, contactez: support@sol-numerique.com',
        50,
        footerY + 15,
        { align: 'center', width: pageWidth - 100 }
      );
      
      doc.text(
        `Généré le: ${new Date().toLocaleString('fr-FR')}`,
        50,
        footerY + 30,
        { align: 'center', width: pageWidth - 100 }
      );
      
      // Finaliser le PDF
      doc.end();
    });
  }

  /**
   * Envoie un reçu par email
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendReceiptByEmail(paymentData) {
    try {
      const pdfBuffer = await this.generatePaymentReceipt(paymentData);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@sol-numerique.com',
        to: paymentData.memberEmail,
        subject: `Reçu de paiement - Sol ${paymentData.solName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2874A6; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
              .amount { color: #27AE60; font-weight: bold; font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Sol Numérique</h1>
                <p>Reçu de paiement validé</p>
              </div>
              <div class="content">
                <h2>Bonjour ${paymentData.memberName},</h2>
                <p>Nous vous confirmons que votre paiement a été validé avec succès.</p>
                <p><strong>Détails du paiement:</strong></p>
                <ul>
                  <li>Sol: <strong>${paymentData.solName}</strong></li>
                  <li>Montant: <span class="amount">${paymentData.amount.toFixed(2)} HTG</span></li>
                  <li>Date: ${new Date(paymentData.date).toLocaleDateString('fr-FR')}</li>
                  <li>Méthode: ${paymentData.method === 'stripe' ? 'Stripe' : 'Hors ligne'}</li>
                </ul>
                <p>Vous trouverez votre reçu officiel en pièce jointe de cet email.</p>
                <p>Merci de votre participation !</p>
              </div>
              <div class="footer">
                <p>Cordialement,<br/>L'équipe Sol Numérique</p>
                <p>Pour toute question: support@sol-numerique.com</p>
              </div>
            </div>
          </body>
          </html>
        `,
        attachments: [{
          filename: `recu_${paymentData.id}_${Date.now()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      };

      const info = await transporter.sendMail(mailOptions);
      
      logger.info(`Reçu envoyé par email à ${paymentData.memberEmail}`, {
        messageId: info.messageId,
        paymentId: paymentData.id
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du reçu par email:', error);
      throw error;
    }
  }

  /**
   * Génère un rapport mensuel PDF
   * @param {Object} reportData - Données du rapport
   * @returns {Promise<Buffer>} - Buffer du PDF
   */
  generateMonthlyReport(reportData) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;

      // En-tête
      doc.rect(0, 0, pageWidth, 60).fill('#2874A6');
      
      doc.fillColor('#FFFFFF')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('RAPPORT MENSUEL', 0, 15, { align: 'center' });
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`${reportData.month} ${reportData.year}`, 0, 42, { align: 'center' });
      
      // Réinitialiser
      doc.fillColor('#000000');
      doc.moveDown(2);

      // Résumé
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Résumé', 50);
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica');
      
      doc.text(`Sol: ${reportData.solName}`, 50);
      doc.text(`Total des paiements: ${reportData.totalPayments}`);
      doc.text(`Montant total: ${reportData.totalAmount.toFixed(2)} HTG`);
      doc.text(`Paiements validés: ${reportData.validatedPayments}`);
      doc.text(`En attente: ${reportData.pendingPayments}`);
      
      // Tableau des paiements
      doc.moveDown(2);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Détails des Paiements', 50);
      
      // En-tête du tableau
      const tableTop = doc.y + 10;
      const colWidths = [80, 120, 80, 80, 80];
      const colPositions = [50, 130, 250, 330, 410];
      
      doc.rect(50, tableTop, pageWidth - 100, 20).fill('#F0F0F0');
      
      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold');
      
      doc.text('Date', colPositions[0], tableTop + 5);
      doc.text('Membre', colPositions[1], tableTop + 5);
      doc.text('Montant', colPositions[2], tableTop + 5);
      doc.text('Méthode', colPositions[3], tableTop + 5);
      doc.text('Statut', colPositions[4], tableTop + 5);
      
      // Lignes du tableau
      let currentY = tableTop + 20;
      doc.font('Helvetica').fontSize(8);
      
      reportData.payments.forEach((payment, index) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }
        
        // Alterner les couleurs de fond
        if (index % 2 === 0) {
          doc.rect(50, currentY, pageWidth - 100, 18).fill('#FAFAFA');
        }
        
        doc.fillColor('#000000');
        doc.text(new Date(payment.date).toLocaleDateString('fr-FR'), colPositions[0], currentY + 4);
        doc.text(payment.memberName.substring(0, 20), colPositions[1], currentY + 4);
        doc.text(`${payment.amount.toFixed(2)} HTG`, colPositions[2], currentY + 4);
        doc.text(payment.method === 'stripe' ? 'Stripe' : 'Hors ligne', colPositions[3], currentY + 4);
        doc.text(payment.status === 'validated' ? 'Validé' : 'En attente', colPositions[4], currentY + 4);
        
        currentY += 18;
      });
      
      // Pied de page
      const footerY = doc.page.height - 50;
      doc.fontSize(8)
         .fillColor('#888888')
         .text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 0, footerY, {
           align: 'center'
         });
      
      doc.end();
    });
  }

  /**
   * Convertit la fréquence en label lisible
   * @param {string} frequency - Fréquence
   * @returns {string} - Label
   */
  getFrequencyLabel(frequency) {
    const labels = {
      'hebdomadaire': 'Hebdomadaire',
      'bimensuel': 'Bimensuel',
      'mensuel': 'Mensuel'
    };
    return labels[frequency] || frequency;
  }

  /**
   * Teste la configuration email
   * @returns {Promise<boolean>}
   */
  async testEmailConfiguration() {
    try {
      await transporter.verify();
      logger.info('Configuration email valide');
      return true;
    } catch (error) {
      logger.error('Configuration email invalide:', error);
      return false;
    }
  }
}

module.exports = new PDFService();