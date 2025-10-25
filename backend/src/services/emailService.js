const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const emailConfig = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: emailConfig.service,
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth
      });

      logger.info('Email transporter initialized', {
        service: emailConfig.service,
        host: emailConfig.host
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Charger et compiler un template email
   */
  async loadTemplate(templateName) {
    try {
      // Vérifier le cache
      if (this.templatesCache.has(templateName)) {
        return this.templatesCache.get(templateName);
      }

      const templatePath = path.join(
        __dirname,
        '../templates/emails',
        `${templateName}.html`
      );

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);

      // Mettre en cache
      this.templatesCache.set(templateName, compiledTemplate);

      return compiledTemplate;
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un email
   */
  async sendEmail({ to, subject, template, data, attachments = [] }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Charger et compiler le template
      const compiledTemplate = await this.loadTemplate(template);
      const html = compiledTemplate(data);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
        to,
        subject,
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        template,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', {
        to,
        subject,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Email de bienvenue
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Bienvenue sur Sol Numérique ! 🎉',
      template: 'welcome',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
      }
    });
  }

  /**
   * Email de confirmation d'adhésion à un Sol
   */
  async sendSolJoinedEmail(user, sol, ordre) {
    return this.sendEmail({
      to: user.email,
      subject: `Vous avez rejoint le Sol "${sol.nom}" 🎊`,
      template: 'sol-joined',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        solDescription: sol.description,
        montant: sol.montant_par_periode,
        frequence: sol.frequence,
        ordre,
        maxParticipants: sol.max_participants
      }
    });
  }

  /**
   * Email de notification de paiement reçu
   */
  async sendPaymentReceivedEmail(user, sol, payment) {
    return this.sendEmail({
      to: user.email,
      subject: `Paiement reçu pour le Sol "${sol.nom}" ✅`,
      template: 'payment-received',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        date: new Date(payment.created_at).toLocaleDateString('fr-FR')
      }
    });
  }

  /**
   * Email de validation de paiement (pour le payeur)
   */
  async sendPaymentValidatedEmail(user, sol, payment) {
    return this.sendEmail({
      to: user.email,
      subject: `Votre paiement a été validé pour "${sol.nom}" 🎉`,
      template: 'payment-validated',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        amount: payment.amount,
        date: new Date(payment.validated_at).toLocaleDateString('fr-FR')
      }
    });
  }

  /**
   * Email "C'est votre tour de recevoir !"
   */
  async sendYourTurnEmail(user, sol, tourNumber, totalAmount) {
    return this.sendEmail({
      to: user.email,
      subject: `🎊 C'est votre tour de recevoir dans "${sol.nom}" !`,
      template: 'your-turn',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        tourNumber,
        totalAmount,
        accountNumber: user.account_number || 'Non renseigné'
      }
    });
  }

  /**
   * Email de notification au créateur (tous les paiements validés)
   */
  async sendTourCompletedEmail(creator, sol, tourNumber, beneficiary) {
    return this.sendEmail({
      to: creator.email,
      subject: `Tour ${tourNumber} terminé pour "${sol.nom}" ✅`,
      template: 'tour-completed',
      data: {
        firstname: creator.firstname,
        lastname: creator.lastname,
        solName: sol.nom,
        tourNumber,
        beneficiaryName: `${beneficiary.firstname} ${beneficiary.lastname}`,
        nextTour: tourNumber + 1
      }
    });
  }

  /**
   * Email de Sol terminé
   */
  async sendSolCompletedEmail(user, sol) {
    return this.sendEmail({
      to: user.email,
      subject: `Le Sol "${sol.nom}" est terminé ! 🎉`,
      template: 'sol-completed',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        totalAmount: sol.montant_par_periode * sol.max_participants
      }
    });
  }

  /**
   * Email de rappel de paiement
   */
  async sendPaymentReminderEmail(user, sol, daysRemaining) {
    return this.sendEmail({
      to: user.email,
      subject: `⏰ Rappel : Paiement à effectuer pour "${sol.nom}"`,
      template: 'payment-reminder',
      data: {
        firstname: user.firstname,
        lastname: user.lastname,
        solName: sol.nom,
        amount: sol.montant_par_periode,
        daysRemaining,
        tourNumber: sol.tour_actuel
      }
    });
  }

  /**
   * Email au créateur : nouveau participant
   */
  async sendNewParticipantEmail(creator, sol, newParticipant) {
    return this.sendEmail({
      to: creator.email,
      subject: `Nouveau participant dans "${sol.nom}" 👥`,
      template: 'new-participant',
      data: {
        firstname: creator.firstname,
        lastname: creator.lastname,
        solName: sol.nom,
        participantName: `${newParticipant.firstname} ${newParticipant.lastname}`,
        participantEmail: newParticipant.email,
        currentParticipants: sol.membres_actuels,
        maxParticipants: sol.max_participants
      }
    });
  }

  /**
   * Vérifier la configuration email
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      logger.info('Email server connection verified');
      return true;
    } catch (error) {
      logger.error('Email server connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();