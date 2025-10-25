import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Menu, MenuItem
} from '@mui/material';
import { 
  ArrowBack, PersonAdd, Payment, FileDownload, Reorder
} from '@mui/icons-material';
import { solAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PaymentForm from '../components/Payment/PaymentForm';
import ExportModal from '../components/ExportModal';
import ManageParticipantsOrder from '../components/ManageParticipantsOrder';
import ParticipantsOrderManager from '../components/sols/ParticipantsOrderManager';
import TourProgressCard from '../components/sols/TourProgressCard';

const SolDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [sol, setSol] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showOrderManager, setShowOrderManager] = useState(false);
  const [userParticipation, setUserParticipation] = useState(null);
  
  const [exportModalType, setExportModalType] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  useEffect(() => {
    loadSolDetails();
  }, [id]);

  const loadSolDetails = async () => {
    try {
      setLoading(true);
      const response = await solAPI.getSol(id);
      
      setSol(response.data.sol);
      setParticipants(response.data.participants || []);
      setStatistics(response.data.statistics);
      
      const myParticipation = response.data.participants?.find(
        p => p.user_id === user?.id
      );
      setUserParticipation(myParticipation);
      
    } catch (error) {
      console.error('Error loading sol details:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    loadSolDetails();
    toast.success('Paiement effectué avec succès !');
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportClick = (type) => {
    setExportModalType(type);
    handleExportMenuClose();
  };

  const handleOrderManagerClose = () => {
    setShowOrderManager(false);
    loadSolDetails(); // Rafraîchir les données après modification
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sol) {
    return <Alert severity="error">Sol non trouvé</Alert>;
  }

  // Vérifier si l'utilisateur est le créateur du Sol
  const isCreator = sol.created_by === user?.id;
  const canManageOrder = isCreator && (sol.statut === 'draft' || sol.statut === 'pending' || sol.tour_actuel === 1);

  return (
    <Box>
      {/* Bouton retour */}
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/sols')} 
        sx={{ mb: 2 }}
      >
        Retour
      </Button>

      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            {sol.nom}
          </Typography>
          {sol.description && (
            <Typography variant="body1" color="textSecondary">
              {sol.description}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* ✅ Bouton pour gérer l'ordre (uniquement pour le créateur) */}
          {canManageOrder && (
            <Button
              variant="outlined"
              startIcon={<Reorder />}
              onClick={() => setShowOrderManager(true)}
              sx={{ borderRadius: 2 }}
            >
              Gérer l'ordre
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportMenuOpen}
            sx={{ borderRadius: 2 }}
          >
            Exporter
          </Button>

          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={() => handleExportClick('participants')}>
              👥 Exporter les participants (CSV)
            </MenuItem>
            <MenuItem onClick={() => handleExportClick('monthly-report')}>
              📄 Rapport mensuel (PDF)
            </MenuItem>
          </Menu>

          {userParticipation ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Payment />}
              onClick={() => setShowPaymentForm(true)}
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Effectuer un Paiement
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PersonAdd />}
              onClick={() => toast.info('Fonctionnalité à venir : rejoindre le sol')}
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Rejoindre ce Sol
            </Button>
          )}
        </Box>
      </Box>

      {/* Alerte pour le créateur */}
      {isCreator && canManageOrder && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>👑 Vous êtes le créateur de ce Sol.</strong> Vous pouvez gérer l'ordre des bénéficiaires en cliquant sur "Gérer l'ordre".
          </Typography>
        </Alert>
      )}

      {userParticipation && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Vous êtes participant #{userParticipation.ordre} de ce sol
        </Alert>
      )}

      {/* Cartes statistiques */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Montant par Période
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {sol.montant_par_periode} HTG
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Participants
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                {participants.length} / {sol.max_participants}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Fréquence
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {sol.frequence}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Statut
              </Typography>
              <Chip 
                label={sol.statut} 
                color={sol.statut === 'active' ? 'success' : 'default'}
                sx={{ mt: 1, fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ✅ PROGRESSION DU TOUR - Visible si Sol actif */}
      {sol.statut === 'active' && (
        <Box sx={{ mt: 3 }}>
          <TourProgressCard solId={sol.id} />
        </Box>
      )}

      {/* ✅ GESTION DE L'ORDRE - Alternative si vous avez ParticipantsOrderManager */}
      {isCreator && sol.statut === 'pending' && (
        <Box sx={{ mt: 3 }}>
          <ParticipantsOrderManager 
            solId={sol.id}
            solStatut={sol.statut}
            isCreator={true}
          />
        </Box>
      )}

      {/* Tableau des participants */}
      <Card sx={{ mt: 3, borderRadius: 2, boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Liste des Participants
            </Typography>
            
            <Chip 
              label={`${participants.length} participant${participants.length > 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Ordre</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Statut du Tour</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date d'adhésion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Box sx={{ py: 4 }}>
                        <Typography color="textSecondary" variant="body1">
                          👥 Aucun participant pour le moment
                        </Typography>
                        <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
                          Soyez le premier à rejoindre ce sol !
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  participants
                    .sort((a, b) => a.ordre - b.ordre) // ✅ Tri par ordre
                    .map((p) => (
                      <TableRow 
                        key={p.id} 
                        hover
                        sx={{
                          bgcolor: p.user_id === userParticipation?.user_id ? 'action.selected' : 'inherit',
                          '&:hover': {
                            bgcolor: p.user_id === userParticipation?.user_id 
                              ? 'action.selected' 
                              : 'action.hover'
                          }
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={`#${p.ordre}`} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {p.firstname} {p.lastname}
                            </Typography>
                            {p.user_id === userParticipation?.user_id && (
                              <Chip 
                                label="Vous" 
                                size="small" 
                                color="primary"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            {p.user_id === sol.created_by && (
                              <Chip 
                                label="Créateur" 
                                size="small" 
                                color="secondary"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={p.statut_tour || 'En attente'} 
                            size="small"
                            color={
                              p.statut_tour === 'payé' ? 'success' :
                              p.statut_tour === 'validé' ? 'primary' :
                              p.statut_tour === 'reçu' ? 'info' :
                              'default'
                            }
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {p.date_adhesion ? 
                              new Date(p.date_adhesion).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 
                              '-'
                            }
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ✅ Dialog pour gérer l'ordre des participants */}
      <Dialog 
        open={showOrderManager} 
        onClose={handleOrderManagerClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <ManageParticipantsOrder
          solId={id}
          onClose={handleOrderManagerClose}
        />
      </Dialog>

      {/* Dialog de paiement */}
      <Dialog 
        open={showPaymentForm} 
        onClose={() => setShowPaymentForm(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            💳 Effectuer un Paiement
          </Typography>
        </DialogTitle>
        <DialogContent>
          {userParticipation ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Sol:</strong> {sol.nom}
                </Typography>
                <Typography variant="body2">
                  <strong>Montant:</strong> {sol.montant_par_periode} HTG
                </Typography>
                <Typography variant="body2">
                  <strong>Votre tour:</strong> #{userParticipation.ordre}
                </Typography>
              </Alert>

              <PaymentForm 
                participationId={userParticipation.id}
                amount={sol.montant_par_periode}
                solName={sol.nom}
                onSuccess={handlePaymentSuccess}
              />
            </Box>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Vous devez d'abord rejoindre ce sol pour effectuer un paiement.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setShowPaymentForm(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modales d'export */}
      {exportModalType === 'participants' && (
        <ExportModal
          show={true}
          onClose={() => setExportModalType(null)}
          type="participants"
          solId={id}
        />
      )}

      {exportModalType === 'monthly-report' && (
        <ExportModal
          show={true}
          onClose={() => setExportModalType(null)}
          type="monthly-report"
          solId={id}
        />
      )}
    </Box>
  );
};

export default SolDetailsPage;