import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Chip,
  InputAdornment,
  Alert,
  Snackbar,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { solAPI } from '../services/api';

const JoinSolPage = () => {
  const [availableSols, setAvailableSols] = useState([]);
  const [filteredSols, setFilteredSols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSol, setSelectedSol] = useState(null);
  const [solDetails, setSolDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchAvailableSols();
  }, []);

  useEffect(() => {
    filterSols();
  }, [searchTerm, statusFilter, availableSols]);

  const fetchAvailableSols = async () => {
    try {
      setLoading(true);
      const response = await solAPI.getAvailableSols();
      setAvailableSols(response.data.sols || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des sols:', error);
      showSnackbar('Erreur lors du chargement des sols disponibles', 'error');
      setLoading(false);
    }
  };

  const filterSols = () => {
    let filtered = [...availableSols];

    if (searchTerm) {
      filtered = filtered.filter(sol =>
        sol.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sol => sol.statut === statusFilter);
    }

    setFilteredSols(filtered);
  };

  const fetchSolDetails = async (solId) => {
    try {
      setLoadingDetails(true);
      const response = await solAPI.getSolDetails(solId);
      setSolDetails(response.data.sol);
      setLoadingDetails(false);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      showSnackbar('Erreur lors du chargement des détails du sol', 'error');
      setLoadingDetails(false);
    }
  };

  const handleOpenDialog = (sol) => {
    setSelectedSol(sol);
    setOpenDialog(true);
    fetchSolDetails(sol.id);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSol(null);
    setSolDetails(null);
  };

  const handleJoinSol = async () => {
    try {
      await solAPI.joinSol(selectedSol.id);
      showSnackbar('Vous avez rejoint le sol avec succès!', 'success');
      handleCloseDialog();
      fetchAvailableSols();
    } catch (error) {
      console.error('Erreur lors de l\'adhésion:', error);
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de l\'adhésion au sol',
        'error'
      );
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'actif':
        return 'success';
      case 'en_attente':
        return 'warning';
      case 'complet':
        return 'error';
      case 'termine':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'actif':
        return 'Actif';
      case 'en_attente':
        return 'En attente';
      case 'complet':
        return 'Complet';
      case 'termine':
        return 'Terminé';
      default:
        return statut;
    }
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'hebdomadaire':
        return 'Hebdomadaire';
      case 'bimensuel':
        return 'Bimensuel';
      case 'mensuel':
        return 'Mensuel';
      default:
        return frequency;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rejoindre un Sol
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Parcourez les sols disponibles et rejoignez celui qui vous convient
        </Typography>
      </Box>

      {/* Filtres */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Rechercher un sol par nom ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="all">Tous les statuts</MenuItem>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="en_attente">En attente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Liste des sols */}
      {filteredSols.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InfoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Aucun sol disponible pour le moment
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Revenez plus tard ou créez votre propre sol
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredSols.map((sol) => (
            <Grid item xs={12} md={6} lg={4} key={sol.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {sol.nom}
                    </Typography>
                    <Chip
                      label={getStatusLabel(sol.statut)}
                      color={getStatusColor(sol.statut)}
                      size="small"
                    />
                  </Box>

                  {sol.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {sol.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      <strong>{sol.montant_par_periode?.toLocaleString('fr-FR')} HTG</strong> par période
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      Fréquence: <strong>{getFrequencyLabel(sol.frequence)}</strong>
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      <strong>{sol.membres_actuels || 0}</strong> / <strong>{sol.max_membres || 'Illimité'}</strong> membres
                    </Typography>
                  </Box>

                  {sol.date_debut && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                      Début: {new Date(sol.date_debut).toLocaleDateString('fr-FR')}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenDialog(sol)}
                    disabled={sol.statut === 'complet' || sol.statut === 'termine'}
                  >
                    {sol.statut === 'complet' ? 'Sol Complet' : 'Voir les détails'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de détails et confirmation */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Détails du Sol: {selectedSol?.nom}
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : solDetails ? (
            <Box sx={{ mt: 2 }}>
              {/* Informations générales */}
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Montant par période
                  </Typography>
                  <Typography variant="h6">
                    {solDetails.montant_par_periode?.toLocaleString('fr-FR')} HTG
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Fréquence
                  </Typography>
                  <Typography variant="h6">
                    {getFrequencyLabel(solDetails.frequence)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Membres
                  </Typography>
                  <Typography variant="h6">
                    {solDetails.membres_actuels} / {solDetails.max_membres || '∞'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Date de début
                  </Typography>
                  <Typography variant="h6">
                    {solDetails.date_debut
                      ? new Date(solDetails.date_debut).toLocaleDateString('fr-FR')
                      : 'À définir'}
                  </Typography>
                </Grid>
              </Grid>

              {solDetails.description && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    {solDetails.description}
                  </Typography>
                </>
              )}

              {/* Liste des participants */}
              {solDetails.participants && solDetails.participants.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Participants actuels ({solDetails.participants.length})
                  </Typography>
                  <List>
                    {solDetails.participants.map((participant, index) => (
                      <React.Fragment key={participant.id}>
                        <ListItem>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {participant.prenom?.charAt(0)}{participant.nom?.charAt(0)}
                          </Avatar>
                          <ListItemText
                            primary={`${participant.prenom} ${participant.nom}`}
                            secondary={`Ordre: ${participant.ordre || index + 1}`}
                          />
                          {participant.statut === 'beneficiaire' && (
                            <Chip
                              icon={<CheckIcon />}
                              label="Bénéficiaire actuel"
                              color="success"
                              size="small"
                            />
                          )}
                        </ListItem>
                        {index < solDetails.participants.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </>
              )}

              {/* Informations importantes */}
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> En rejoignant ce sol, vous vous engagez à effectuer des paiements réguliers de{' '}
                  <strong>{solDetails.montant_par_periode?.toLocaleString('fr-FR')} HTG</strong> selon la fréquence{' '}
                  <strong>{getFrequencyLabel(solDetails.frequence).toLowerCase()}</strong>. Votre ordre de réception sera déterminé après votre adhésion.
                </Typography>
              </Alert>
            </Box>
          ) : (
            <Typography>Impossible de charger les détails</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Annuler
          </Button>
          <Button
            onClick={handleJoinSol}
            variant="contained"
            color="primary"
            disabled={loadingDetails || !solDetails}
          >
            Rejoindre ce Sol
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default JoinSolPage;