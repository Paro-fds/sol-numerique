const Sol = require('../models/Sol');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class SolController {
  
  // Créer un nouveau sol
  async createSol(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { nom, description, montant_par_periode, frequence, max_participants } = req.body;
      const userId = req.user.userId;

      const solData = {
        nom,
        description,
        montant_par_periode: parseFloat(montant_par_periode),
        frequence,
        max_participants: max_participants || 12
      };

      const sol = await Sol.create(solData, userId);

      logger.info('Sol created successfully', {
        solId: sol.id,
        userId
      });

      res.status(201).json({
        message: 'Sol créé avec succès',
        sol: sol.toJSON()
      });

    } catch (error) {
      logger.error('Create sol error:', error);
      next(error);
    }
  }

  // Obtenir tous les sols de l'utilisateur
  async getMySols(req, res, next) {
    try {
      const userId = req.user.userId;
      const { statut, search } = req.query;

      const sols = await Sol.findByUserId(userId);

      // Filtrer par statut si nécessaire
      let filteredSols = sols;
      if (statut) {
        filteredSols = sols.filter(sol => sol.statut === statut);
      }

      // Filtrer par recherche si nécessaire
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
      const userId = req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      // Vérifier que l'utilisateur participe au sol ou est admin
      const participants = await sol.getParticipants();
      const isParticipant = participants.some(p => p.user_id === userId);
      const isCreator = sol.created_by === userId;
      const isAdmin = req.user.role === 'admin';

      if (!isParticipant && !isCreator && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied to this sol'
        });
      }

      // Obtenir les statistiques
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
      const userId = req.user.userId;

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
      const userId = req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      // Ne pas permettre au créateur de quitter
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

  // Obtenir les participants d'un sol
  async getParticipants(req, res, next) {
    try {
      const { id } = req.params;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      const participants = await sol.getParticipants();

      res.json({
        count: participants.length,
        participants
      });

    } catch (error) {
      logger.error('Get participants error:', error);
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
      const userId = req.user.userId;
      const { nom, description, statut } = req.body;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      // Vérifier que l'utilisateur est le créateur ou admin
      if (sol.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Only the creator can update this sol'
        });
      }

      const db = require('../config/database');
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
      const userId = req.user.userId;

      const sol = await Sol.findById(id);

      if (!sol) {
        return res.status(404).json({
          error: 'Sol not found'
        });
      }

      // Vérifier que l'utilisateur est le créateur ou admin
      if (sol.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Only the creator can delete this sol'
        });
      }

      // Vérifier qu'il n'y a pas de paiements
      const db = require('../config/database');
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

      // Marquer comme annulé plutôt que supprimer
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
}

module.exports = new SolController();