const Payment = require('../models/Payment');
const Sol = require('../models/Sol');
const stripeService = require('../services/stripeService');
const s3Service = require('../services/s3Service');
const logger = require('../utils/logger');
const db = require('../config/database');
const webhookService = require('../services/webhookService');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService'); 

class PaymentController {

  // Créer une session Stripe
  async createStripeSession(req, res, next) {
    try {
      const { participationId, amount, solName } = req.body;
      const userId = req.user.id || req.user.userId;

      logger.info('🎯 Création session Stripe', {
        userId,
        participationId,
        amount
      });

      // Validation
      if (!participationId) {
        return res.status(400).json({
          success: false,
          error: 'participationId est requis'
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Montant invalide'
        });
      }

      // Vérifier la participation
      const participationQuery = `
        SELECT 
          p.*, 
          s.nom as sol_name, 
          s.montant_par_periode, 
          u.email,
          u.firstname,
          u.lastname
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ? AND p.user_id = ?
      `;
      
      const participations = await db.executeQuery(participationQuery, [participationId, userId]);

      if (!participations || participations.length === 0) {
        logger.error('❌ Participation non trouvée', { participationId, userId });
        return res.status(404).json({
          success: false,
          error: 'Participation non trouvée'
        });
      }

      const participation = participations[0];

      logger.info('✅ Participation trouvée', {
        participationId,
        solName: participation.sol_name,
        email: participation.email
      });

      // S'assurer qu'aucune valeur n'est undefined
      const paymentAmount = amount || participation.montant_par_periode;
      const paymentSolName = solName || participation.sol_name || 'Paiement Sol';
      const paymentEmail = participation.email || `user${userId}@sol-numerique.com`;

      logger.info('📤 Données pour Stripe', {
        amount: paymentAmount,
        participationId,
        userId,
        solName: paymentSolName,
        userEmail: paymentEmail
      });

      // Créer la session Stripe
      const session = await stripeService.createCheckoutSession({
        amount: paymentAmount,
        participationId: participationId,
        userId: userId,
        solName: paymentSolName,
        userEmail: paymentEmail
      });

      logger.info('✅ Session Stripe créée', { sessionId: session.sessionId });

      // Créer un enregistrement de paiement
      await Payment.create({
        participation_id: participationId,
        user_id: userId,
        amount: paymentAmount,
        method: 'stripe',
        status: 'pending',
        stripe_session_id: session.sessionId
      });

      logger.info('✅ Paiement enregistré en DB');

      res.json({
        success: true,
        sessionId: session.sessionId,
        url: session.url,
        message: 'Session créée avec succès'
      });

    } catch (error) {
      logger.error('❌ Create Stripe session error:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de la session',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload d'un reçu
  async uploadReceipt(req, res, next) {
    try {
      const { participationId } = req.body;
      const userId = req.user.id || req.user.userId;
      const file = req.file;

      logger.info('📤 Upload reçu', { participationId, userId });

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Fichier reçu requis'
        });
      }

      // Validation du type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Type de fichier invalide. Seuls JPEG, PNG et PDF sont autorisés.'
        });
      }

      // Validation de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'Fichier trop volumineux. Maximum 5MB.'
        });
      }

      // Vérifier la participation
      const participationQuery = `
        SELECT p.*, s.montant_par_periode, s.nom as sol_name
        FROM participations p
        JOIN sols s ON p.sol_id = s.id
        WHERE p.id = ? AND p.user_id = ?
      `;
      const participations = await db.executeQuery(participationQuery, [participationId, userId]);

      if (participations.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Participation non trouvée'
        });
      }

      const participation = participations[0];

      // Upload du fichier
      const uploadResult = await s3Service.uploadFile(
        file.originalname,
        file.buffer,
        file.mimetype
      );

      logger.info('✅ Fichier uploadé', { filename: uploadResult.filename });

    
    // Créer le paiement
    const payment = await Payment.create({
      participation_id: participationId,
      user_id: userId,
      amount: participation.montant_par_periode,
      method: 'offline',
      status: 'uploaded',
      receipt_path: uploadResult.filename
    });

    logger.info('✅ Paiement créé', {
      paymentId: payment.id,
      userId,
      participationId,
      filename: uploadResult.filename
    });

    // ✅ ENVOYER L'EMAIL DE CONFIRMATION
    try {
      const emailService = require('../services/emailService');
      
      // Récupérer les infos utilisateur
      const userQuery = 'SELECT firstname, lastname, email FROM users WHERE id = ?';
      const users = await db.executeQuery(userQuery, [userId]);
      const user = users[0];

      await emailService.sendPaymentReceivedEmail(
        user,
        { nom: participation.sol_name },
        {
          amount: participation.montant_par_periode,
          method: 'offline',
          status: 'uploaded',
          created_at: new Date()
        }
      );

      logger.info('✅ Payment received email sent', { userId, paymentId: payment.id });
    } catch (emailError) {
      logger.error('❌ Failed to send payment received email:', emailError);
    }

    res.json({
      success: true,
      message: 'Reçu uploadé avec succès. En attente de validation par l\'administrateur.',
      payment: payment.toJSON(),
      receiptUrl: uploadResult.url
    });

  } catch (error) {
    logger.error('❌ Upload receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du reçu',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
/**
 * Obtenir tous les reçus en attente (admin)
 * GET /api/payments/pending-receipts
 */
async getPendingReceipts(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    logger.info('📋 Getting pending receipts', { adminId: userId });

    const query = `
      SELECT 
        pay.id,
        pay.amount,
        pay.status,
        pay.method,
        pay.receipt_path,
        pay.notes,
        pay.created_at,
        pay.updated_at,
        p.id as participation_id,
        p.sol_id,
        s.nom as sol_name,
        u.id as payer_user_id,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname,
        u.email as payer_email
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE pay.status IN ('uploaded', 'pending')
        AND pay.receipt_path IS NOT NULL
      ORDER BY pay.created_at DESC
    `;

    const payments = await db.executeQuery(query);

    logger.info('✅ Pending receipts retrieved', {
      count: payments.length
    });

    res.json({
      success: true,
      count: payments.length,
      payments
    });

  } catch (error) {
    logger.error('❌ Get pending receipts error:', error);
    next(error);
  }
}

async getReceiptUrl(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    // ✅ LOGS DÉTAILLÉS
    logger.info('🔗 Getting receipt URL', { 
      paymentId: id, 
      userId,
      's3Service.useS3': s3Service.useS3,
      'AWS_S3_BUCKET_NAME': process.env.AWS_S3_BUCKET_NAME || 'NOT SET'
    });

    // Récupérer le paiement
    const paymentQuery = `
      SELECT 
        pay.*,
        p.user_id as payer_user_id,
        p.sol_id,
        s.created_by,
        s.nom as sol_name
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      WHERE pay.id = ?
    `;
    
    const payments = await db.executeQuery(paymentQuery, [id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = payments[0];

    // Vérifier l'accès
    const isAdmin = req.user.role === 'admin';
    const isCreator = payment.created_by === userId;
    const isPayer = payment.payer_user_id === userId;

    if (!isAdmin && !isCreator && !isPayer) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    if (!payment.receipt_path) {
      return res.status(404).json({
        success: false,
        error: 'Aucun reçu disponible'
      });
    }

    logger.info('📄 Receipt path found', { 
      receiptPath: payment.receipt_path,
      useS3: s3Service.useS3
    });

    // ✅ FORCER L'UTILISATION DE S3
    let receiptUrl;

    if (s3Service.useS3) {
      logger.info('📦 Generating S3 signed URL...');
      
      try {
        receiptUrl = await s3Service.getSignedViewUrl(payment.receipt_path, 3600);
        
        logger.info('✅ S3 URL generated successfully', { 
          urlPreview: receiptUrl.substring(0, 100) + '...'
        });

        return res.json({
          success: true,
          url: receiptUrl,
          filename: payment.receipt_path,
          storage: 's3',
          expiresIn: 3600
        });
        
      } catch (s3Error) {
        logger.error('❌ S3 URL generation failed:', {
          error: s3Error.message,
          code: s3Error.Code,
          stack: s3Error.stack
        });
        
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la génération de l\'URL S3',
          details: s3Error.message
        });
      }
    } else {
      // ⚠️ Mode local (ne devrait jamais arriver si S3 est configuré)
      logger.warn('⚠️ S3 NOT configured - using local fallback');
      
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const filename = payment.receipt_path.replace(/^receipts\//, '');
      receiptUrl = `${baseUrl}/uploads/receipts/${filename}`;
      
      return res.json({
        success: true,
        url: receiptUrl,
        filename: payment.receipt_path,
        storage: 'local',
        expiresIn: null
      });
    }

  } catch (error) {
    logger.error('❌ Get receipt URL error:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de l\'URL',
      message: error.message
    });
  }
}

