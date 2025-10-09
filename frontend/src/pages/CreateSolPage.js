import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { solAPI } from '../services/api';
import toast from 'react-hot-toast';

const CreateSolPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    montant_par_periode: '',
    frequence: 'monthly',
    max_participants: 12
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.nom.trim()) {
      setError('Le nom du sol est requis');
      return;
    }

    if (!formData.montant_par_periode || parseFloat(formData.montant_par_periode) <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (formData.max_participants < 2 || formData.max_participants > 100) {
      setError('Le nombre de participants doit être entre 2 et 100');
      return;
    }

    setLoading(true);

    try {
      const response = await solAPI.createSol({
        ...formData,
        montant_par_periode: parseFloat(formData.montant_par_periode),
        max_participants: parseInt(formData.max_participants)
      });

      toast.success('Sol créé avec succès !');
      navigate(`/sols/${response.data.sol.id}`);
    } catch (err) {
      console.error('Error creating sol:', err);
      const message = err.response?.data?.error || 'Erreur lors de la création du sol';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/sols')}
          sx={{ mb: 2 }}
        >
          Retour aux sols
        </Button>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Créer un Nouveau Sol
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Configurez votre sol et invitez des participants
        </Typography>
      </Box>

      {/* Formulaire */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Nom du sol */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nom du Sol"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Sol Famille Janvier 2024"
                  helperText="Choisissez un nom descriptif pour votre sol"
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  placeholder="Décrivez l'objectif de ce sol..."
                  helperText="Optionnel - Expliquez le but du sol et les règles"
                />
              </Grid>

              {/* Montant */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant par Période"
                  name="montant_par_periode"
                  type="number"
                  value={formData.montant_par_periode}
                  onChange={handleChange}
                  required
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                    inputProps: { min: 1, step: 0.01 }
                  }}
                  helperText="Montant que chaque participant doit payer"
                />
              </Grid>

              {/* Fréquence */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Fréquence</InputLabel>
                  <Select
                    name="frequence"
                    value={formData.frequence}
                    onChange={handleChange}
                    label="Fréquence"
                  >
                    <MenuItem value="weekly">Hebdomadaire</MenuItem>
                    <MenuItem value="monthly">Mensuel</MenuItem>
                    <MenuItem value="quarterly">Trimestriel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Nombre max de participants */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre Maximum de Participants"
                  name="max_participants"
                  type="number"
                  value={formData.max_participants}
                  onChange={handleChange}
                  required
                  InputProps={{
                    inputProps: { min: 2, max: 100 }
                  }}
                  helperText="Entre 2 et 100 participants"
                />
              </Grid>

              {/* Aperçu du montant total */}
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="primary.dark" gutterBottom>
                    Montant Total par Tour
                  </Typography>
                  <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 600 }}>
                    {(parseFloat(formData.montant_par_periode || 0) * parseInt(formData.max_participants || 0)).toFixed(2)} €
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Informations supplémentaires */}
            <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Comment ça fonctionne ?</strong>
              </Typography>
              <Typography variant="body2">
                • Vous serez automatiquement ajouté comme premier participant<br />
                • Les autres participants pourront rejoindre avec un code d'invitation<br />
                • Chaque participant recevra son tour dans l'ordre d'inscription<br />
                • Le montant total sera versé au bénéficiaire du tour en cours
              </Typography>
            </Alert>

            {/* Boutons d'action */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/sols')}
                sx={{ flex: 1 }}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                startIcon={<Save />}
                sx={{ flex: 1 }}
              >
                {loading ? 'Création...' : 'Créer le Sol'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateSolPage;