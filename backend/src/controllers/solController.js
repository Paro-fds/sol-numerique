const Sol = require('../models/Sol');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const db = require('../config/database');

class SolController {
  
  // Créer un nouveau sol
 async createSol(req, res, next) {
  try {
    console.log('\n========================================');
    console.log('🔍 DIAGNOSTIC CRÉATION SOL');
    console.log('========================================');
    
    // 1. Afficher les données reçues
    console.log('📥 req.body:', req.body);
    console.log('📥 req.user:', req.user);
    console.log('📥 req.headers.authorization:', req.headers.authorization?.substring(0, 20) + '...');
    
    // 2. Vérifier l'authentification
    const userId = req.user?.id || req.user?.userId;
    console.log('👤 User ID:', userId);
    
    if (!userId) {
      console.error('❌ Utilisateur non authentifié');
      return res.status(401).json({
        error: 'Utilisateur non authentifié',
        details: 'req.user est undefined ou sans ID'
      });
    }
    
    // 3. Vérifier les validations express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation failed:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        receivedData: req.body
      });
    }
    
    // 4. Extraire et valider les données
    const { 
      nom, 
      description, 
      montant_par_periode, 
      frequence, 
      max_participants, 
      nombre_tours 
    } = req.body;
    
    console.log('📝 Données extraites:', {
      nom,
      description,
      montant_par_periode,
      frequence,
      max_participants,
      nombre_tours
    });
    
    // 5. Validations manuelles
    const validations = [];
    
    if (!nom || nom.trim() === '') {
      validations.push('Le nom est requis');
    }
    
    if (!montant_par_periode || isNaN(montant_par_periode) || montant_par_periode <= 0) {
      validations.push('Le montant_par_periode doit être un nombre > 0');
    }
    
    if (!frequence || !['hebdomadaire', 'mensuel', 'trimestriel', 'annuel'].includes(frequence)) {
      validations.push('La fréquence est invalide');
    }
    
    if (validations.length > 0) {
      console.error('❌ Validations échouées:', validations);
      return res.status(400).json({
        error: 'Données invalides',
        details: validations,
        receivedData: req.body
      });
    }
    
    // 6. Formater les données pour le modèle
    const solData = {
      nom: nom.trim(),
      description: description?.trim() || '',
      montant_par_periode: parseFloat(montant_par_periode),
      frequence: frequence,
      max_participants: parseInt(max_participants) || 12,
      nombre_tours: parseInt(nombre_tours || max_participants) || 12
    };
    
    console.log('✅ Données formatées:', solData);
    
    // 7. Créer le Sol
    console.log('💾 Création en base de données...');
    const sol = await Sol.create(solData, userId);
    
    console.log('✅ Sol créé:', sol.id);
    console.log('========================================\n');
    
    res.status(201).json({
      message: 'Sol créé avec succès',
      sol: sol.toJSON()
    });

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ ERREUR CRÉATION SOL');
    console.error('========================================');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('SQL:', error.sql);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    
    // Erreurs SQL spécifiques
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        error: 'Erreur de base de données: colonne manquante',
        details: error.message,
        sqlMessage: error.sqlMessage
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        error: 'Utilisateur invalide',
        details: 'L\'utilisateur n\'existe pas en base de données'
      });
    }
    
    res.status(500).json({
      error: 'Erreur serveur lors de la création du Sol',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    });
  }
}

  // Obtenir tous les sols de l'utilisateur
  async getMySols(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { statut, search } = req.query;

      const sols = await Sol.findByUserId(userId);

      let filteredSols = sols;
      if (statut) {
        filteredSols = sols.filter(sol => sol.statut === statut);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredSols = filteredSols.filter(sol => 
          sol.nom.toLowerCase().includes(searchLower) ||
          (sol.description && sol.description.toLowerCase().includes(searchLower))
        );
      }

      res.json({
        count: filteredSols.length,
        sols: filteredSols.map(sol => sol.toJSON())
      });

    } catch (error) {
      logger.error('Get my sols error:', error);
      next(error);
    }
  }

  // Obtenir tous les sols (admin ou filtrés)
  async getAllSols(req, res, next) {
    try {
      const { statut, search, createdBy, limit } = req.query;

      const filters = {
        statut,
        search,
        createdBy,
        limit
      };

      const sols = await Sol.findAll(filters);

      res.json({
        count: sols.length,
        sols: sols.map(sol => sol.toJSON())
      });

    } catch (error) {
      logger.error('Get all sols error:', error);
      next(error);
    }
  }

  // Obtenir un sol par ID
  async getSolById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      const participantsQuery = `
        SELECT 
          p.id as id,
          p.user_id,
          p.ordre,
          p.statut_tour,
          p.created_at as date_adhesion,
          u.firstname,
          u.lastname,
          u.email
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ?
        ORDER BY p.ordre ASC
      `;
      
      const participants = await db.executeQuery(participantsQuery, [id]);

      const isParticipant = participants.some(p => p.user_id === userId);
      const isCreator = sol.created_by === userId;
      const isAdmin = req.user.role === 'admin';

      if (!isParticipant && !isCreator && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied to this sol'
        });
      }

      const statistics = await sol.getStatistics();

      res.json({
        sol: sol.toJSON(),
        participants,
        statistics,
        isCreator,
        isParticipant
      });

    } catch (error) {
      logger.error('Get sol by ID error:', error);
      next(error);
    }
  }

  // Rejoindre un sol
 async joinSol(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const sol = await Sol.findById(id);

    if (!sol) {
      return res.status(404).json({
        error: 'Sol not found'
      });
    }

    if (sol.statut !== 'active') {
      return res.status(400).json({
        error: 'Cannot join a non-active sol'
      });
    }

    const ordre = await sol.addParticipant(userId);

    logger.info('User joined sol', {
      solId: id,
      userId,
      ordre
    });

    // ✅ ENVOYER LES EMAILS AVANT LA RÉPONSE
    try {
      const emailService = require('../services/emailService');
      
      // Récupérer les infos utilisateur
      const userQuery = 'SELECT firstname, lastname, email FROM users WHERE id = ?';
      const users = await db.executeQuery(userQuery, [userId]);
      const user = users[0];

      // Email de confirmation à l'utilisateur
      await emailService.sendSolJoinedEmail(user, sol, ordre);
      logger.info('✅ Sol joined email sent', { userId, solId: id });

      // ✅ NOTIFIER LE CRÉATEUR
      const creatorQuery = 'SELECT firstname, lastname, email FROM users WHERE id = ?';
      const creators = await db.executeQuery(creatorQuery, [sol.created_by]);
      const creator = creators[0];

      // Compter les participants
      const countQuery = 'SELECT COUNT(*) as count FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [id]);
      const currentParticipants = countResult[0].count;

      await emailService.sendNewParticipantEmail(creator, {
        ...sol,
        membres_actuels: currentParticipants,
        solId: id
      }, user);
      
      logger.info('✅ New participant email sent to creator', { creatorId: sol.created_by });

    } catch (emailError) {
      // Ne pas bloquer si l'email échoue
      logger.error('❌ Failed to send emails:', emailError);
    }

    // ✅ RÉPONSE APRÈS L'ENVOI DES EMAILS
    res.json({
      message: 'Vous avez rejoint le sol avec succès',
      ordre,
      sol: sol.toJSON()
    });

  } catch (error) {
    if (error.message === 'User already participating in this sol') {
      return res.status(409).json({
        error: 'Vous participez déjà à ce sol'
      });
    }
    if (error.message === 'Sol is full') {
      return res.status(400).json({
        error: 'Ce sol est complet'
      });
    }
    logger.error('Join sol error:', error);
    next(error);
  }
}

  // Quitter un sol
  async leaveSol(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      if (sol.created_by === userId) {
        return res.status(400).json({
          error: 'Le créateur ne peut pas quitter le sol'
        });
      }

      await sol.removeParticipant(userId);

      logger.info('User left sol', {
        solId: id,
        userId
      });

      res.json({
        message: 'Vous avez quitté le sol avec succès'
      });

    } catch (error) {
      if (error.message === 'Cannot remove participant with pending payments') {
        return res.status(400).json({
          error: 'Impossible de quitter avec des paiements en attente'
        });
      }
      logger.error('Leave sol error:', error);
      next(error);
    }
  }

  // Mettre à jour un sol
  async updateSol(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id || req.user.userId;
      const { nom, description, statut } = req.body;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      if (sol.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Only the creator can update this sol'
        });
      }

      const updates = [];
      const params = [];

      if (nom) {
        updates.push('nom = ?');
        params.push(nom);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }

      if (statut) {
        await sol.updateStatus(statut);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(id);

        const query = `UPDATE sols SET ${updates.join(', ')} WHERE id = ?`;
        await db.executeQuery(query, params);
      }

      const updatedSol = await Sol.findById(id);

      logger.info('Sol updated', {
        solId: id,
        userId
      });

      res.json({
        message: 'Sol mis à jour avec succès',
        sol: updatedSol.toJSON()
      });

    } catch (error) {
      logger.error('Update sol error:', error);
      next(error);
    }
  }

  // Supprimer un sol
  async deleteSol(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      if (sol.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Only the creator can delete this sol'
        });
      }

      const paymentsQuery = `
        SELECT COUNT(*) as count 
        FROM payments p 
        JOIN participations part ON p.participation_id = part.id
        WHERE part.sol_id = ?
      `;
      const paymentsResult = await db.executeQuery(paymentsQuery, [id]);

      if (paymentsResult[0].count > 0) {
        return res.status(400).json({
          error: 'Cannot delete sol with existing payments'
        });
      }

      await sol.updateStatus('cancelled');

      logger.info('Sol deleted/cancelled', {
        solId: id,
        userId
      });

      res.json({
        message: 'Sol supprimé avec succès'
      });

    } catch (error) {
      logger.error('Delete sol error:', error);
      next(error);
    }
  }

  // Obtenir les statistiques d'un sol
  async getStatistics(req, res, next) {
    try {
      const { id } = req.params;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      const statistics = await sol.getStatistics();

      res.json({
        statistics
      });

    } catch (error) {
      logger.error('Get statistics error:', error);
      next(error);
    }
  }

  // Récupère les sols disponibles à rejoindre
  async getAvailableSols(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      
      const query = `
        SELECT 
          s.*,
          COUNT(DISTINCT p.id) as membres_actuels,
          u.firstname as createur_prenom,
          u.lastname as createur_nom
        FROM sols s
        LEFT JOIN participations p ON s.id = p.sol_id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.statut = 'active'
          AND s.id NOT IN (
            SELECT sol_id FROM participations WHERE user_id = ?
          )
        GROUP BY s.id
        HAVING (s.max_participants IS NULL OR membres_actuels < s.max_participants)
        ORDER BY s.created_at DESC
      `;
      
      const sols = await db.executeQuery(query, [userId]);
      
      logger.info('Available sols retrieved', {
        userId,
        count: sols.length
      });
      
      res.json({
        success: true,
        count: sols.length,
        sols
      });
    } catch (error) {
      logger.error('Get available sols error:', error);
      next(error);
    }
  }

  // Récupère les détails complets d'un sol avec participants
  async getSolDetails(req, res, next) {
    try {
      const { id } = req.params;
      
      const sol = await Sol.findById(id);
      
      if (!sol) {
        return res.status(404).json({
          success: false,
          error: 'Sol not found'
        });
      }
      
      const participantsQuery = `
        SELECT 
          p.id,
          u.id as user_id,
          u.firstname as prenom,
          u.lastname as nom,
          p.ordre,
          p.statut_tour as statut,
          p.created_at as date_adhesion
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ?
        ORDER BY p.ordre ASC
      `;
      
      const participants = await db.executeQuery(participantsQuery, [id]);
      
      const countQuery = 'SELECT COUNT(*) as count FROM participations WHERE sol_id = ?';
      const countResult = await db.executeQuery(countQuery, [id]);
      
      const creatorQuery = 'SELECT firstname, lastname FROM users WHERE id = ?';
      const creatorResult = await db.executeQuery(creatorQuery, [sol.created_by]);
      
      const solData = sol.toJSON();
      solData.membres_actuels = countResult[0].count;
      solData.participants = participants;
      
      if (creatorResult.length > 0) {
        solData.createur = `${creatorResult[0].firstname} ${creatorResult[0].lastname}`;
      }
      
      logger.info('Sol details retrieved', {
        solId: id,
        membres: solData.membres_actuels
      });
      
      res.json({
        success: true,
        sol: solData
      });
    } catch (error) {
      logger.error('Get sol details error:', error);
      next(error);
    }
  }

  // ========================================
  // ✅ GESTION DE L'ORDRE DES PARTICIPANTS
  // ========================================

  /**
   * Récupérer les participants d'un Sol avec leur ordre
   * GET /api/sols/:id/participants
   */
  async getParticipants(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.id;
      
      const sol = await Sol.findById(id);
      if (!sol) {
        return res.status(404).json({
          success: false,
          error: 'Sol non trouvé'
        });
      }
      
      if (sol.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul le créateur peut voir les participants'
        });
      }
      
      const query = `
        SELECT 
          p.id as participation_id,
          p.ordre,
          p.statut_tour,
          u.id as user_id,
          u.firstname,
          u.lastname,
          u.email,
          u.phone,
          (SELECT COUNT(*) FROM payments pay 
           WHERE pay.participation_id = p.id 
           AND pay.status IN ('validated', 'completed')) as payments_count
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.sol_id = ?
        ORDER BY p.ordre ASC, p.created_at ASC
      `;
      
      const participants = await db.executeQuery(query, [id]);
      
      res.json({
        success: true,
        participants
      });
      
    } catch (error) {
      logger.error('Get participants error:', error);
      next(error);
    }
  }

  /**
   * Définir/Mettre à jour l'ordre des participants
   * PUT /api/sols/:id/order
   */
  async updateParticipantsOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { order } = req.body;
      const userId = req.user.userId || req.user.id;
      
      if (!order || !Array.isArray(order)) {
        return res.status(400).json({
          success: false,
          error: 'Format de données invalide. Attendu: { order: [{ participation_id, ordre }] }'
        });
      }
      
      const sol = await Sol.findById(id);
      if (!sol) {
        return res.status(404).json({
          success: false,
          error: 'Sol non trouvé'
        });
      }
      
      if (sol.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul le créateur peut modifier l\'ordre'
        });
      }
      
      if (sol.statut === 'active') {
        return res.status(400).json({
          success: false,
          error: 'Impossible de modifier l\'ordre d\'un Sol déjà actif'
        });
      }
      
      await Promise.all(order.map(item =>
        db.executeQuery(
          'UPDATE participations SET ordre = ? WHERE id = ? AND sol_id = ?',
          [item.ordre, item.participation_id, id]
        )
      ));
      
      logger.info('Participants order updated', {
        solId: id,
        userId,
        count: order.length
      });
      
      res.json({
        success: true,
        message: 'Ordre des participants mis à jour avec succès'
      });
      
    } catch (error) {
      logger.error('Update participants order error:', error);
      next(error);
    }
  }

  /**
   * Définir l'ordre aléatoirement
   * POST /api/sols/:id/randomize-order
   */
  async randomizeOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.id;
      
      const sol = await Sol.findById(id);
      if (!sol) {
        return res.status(404).json({
          success: false,
          error: 'Sol non trouvé'
        });
      }
      
      if (sol.created_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Seul le créateur peut randomiser l\'ordre'
        });
      }
      
      if (sol.statut === 'active') {
        return res.status(400).json({
          success: false,
          error: 'Impossible de modifier l\'ordre d\'un Sol déjà actif'
        });
      }
      
      const participants = await db.executeQuery(
        'SELECT id FROM participations WHERE sol_id = ?',
        [id]
      );
      
      const shuffled = participants
        .sort(() => Math.random() - 0.5)
        .map((p, index) => ({ id: p.id, ordre: index + 1 }));
      
      await Promise.all(
        shuffled.map(item =>
          db.executeQuery(
            'UPDATE participations SET ordre = ? WHERE id = ?',
            [item.ordre, item.id]
          )
        )
      );
      
      logger.info('Order randomized', {
        solId: id,
        userId,
        count: shuffled.length
      });
      
      res.json({
        success: true,
        message: 'Ordre randomisé avec succès'
      });
      
    } catch (error) {
      logger.error('Randomize order error:', error);
      next(error);
    }
  }

  // ========================================
  // ✅ DÉTECTION AUTOMATIQUE DE FIN DE TOUR
  // ========================================

  /**
   * Vérifier et avancer le tour si terminé
   * POST /api/sols/:id/check-tour
   */
  async checkTour(req, res, next) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION
      if (!id || id === 'undefined') {
        return res.status(400).json({
          success: false,
          error: 'ID du Sol requis'
        });
      }
      
      const TourDetectionService = require('../services/TourDetectionService');
      const result = await TourDetectionService.checkAndAdvanceTour(id);
      
      res.json(result);
      
    } catch (error) {
      logger.error('Check tour error:', error);
      next(error);
    }
  }

  /**
   * Obtenir le statut du tour actuel
   * GET /api/sols/:id/tour-status
   */
  async getTourStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION
      if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({
          success: false,
          error: 'ID du Sol requis et valide'
        });
      }
      
      logger.info('Getting tour status', { solId: id });
      
      const TourDetectionService = require('../services/TourDetectionService');
      const status = await TourDetectionService.getTourStatus(id);
      
      res.json(status);
      
    } catch (error) {
      logger.error('Get tour status error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du statut du tour',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Forcer le passage au tour suivant (admin)
   * POST /api/sols/:id/force-advance
   */
  async forceAdvanceTour(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.id;
      
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Seul un administrateur peut forcer le passage au tour suivant'
        });
      }
      
      const TourDetectionService = require('../services/TourDetectionService');
      const result = await TourDetectionService.forceAdvanceTour(id, userId);
      
      res.json(result);
      
    } catch (error) {
      logger.error('Force advance tour error:', error);
      next(error);
    }
  }
}

module.exports = new SolController();