/**
 * Rejeter un paiement (admin)
 * POST /api/payments/:id/reject
 */
async rejectPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'La raison du rejet est requise'
      });
    }

    logger.info('❌ Rejecting payment', { paymentId: id, adminId, reason });

    // Vérifier que le paiement existe
    const checkQuery = 'SELECT * FROM payments WHERE id = ?';
    const payments = await db.executeQuery(checkQuery, [id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = payments[0];

    // Mettre à jour le statut
    const updateQuery = `
      UPDATE payments 
      SET 
        status = 'rejected',
        notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await db.executeQuery(updateQuery, [
      `Rejeté: ${reason}`,
      id
    ]);

    logger.info('✅ Payment rejected', { 
      paymentId: id, 
      amount: payment.amount,
      adminId,
      reason
    });

    res.json({
      success: true,
      message: 'Paiement rejeté',
      payment: {
        ...payment,
        status: 'rejected',
        notes: `Rejeté: ${reason}`
      }
    });

  } catch (error) {
    logger.error('❌ Reject payment error:', error);
    next(error);
  }
}
  

  // ✅ VALIDER UN PAIEMENT (ADMIN) - AVEC DÉTECTION AUTO DE FIN DE TOUR
 /**
 * ✅ VALIDER UN PAIEMENT (ADMIN) - AVEC GÉNÉRATION PDF ET EMAIL
 */
async validatePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.userId || req.user.id;

    logger.info('🔍 Validation paiement demandée', { paymentId: id, userId });

    // Récupérer le paiement avec TOUTES les infos nécessaires
    const paymentQuery = `
      SELECT 
        pay.*,
        p.sol_id,
        p.user_id as payer_user_id,
        p.ordre,
        s.created_by,
        s.nom as sol_name,
        s.frequence,
        s.tour_actuel,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname,
        u.email as payer_email,
        u.phone as payer_phone,
        admin.firstname as admin_firstname,
        admin.lastname as admin_lastname
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users admin ON admin.id = ?
      WHERE pay.id = ?
    `;
    
    const payments = await db.executeQuery(paymentQuery, [userId, id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = payments[0];

    logger.info('📋 Paiement trouvé', {
      paymentId: id,
      status: payment.status,
      amount: payment.amount,
      payer: `${payment.payer_firstname} ${payment.payer_lastname}`
    });

    // Vérifier les permissions
    const isAdmin = req.user.role === 'admin';
    const isCreator = payment.created_by === userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Seul l\'administrateur ou le créateur du Sol peut valider les paiements'
      });
    }

    // Vérifier le statut
    if (payment.status === 'validated') {
      return res.status(400).json({
        success: false,
        error: 'Ce paiement est déjà validé'
      });
    }

    // Mettre à jour le statut
    const updateQuery = `
      UPDATE payments 
      SET status = 'validated',
          validated_by = ?,
          validated_at = NOW(),
          notes = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await db.executeQuery(updateQuery, [userId, notes || null, id]);

    logger.info('✅ Payment validated in DB', {
      paymentId: id,
      validatedBy: userId,
      solId: payment.sol_id
    });

    // ✅ GÉNÉRATION ET ENVOI DU REÇU PDF
    try {
      logger.info('📄 Génération du reçu PDF...');
      
      const paymentData = {
        id: payment.id,
        receiptNumber: `REC-${payment.id}-${Date.now()}`,
        date: payment.created_at || new Date(),
        status: 'validated',
        memberName: `${payment.payer_firstname} ${payment.payer_lastname}`,
        memberEmail: payment.payer_email,
        memberPhone: payment.payer_phone,
        solName: payment.sol_name,
        frequency: payment.frequence,
        amount: parseFloat(payment.amount),
        method: payment.method,
        stripeChargeId: payment.stripe_charge_id || null,
        validatedBy: `${payment.admin_firstname || ''} ${payment.admin_lastname || ''}`.trim() || 'Administrateur',
        validatedDate: new Date()
      };

      // Envoyer le reçu par email avec PDF
      await pdfService.sendReceiptByEmail(paymentData);

      logger.info('✅ PDF receipt generated and sent', {
        paymentId: id,
        email: payment.payer_email
      });
    } catch (pdfError) {
      logger.error('❌ PDF generation error (non-blocking):', {
        error: pdfError.message,
        stack: pdfError.stack
      });
      // Ne pas bloquer si le PDF échoue
    }

    // ✅ ENVOYER EMAIL DE VALIDATION (template différent)
    try {
      logger.info('📧 Envoi email de validation...');
      
      await emailService.sendPaymentValidatedEmail(
        {
          firstname: payment.payer_firstname,
          lastname: payment.payer_lastname,
          email: payment.payer_email
        },
        { nom: payment.sol_name },
        {
          amount: parseFloat(payment.amount),
          validated_at: new Date()
        }
      );

      logger.info('✅ Payment validated email sent successfully', { 
        paymentId: id, 
        payerEmail: payment.payer_email 
      });
    } catch (emailError) {
      logger.error('❌ Failed to send payment validated email:', {
        error: emailError.message,
        stack: emailError.stack
      });
    }

    // ✅ VÉRIFICATION AUTOMATIQUE DU TOUR
    try {
      logger.info('🔄 Vérification automatique du tour...');
      
      const TourDetectionService = require('../services/TourDetectionService');
      const tourCheck = await TourDetectionService.checkAndAdvanceTour(payment.sol_id);
      
      logger.info('📊 Résultat vérification tour', {
        tourComplete: tourCheck.tourComplete,
        solComplete: tourCheck.solComplete
      });
      
      if (tourCheck.tourComplete) {
        logger.info('🎉 Tour automatically advanced after payment validation', {
          paymentId: id,
          solId: payment.sol_id,
          previousTour: tourCheck.beneficiary?.ordre,
          nextTour: tourCheck.nextTour,
          solComplete: tourCheck.solComplete
        });

        // ✅ ENVOYER LES EMAILS DE FIN DE TOUR
        const creatorQuery = `
          SELECT u.firstname, u.lastname, u.email, s.nom as sol_name
          FROM users u
          JOIN sols s ON u.id = s.created_by
          WHERE s.id = ?
        `;
        const creators = await db.executeQuery(creatorQuery, [payment.sol_id]);
        const creator = creators[0];

        if (!tourCheck.solComplete) {
          // Tour terminé, pas le Sol
          await emailService.sendTourCompletedEmail(
            creator,
            { nom: creator.sol_name, id: payment.sol_id },
            tourCheck.beneficiary.ordre,
            tourCheck.beneficiary
          );

          logger.info('✅ Tour completed email sent to creator');

          // Email au prochain bénéficiaire
          if (tourCheck.nextBeneficiary) {
            const nextBeneficiaryQuery = `
              SELECT u.firstname, u.lastname, u.email, u.account_number, s.montant_par_periode
              FROM users u
              JOIN participations p ON u.id = p.user_id
              JOIN sols s ON p.sol_id = s.id
              WHERE p.id = ?
            `;
            const nextBenefs = await db.executeQuery(nextBeneficiaryQuery, [tourCheck.nextBeneficiary.participation_id]);
            const nextBenef = nextBenefs[0];

            const countQuery = 'SELECT COUNT(*) as total FROM participations WHERE sol_id = ?';
            const countResult = await db.executeQuery(countQuery, [payment.sol_id]);
            const totalAmount = nextBenef.montant_par_periode * countResult[0].total;

            const encryption = require('../utils/encryption');
            const accountNumber = nextBenef.account_number 
              ? encryption.decryptData(nextBenef.account_number) 
              : 'Non renseigné';

            await emailService.sendYourTurnEmail(
              nextBenef,
              { nom: creator.sol_name },
              tourCheck.nextTour,
              totalAmount
            );

            logger.info('✅ Your turn email sent to next beneficiary');
          }
        } else {
          // Sol terminé
          const participantsQuery = `
            SELECT DISTINCT u.firstname, u.lastname, u.email
            FROM users u
            JOIN participations p ON u.id = p.user_id
            WHERE p.sol_id = ?
          `;
          const allParticipants = await db.executeQuery(participantsQuery, [payment.sol_id]);

          for (const participant of allParticipants) {
            await emailService.sendSolCompletedEmail(
              participant,
              { nom: creator.sol_name }
            );
          }

          logger.info('✅ Sol completed emails sent to all participants');
        }
      }
    } catch (tourError) {
      logger.error('❌ Tour check failed after payment validation:', {
        error: tourError.message,
        stack: tourError.stack
      });
    }

    // Récupérer le paiement mis à jour
    const updatedPayment = await db.executeQuery(
      'SELECT * FROM payments WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Paiement validé avec succès. Un reçu PDF a été envoyé par email.',
      payment: updatedPayment[0]
    });

  } catch (error) {
    logger.error('❌ Validate payment error:', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

  // ✅ REJETER UN PAIEMENT (ADMIN)
  async rejectPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId || req.user.id;

      // Récupérer le paiement
      const paymentQuery = `
        SELECT 
          pay.*,
          p.sol_id,
          p.user_id,
          s.created_by
        FROM payments pay
        JOIN participations p ON pay.participation_id = p.id
        JOIN sols s ON p.sol_id = s.id
        WHERE pay.id = ?
      `;
      
      const payments = await db.executeQuery(paymentQuery, [id]);

      if (payments.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Paiement non trouvé'
        });
      }

      const payment = payments[0];

      // Vérifier les permissions
      const isAdmin = req.user.role === 'admin';
      const isCreator = payment.created_by === userId;

      if (!isAdmin && !isCreator) {
        return res.status(403).json({
          success: false,
          error: 'Seul l\'administrateur ou le créateur du Sol peut rejeter les paiements'
        });
      }

      // Mettre à jour le statut
      const updateQuery = `
        UPDATE payments 
        SET status = 'rejected',
            validated_by = ?,
            validated_at = NOW(),
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
      `;

      await db.executeQuery(updateQuery, [userId, reason || 'Paiement rejeté', id]);

      logger.info('❌ Payment rejected', {
        paymentId: id,
        rejectedBy: userId,
        reason
      });

      // Récupérer le paiement mis à jour
      const updatedPayment = await db.executeQuery(
        'SELECT * FROM payments WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Paiement rejeté',
        payment: updatedPayment[0]
      });

    } catch (error) {
      logger.error('❌ Reject payment error:', error);
      next(error);
    }
  }

  // Historique des paiements - VERSION ULTRA ROBUSTE
  async getPaymentHistory(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      
      if (!userId) {
        logger.error('❌ No userId found in request', { 
          user: req.user 
        });
        return res.status(401).json({
          success: false,
          error: 'Utilisateur non authentifié'
        });
      }

      const { status, method, limit } = req.query;

      logger.info('📋 Récupération historique paiements - START', { 
        userId, 
        status, 
        method, 
        limit,
        queryParams: req.query,
        userObject: req.user
      });

      const filters = {};
      
      if (status && typeof status === 'string') {
        filters.status = status.trim();
        logger.info('  ✓ Status filter:', filters.status);
      }
      
      if (method && typeof method === 'string') {
        filters.method = method.trim();
        logger.info('  ✓ Method filter:', filters.method);
      }
      
      if (limit !== undefined && limit !== null && limit !== '') {
        const limitNum = Number(limit);
        if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 1000) {
          filters.limit = Math.floor(limitNum);
          logger.info('  ✓ Limit set:', filters.limit);
        } else {
          logger.warn('  ⚠️ Invalid limit, using default 50', { 
            providedLimit: limit,
            type: typeof limit 
          });
          filters.limit = 50;
        }
      } else {
        filters.limit = 50;
        logger.info('  ✓ Default limit:', filters.limit);
      }

      logger.info('🔍 Filters prepared:', {
        filters,
        filterTypes: Object.keys(filters).reduce((acc, key) => {
          acc[key] = typeof filters[key];
          return acc;
        }, {})
      });
      
      logger.info('  → Calling Payment.findByUserId...');
      const payments = await Payment.findByUserId(userId, filters);
      logger.info('  ✅ Payment.findByUserId completed');

      logger.info('✅ Payments retrieved successfully', {
        userId,
        count: payments.length,
        filters
      });

      res.json({
        success: true,
        count: payments.length,
        payments: payments.map(p => p.toJSON ? p.toJSON() : p)
      });

    } catch (error) {
      logger.error('❌ Get payment history error - FULL DETAILS:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        errorName: error.name,
        userId: req.user?.id || req.user?.userId,
        query: req.query,
        headers: req.headers
      });
      
      res.status(500).json({
        success: false,
        error: 'Erreur lors du chargement de l\'historique',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          name: error.name
        } : undefined
      });
    }
  }

  // Obtenir un paiement
  async getPayment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user.userId;

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Paiement non trouvé'
        });
      }

      // Vérifier que l'utilisateur a accès
      if (payment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      res.json({
        success: true,
        payment: payment.toJSON ? payment.toJSON() : payment
      });

    } catch (error) {
      logger.error('❌ Get payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du chargement du paiement'
      });
    }
  }

  // Télécharger un reçu
  async downloadReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user.userId;

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Paiement non trouvé'
        });
      }

      // Vérifier l'accès
      if (payment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      if (!payment.receipt_path) {
        return res.status(404).json({
          success: false,
          error: 'Aucun reçu disponible'
        });
      }

      // Récupérer le fichier
      const filepath = s3Service.getFilePath(payment.receipt_path);
      
      logger.info('📥 Téléchargement reçu', { paymentId: id, filepath });
      
      res.download(filepath, `recu-${id}.pdf`);

    } catch (error) {
      logger.error('❌ Download receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du téléchargement du reçu'
      });
    }
  }

