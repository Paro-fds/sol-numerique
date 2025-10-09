import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Search,
  People,
  AttachMoney,
  CalendarToday,
  TrendingUp
} from '@mui/icons-material';
import { solAPI } from '../services/api';
import toast from 'react-hot-toast';

const SolsPage = () => {
  const navigate = useNavigate();
  const [sols, setSols] = useState([]);
  const [filteredSols, setFilteredSols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadSols();
  }, []);

  useEffect(() => {
    filterSols();
  }, [sols, searchQuery, activeTab]);

  const loadSols = async () => {
    try {
      setLoading(true);
      const response = await solAPI.getSols();
      setSols(response.data.sols || []);
    } catch (error) {
      console.error('Error loading sols:', error);
      toast.error('Erreur lors du chargement des sols');
    } finally {
      setLoading(false);
    }
  };

  const filterSols = () => {
    let filtered = [...sols];

    // Filtrer par statut selon l'onglet
    if (activeTab === 0) {
      filtered = filtered.filter(sol => sol.statut === 'active');
    } else if (activeTab === 1) {
      filtered = filtered.filter(sol => sol.statut === 'completed');
    } else if (activeTab === 2) {
      filtered = filtered.filter(sol => sol.statut === 'cancelled');
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sol =>
        sol.nom.toLowerCase().includes(query) ||
        (sol.description && sol.description.toLowerCase().includes(query))
      );
    }

    setFilteredSols(filtered);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'active':
        return 'Actif';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      default:
        return statut;
    }
  };

  const getFrequencyLabel = (frequence) => {
    switch (frequence) {
      case 'weekly':
        return 'Hebdomadaire';
      case 'monthly':
        return 'Mensuel';
      case 'quarterly':
        return 'Trimestriel';
      default:
        return frequence;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Mes Sols
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Gérez vos sols et participations
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => navigate('/sols/create')}
          sx={{ boxShadow: 2 }}
        >
          Créer un Sol
        </Button>
      </Box>

      {/* Barre de recherche */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher un sol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Onglets de filtrage */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`Actifs (${sols.filter(s => s.statut === 'active').length})`} />
          <Tab label={`Terminés (${sols.filter(s => s.statut === 'completed').length})`} />
          <Tab label={`Annulés (${sols.filter(s => s.statut === 'cancelled').length})`} />
          <Tab label={`Tous (${sols.length})`} />
        </Tabs>
      </Box>

      {/* Liste des sols */}
      {filteredSols.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          {searchQuery
            ? 'Aucun sol ne correspond à votre recherche'
            : activeTab === 0
            ? 'Vous n\'avez pas encore de sol actif. Créez-en un pour commencer !'
            : 'Aucun sol dans cette catégorie'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredSols.map((sol) => (
            <Grid item xs={12} sm={6} md={4} key={sol.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* En-tête de la carte */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {sol.nom}
                    </Typography>
                    <Chip
                      label={getStatusLabel(sol.statut)}
                      color={getStatusColor(sol.statut)}
                      size="small"
                    />
                  </Box>

                  {/* Description */}
                  {sol.description && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {sol.description}
                    </Typography>
                  )}

                  {/* Informations */}
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="textSecondary">
                        {sol.montant_par_periode}€ / {getFrequencyLabel(sol.frequence)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <People sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="textSecondary">
                        {sol.participants_count || 0} participant(s)
                      </Typography>
                    </Box>

                    {sol.my_ordre && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Typography variant="body2" color="textSecondary">
                          Ma position : {sol.my_ordre}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="textSecondary">
                        Créé le {new Date(sol.created_at).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate(`/sols/${sol.id}`)}
                  >
                    Voir Détails
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SolsPage;