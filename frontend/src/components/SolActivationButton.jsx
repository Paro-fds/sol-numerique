// frontend/src/components/SolActivationButton.jsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

const SolActivationButton = ({ sol, onActivated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateDebut, setDateDebut] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleActivate = async () => {
    try {
      setLoading(true);

      const response = await api.post(`/sols/${sol.id}/activate`, {
        date_debut: dateDebut
      });

      toast.success(response.data.message || 'Sol activé avec succès !');
      
      if (onActivated) {
        onActivated(response.data.sol);
      }

      handleClose();
    } catch (error) {
      console.error('Activation error:', error);
      toast.error(
        error.response?.data?.error || 'Erreur lors de l\'activation du Sol'
      );
    } finally {
      setLoading(false);
    }
  };

  // N'afficher que si le Sol n'est pas actif
  if (sol.statut === 'actif' || sol.statut === 'active') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon color="success" />
        <Typography variant="body2" color="success.main">
          Sol actif
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<PlayArrowIcon />}
        onClick={handleOpen}
        sx={{ fontWeight: 600 }}
      >
        Activer le Sol
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Activer le Sol "{sol.nom}"
        </DialogTitle>

        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              L'activation du Sol permettra aux participants de commencer à effectuer leurs paiements.
              Le premier tour débutera à la date choisie.
            </Typography>
          </Alert>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            📊 Informations du Sol
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 3 }}>
            <Typography variant="body2">
              <strong>Participants:</strong> {sol.participantsCount || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Nombre de tours:</strong> {sol.nombre_tours}
            </Typography>
            <Typography variant="body2">
              <strong>Montant par période:</strong> {sol.montant_par_periode?.toLocaleString()} HTG
            </Typography>
            <Typography variant="body2">
              <strong>Périodicité:</strong> {sol.periodicite}
            </Typography>
          </Box>

          <TextField
            label="Date de début du premier tour"
            type="date"
            fullWidth
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              min: new Date().toISOString().split('T')[0]
            }}
            helperText="Les paiements seront possibles à partir de cette date"
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleActivate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            {loading ? 'Activation...' : 'Activer le Sol'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SolActivationButton;