/**
 * Obtenir l'URL d'un reçu
 * GET /api/payments/:id/receipt-url
 */
async getReceiptUrl(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    logger.info('🔗 Getting receipt URL', { paymentId: id, userId });

    // Récupérer le paiement avec les infos du Sol
    const paymentQuery = `
      SELECT 
        pay.*,
        p.user_id as payer_user_id,
        p.sol_id,
        s.created_by,
        s.nom as sol_name
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      WHERE pay.id = ?
    `;
    
    const payments = await db.executeQuery(paymentQuery, [id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = payments[0];

    // Vérifier l'accès : admin, créateur du sol, ou payeur
    const isAdmin = req.user.role === 'admin';
    const isCreator = payment.created_by === userId;
    const isPayer = payment.payer_user_id === userId;

    if (!isAdmin && !isCreator && !isPayer) {
      logger.warn('❌ Access denied to receipt', { 
        paymentId: id, 
        userId,
        isAdmin,
        isCreator,
        isPayer
      });
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    if (!payment.receipt_path) {
      return res.status(404).json({
        success: false,
        error: 'Aucun reçu disponible pour ce paiement'
      });
    }

    // Générer l'URL selon le type de stockage
    let receiptUrl;

    if (s3Service.useS3) {
      // S3 : URL signée
      receiptUrl = await s3Service.getSignedViewUrl(payment.receipt_path, 3600);
      logger.info('✅ S3 signed URL generated', { paymentId: id });
    } else {
      // Local : URL directe
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      
      // Nettoyer le chemin (enlever 'receipts/' si présent)
      const filename = payment.receipt_path.replace('receipts/', '');
      receiptUrl = `${baseUrl}/uploads/receipts/${filename}`;
      
      logger.info('✅ Local URL generated', { 
        paymentId: id, 
        receiptPath: payment.receipt_path,
        filename,
        url: receiptUrl
      });
    }

    res.json({
      success: true,
      url: receiptUrl,
      filename: payment.receipt_path,
      storage: s3Service.useS3 ? 's3' : 'local',
      expiresIn: s3Service.useS3 ? 3600 : null
    });

  } catch (error) {
    logger.error('❌ Get receipt URL error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de l\'URL du reçu',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Obtenir tous les reçus en attente (admin)
 * GET /api/payments/pending-receipts
 */
async getPendingReceipts(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    const query = `
      SELECT 
        pay.id,
        pay.amount,
        pay.status,
        pay.method,
        pay.receipt_path,
        pay.created_at,
        pay.updated_at,
        p.sol_id,
        s.nom as sol_name,
        u.id as payer_user_id,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname,
        u.email as payer_email
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      JOIN users u ON pay.user_id = u.id
      WHERE pay.status IN ('uploaded', 'pending')
        AND pay.receipt_path IS NOT NULL
      ORDER BY pay.created_at DESC
    `;

    const payments = await db.executeQuery(query);

    logger.info('✅ Pending receipts retrieved', {
      count: payments.length
    });

    res.json({
      success: true,
      count: payments.length,
      payments
    });

  } catch (error) {
    logger.error('❌ Get pending receipts error:', error);
    next(error);
  }
}

  // ✅ WEBHOOK STRIPE
  async handleStripeWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'];
      
      logger.info('🔨 Webhook Stripe reçu');

      const event = await stripeService.handleWebhook(req.body, signature);

      logger.info('✅ Webhook validé', { type: event.type, id: event.id });

      switch (event.type) {
        case 'checkout.session.completed':
          await webhookService.handleCheckoutCompleted(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await webhookService.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await webhookService.handlePaymentFailed(event.data.object);
          break;

        case 'charge.refunded':
          await webhookService.handleChargeRefunded(event.data.object);
          break;

        default:
          logger.info(`ℹ️ Événement Stripe non géré: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      logger.error('❌ Stripe webhook error:', error);
      return res.status(400).json({
        success: false,
        error: 'Webhook error',
        message: error.message
      });
    }
  }

  async handleCheckoutCompleted(session) {
    logger.warn('⚠️ handleCheckoutCompleted appelée directement - utilisez webhookService');
    try {
      const { participationId, userId } = session.metadata;

      logger.info('✅ Checkout complété', {
        sessionId: session.id,
        participationId,
        userId
      });

      const query = `
        UPDATE payments 
        SET status = 'completed', 
            stripe_payment_intent_id = ?,
            updated_at = NOW()
        WHERE participation_id = ? 
          AND user_id = ? 
          AND stripe_session_id = ?
      `;

      await db.executeQuery(query, [
        session.payment_intent || null,
        participationId,
        userId,
        session.id
      ]);

      const updateParticipationQuery = `
        UPDATE participations 
        SET statut_tour = 'payé',
            updated_at = NOW()
        WHERE id = ?
      `;

      await db.executeQuery(updateParticipationQuery, [participationId]);

      logger.info('✅ Paiement et participation mis à jour', {
        sessionId: session.id,
        participationId
      });

    } catch (error) {
      logger.error('❌ Error handling checkout completed:', error);
      throw error;
    }
  }

  async handlePaymentSucceeded(paymentIntent) {
    logger.warn('⚠️ handlePaymentSucceeded appelée directement - utilisez webhookService');
    logger.info('✅ Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100
    });
  }
  /**
 * Récupérer les informations du bénéficiaire pour un Sol/Tour
 * GET /api/sols/:solId/beneficiary
 */
async getBeneficiaryInfo(req, res, next) {
  try {
    const { solId } = req.params;
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin ou créateur du Sol
    const solQuery = 'SELECT created_by FROM sols WHERE id = ?';
    const sols = await db.executeQuery(solQuery, [solId]);

    if (sols.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sol non trouvé'
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isCreator = sols[0].created_by === userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    // Récupérer le tour actuel et le bénéficiaire
    const beneficiaryQuery = `
      SELECT 
        s.id as sol_id,
        s.nom as sol_name,
        s.tour_actuel,
        s.montant_par_periode,
        p.id as participation_id,
        p.ordre,
        u.id as user_id,
        u.firstname,
        u.lastname,
        u.email,
        u.phone,
        u.account_number,
        u.account_type,
        u.bank_name,
        COUNT(pay.id) as total_payments,
        SUM(CASE WHEN pay.status IN ('validated', 'completed') THEN 1 ELSE 0 END) as validated_payments,
        SUM(CASE WHEN pay.status = 'transferred' THEN 1 ELSE 0 END) as transferred_payments
      FROM sols s
      JOIN participations p ON s.id = p.sol_id AND p.ordre = s.tour_actuel
      JOIN users u ON p.user_id = u.id
      LEFT JOIN payments pay ON pay.participation_id = (
        SELECT p2.id FROM participations p2 WHERE p2.sol_id = s.id
      )
      WHERE s.id = ?
      GROUP BY s.id, p.id, u.id
    `;

    const beneficiaries = await db.executeQuery(beneficiaryQuery, [solId]);

    if (beneficiaries.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun bénéficiaire trouvé pour ce tour'
      });
    }

    const beneficiary = beneficiaries[0];

    // Déchiffrer le compte bancaire
    const encryption = require('../utils/encryption');
    if (beneficiary.account_number) {
      beneficiary.account_number = encryption.decryptData(beneficiary.account_number);
    }

    // Compter le nombre total de participants
    const countQuery = 'SELECT COUNT(*) as total FROM participations WHERE sol_id = ?';
    const countResult = await db.executeQuery(countQuery, [solId]);
    const totalParticipants = countResult[0].total;

    // Calculer le montant total à transférer
    const totalAmount = beneficiary.montant_par_periode * totalParticipants;

    // Récupérer les paiements pour ce tour
    const paymentsQuery = `
      SELECT 
        pay.id,
        pay.amount,
        pay.status,
        pay.method,
        pay.validated_at,
        pay.transferred_at,
        pay.transfer_reference,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE p.sol_id = ?
      AND pay.tour_number = ?
      ORDER BY pay.created_at DESC
    `;

    const payments = await db.executeQuery(paymentsQuery, [
      solId,
      beneficiary.tour_actuel
    ]);

    logger.info('✅ Beneficiary info retrieved', {
      solId,
      beneficiaryId: beneficiary.user_id,
      tourActuel: beneficiary.tour_actuel
    });

    res.json({
      success: true,
      beneficiary: {
        user_id: beneficiary.user_id,
        firstname: beneficiary.firstname,
        lastname: beneficiary.lastname,
        email: beneficiary.email,
        phone: beneficiary.phone,
        account_number: beneficiary.account_number || 'Non renseigné',
        account_type: beneficiary.account_type || 'Non renseigné',
        bank_name: beneficiary.bank_name || 'Non renseigné',
        ordre: beneficiary.ordre
      },
      sol: {
        id: beneficiary.sol_id,
        name: beneficiary.sol_name,
        tour_actuel: beneficiary.tour_actuel,
        montant_par_periode: beneficiary.montant_par_periode,
        total_participants: totalParticipants,
        total_amount: totalAmount
      },
      payments: {
        total: payments.length,
        validated: payments.filter(p => p.status === 'validated' || p.status === 'completed').length,
        transferred: payments.filter(p => p.status === 'transferred').length,
        list: payments
      },
      readyForTransfer: beneficiary.validated_payments >= totalParticipants && beneficiary.transferred_payments === 0
    });

  } catch (error) {
    logger.error('❌ Get beneficiary info error:', error);
    next(error);
  }
}
/**
 * Récupérer tous les paiements prêts à être transférés
 * GET /api/payments/pending-transfers
 */
/**
 * Obtenir les paiements validés en attente de transfert
 * GET /api/payments/pending-transfers
 */
/**
 * Obtenir les paiements validés en attente de transfert
 * GET /api/payments/pending-transfers
 */
/**
 * Obtenir les paiements validés en attente de transfert
 * GET /api/payments/pending-transfers
 */
async getPendingTransfers(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    logger.info('📋 Getting pending transfers', { adminId: userId });

    // ✅ Récupérer les paiements avec info du bénéficiaire
    const query = `
      SELECT 
        pay.id,
        pay.amount,
        pay.status,
        pay.method,
        pay.validated_at,
        pay.created_at,
        pay.transfer_reference,
        pay.transfer_notes,
        p.id as participation_id,
        p.sol_id,
        p.ordre as payer_ordre,
        s.nom as sol_name,
        s.tour_actuel,
        s.montant_par_periode,
        s.nombre_participants,
        u.id as payer_user_id,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname,
        u.email as payer_email,
        ben.id as beneficiary_id,
        ben.firstname as beneficiary_firstname,
        ben.lastname as beneficiary_lastname,
        ben.email as beneficiary_email,
        ben.compte_bancaire as beneficiary_account,
        ben.phone as beneficiary_phone
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      JOIN users u ON pay.user_id = u.id
      LEFT JOIN participations bp ON bp.sol_id = s.id AND bp.ordre = s.tour_actuel
      LEFT JOIN users ben ON ben.id = bp.user_id
      WHERE pay.status = 'validated'
      ORDER BY s.id, pay.validated_at DESC
    `;

    const payments = await db.executeQuery(query);

    logger.info('✅ Found pending transfers', { 
      count: payments.length
    });

    if (payments.length === 0) {
      return res.json({
        success: true,
        count: 0,
        totalPayments: 0,
        transfers: []
      });
    }

    // Grouper par Sol
    const paymentsBySol = payments.reduce((acc, payment) => {
      if (!acc[payment.sol_id]) {
        acc[payment.sol_id] = {
          sol_id: payment.sol_id,
          sol_name: payment.sol_name,
          tour_actuel: payment.tour_actuel,
          montant_par_periode: parseFloat(payment.montant_par_periode),
          nombre_participants: payment.nombre_participants,
          beneficiary: payment.beneficiary_id ? {
            id: payment.beneficiary_id,
            firstname: payment.beneficiary_firstname,
            lastname: payment.beneficiary_lastname,
            email: payment.beneficiary_email,
            phone: payment.beneficiary_phone,
            compte_bancaire: payment.beneficiary_account
          } : null,
          payments: [],
          total_amount: 0,
          payments_count: 0
        };
      }
      
      acc[payment.sol_id].payments.push({
        id: payment.id,
        amount: parseFloat(payment.amount),
        method: payment.method,
        status: payment.status,
        payer: {
          id: payment.payer_user_id,
          firstname: payment.payer_firstname,
          lastname: payment.payer_lastname,
          email: payment.payer_email,
          ordre: payment.payer_ordre
        },
        validated_at: payment.validated_at
      });
      
      acc[payment.sol_id].total_amount += parseFloat(payment.amount);
      acc[payment.sol_id].payments_count += 1;
      
      return acc;
    }, {});

    const result = Object.values(paymentsBySol).map(sol => ({
      ...sol,
      // ✅ Calculer si tous les participants ont payé
      all_paid: sol.payments_count >= sol.nombre_participants,
      // ✅ Montant attendu vs montant reçu
      expected_amount: sol.montant_par_periode * sol.nombre_participants,
      received_amount: sol.total_amount
    }));

    res.json({
      success: true,
      count: result.length,
      totalPayments: payments.length,
      transfers: result
    });

  } catch (error) {
    logger.error('❌ Get pending transfers error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des transferts',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
/**
 * Marquer tous les paiements d'un tour comme transférés
 * POST /api/sols/:solId/transfer-all
 */
/**
 * Transférer tous les paiements validés d'un Sol
 * POST /api/payments/sols/:solId/transfer-all
 */
async transferAllPayments(req, res, next) {
  try {
    const { solId } = req.params;
    const { transfer_reference, transfer_notes } = req.body;
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul un administrateur peut effectuer un transfert groupé'
      });
    }

    logger.info('💸 Transferring all payments for Sol', {
      solId,
      userId,
      reference: transfer_reference
    });

    // Récupérer le Sol
    const solQuery = 'SELECT id, nom, tour_actuel FROM sols WHERE id = ?';
    const sols = await db.executeQuery(solQuery, [solId]);

    if (sols.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sol non trouvé'
      });
    }

    const sol = sols[0];

    // ✅ CORRECTION : Changer le status à 'transferred'
    const updateQuery = `
      UPDATE payments pay
      JOIN participations p ON pay.participation_id = p.id
      SET 
        pay.status = 'transferred',
        pay.transferred_at = NOW(),
        pay.transferred_by = ?,
        pay.transfer_reference = ?,
        pay.transfer_notes = ?,
        pay.updated_at = NOW()
      WHERE p.sol_id = ?
        AND pay.status = 'validated'
    `;

    const result = await db.executeQuery(updateQuery, [
      userId,
      transfer_reference || null,
      transfer_notes || null,
      solId
    ]);

    logger.info('✅ All payments transferred', {
      solId,
      count: result.affectedRows,
      reference: transfer_reference
    });

    // Envoyer email au bénéficiaire
    try {
      const beneficiaryQuery = `
        SELECT u.firstname, u.lastname, u.email
        FROM users u
        JOIN participations p ON u.id = p.user_id
        WHERE p.sol_id = ? AND p.ordre = ?
      `;

      const beneficiaries = await db.executeQuery(beneficiaryQuery, [solId, sol.tour_actuel]);

      if (beneficiaries.length > 0) {
        const beneficiary = beneficiaries[0];
        
        // Calculer le montant total
        const amountQuery = `
          SELECT SUM(amount) as total
          FROM payments pay
          JOIN participations p ON pay.participation_id = p.id
          WHERE p.sol_id = ? AND pay.status = 'transferred'
        `;
        const amountResult = await db.executeQuery(amountQuery, [solId]);

        await emailService.sendEmail({
          to: beneficiary.email,
          subject: `Transfert effectué pour "${sol.nom}" 💰`,
          template: 'beneficiary-transfer',
          data: {
            firstname: beneficiary.firstname,
            lastname: beneficiary.lastname,
            solName: sol.nom,
            amount: parseFloat(amountResult[0].total || 0).toFixed(2),
            reference: transfer_reference || 'N/A',
            date: new Date().toLocaleDateString('fr-FR')
          }
        });

        logger.info('✅ Beneficiary notified');
      }
    } catch (emailError) {
      logger.error('❌ Failed to send beneficiary email:', emailError);
    }

    res.json({
      success: true,
      message: `${result.affectedRows} paiement(s) transféré(s) avec succès`,
      transferred: result.affectedRows,
      solName: sol.nom
    });

  } catch (error) {
    logger.error('❌ Transfer all payments error:', error);
    next(error);
  }
}
/**
 * Marquer un paiement comme transféré (après virement manuel)
 * POST /api/payments/:id/transfer
 */
/**
 * Marquer un paiement comme transféré
 * POST /api/payments/:id/mark-transferred
 */
async markAsTransferred(req, res, next) {
  try {
    const { id } = req.params;
    const { transfer_reference, transfer_notes } = req.body;
    const userId = req.user.userId || req.user.id;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul un administrateur peut marquer un paiement comme transféré'
      });
    }

    logger.info('💸 Marking payment as transferred', {
      paymentId: id,
      userId,
      reference: transfer_reference
    });

    // Récupérer le paiement
    const paymentQuery = `
      SELECT 
        pay.*,
        p.sol_id,
        p.ordre,
        s.nom as sol_name,
        s.tour_actuel,
        u.firstname as payer_firstname,
        u.lastname as payer_lastname,
        u.email as payer_email,
        ben.id as beneficiary_id,
        ben.firstname as beneficiary_firstname,
        ben.lastname as beneficiary_lastname,
        ben.email as beneficiary_email
      FROM payments pay
      JOIN participations p ON pay.participation_id = p.id
      JOIN sols s ON p.sol_id = s.id
      JOIN users u ON pay.user_id = u.id
      LEFT JOIN participations bp ON bp.sol_id = s.id AND bp.ordre = s.tour_actuel
      LEFT JOIN users ben ON ben.id = bp.user_id
      WHERE pay.id = ?
    `;
    
    const payments = await db.executeQuery(paymentQuery, [id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = payments[0];

    // Vérifier que le paiement est validé
    if (payment.status !== 'validated') {
      return res.status(400).json({
        success: false,
        error: 'Le paiement doit être validé avant d\'être marqué comme transféré',
        currentStatus: payment.status
      });
    }

    // ✅ CORRECTION : Changer le status à 'transferred'
    const updateQuery = `
      UPDATE payments 
      SET 
        status = 'transferred',
        transferred_at = NOW(),
        transferred_by = ?,
        transfer_reference = ?,
        transfer_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await db.executeQuery(updateQuery, [
      userId,
      transfer_reference || null,
      transfer_notes || null,
      id
    ]);

    logger.info('✅ Payment marked as transferred', {
      paymentId: id,
      transferredBy: userId,
      reference: transfer_reference
    });

    // Envoyer email de confirmation au payeur
    try {
      await emailService.sendEmail({
        to: payment.payer_email,
        subject: `Transfert effectué - ${payment.sol_name}`,
        template: 'transfer-completed',
        data: {
          firstname: payment.payer_firstname,
          solName: payment.sol_name,
          amount: parseFloat(payment.amount).toFixed(2),
          reference: transfer_reference || 'N/A',
          date: new Date().toLocaleDateString('fr-FR')
        }
      });

      logger.info('✅ Transfer notification sent to payer');
    } catch (emailError) {
      logger.error('❌ Failed to send transfer email to payer:', emailError);
    }

    // Envoyer email au bénéficiaire
    if (payment.beneficiary_email) {
      try {
        await emailService.sendEmail({
          to: payment.beneficiary_email,
          subject: `Transfert reçu pour "${payment.sol_name}" 💰`,
          template: 'beneficiary-transfer',
          data: {
            firstname: payment.beneficiary_firstname,
            lastname: payment.beneficiary_lastname,
            solName: payment.sol_name,
            amount: parseFloat(payment.amount).toFixed(2),
            reference: transfer_reference || 'N/A',
            date: new Date().toLocaleDateString('fr-FR')
          }
        });

        logger.info('✅ Transfer notification sent to beneficiary');
      } catch (emailError) {
        logger.error('❌ Failed to send beneficiary email:', emailError);
      }
    }

    // Récupérer le paiement mis à jour
    const updatedPayment = await db.executeQuery(
      'SELECT * FROM payments WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Paiement marqué comme transféré avec succès',
      payment: updatedPayment[0]
    });

  } catch (error) {
    logger.error('❌ Mark as transferred error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage du transfert',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

}

module.exports = new PaymentController();