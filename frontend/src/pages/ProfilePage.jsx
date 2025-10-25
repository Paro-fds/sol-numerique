import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  MenuItem
} from '@mui/material';
import { AccountBalance, Edit, Save } from '@mui/icons-material';
import api from '../services/api';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openBankDialog, setOpenBankDialog] = useState(false);
  
  const [bankInfo, setBankInfo] = useState({
    account_number: '',
    account_type: '',
    bank_name: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/api/users/me');
      setUser(response.data.user);
      
      // Pré-remplir les infos bancaires si elles existent
      if (response.data.user.account_number) {
        setBankInfo({
          account_number: response.data.user.account_number || '',
          account_type: response.data.user.account_type || '',
          bank_name: response.data.user.bank_name || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erreur lors du chargement du profil');
    }
  };

  const handleBankInfoChange = (field, value) => {
    setBankInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateBank = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!bankInfo.account_number || bankInfo.account_number.trim() === '') {
        setError('Le numéro de compte est requis');
        setLoading(false);
        return;
      }

      console.log('📤 Sending bank info:', {
        account_number: bankInfo.account_number,
        account_type: bankInfo.account_type,
        bank_name: bankInfo.bank_name
      });

      const response = await api.put('/api/users/me/bank', {
        account_number: bankInfo.account_number.trim(),
        account_type: bankInfo.account_type || null,
        bank_name: bankInfo.bank_name || null
      });

      console.log('✅ Response:', response.data);

      if (response.data.success) {
        setSuccess('Informations bancaires mises à jour avec succès !');
        setOpenBankDialog(false);
        await loadUserProfile();
      }
    } catch (err) {
      console.error('❌ Error updating bank:', err);
      setError(
        err.response?.data?.error || 
        'Erreur lors de la mise à jour des informations bancaires'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mon Profil
      </Typography>

      {/* Messages d'erreur/succès */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informations personnelles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations Personnelles
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Nom :</strong> {user.firstname} {user.lastname}</Typography>
                <Typography><strong>Email :</strong> {user.email}</Typography>
                <Typography><strong>Téléphone :</strong> {user.phone || 'Non renseigné'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations bancaires */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Informations Bancaires
                </Typography>
                <Button
                  startIcon={<Edit />}
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenBankDialog(true)}
                >
                  Modifier
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography>
                  <strong>Compte :</strong> {user.account_number || 'Non renseigné'}
                </Typography>
                <Typography>
                  <strong>Type :</strong> {user.account_type || 'Non renseigné'}
                </Typography>
                <Typography>
                  <strong>Banque :</strong> {user.bank_name || 'Non renseigné'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog pour modifier les informations bancaires */}
      <Dialog 
        open={openBankDialog} 
        onClose={() => !loading && setOpenBankDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
          Modifier les Informations Bancaires
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Numéro de compte *"
            value={bankInfo.account_number}
            onChange={(e) => handleBankInfoChange('account_number', e.target.value)}
            margin="normal"
            required
            placeholder="Ex: 1234567890"
            helperText="Requis - Votre numéro de compte bancaire"
          />

          <TextField
            fullWidth
            select
            label="Type de compte"
            value={bankInfo.account_type}
            onChange={(e) => handleBankInfoChange('account_type', e.target.value)}
            margin="normal"
          >
            <MenuItem value="">Sélectionner</MenuItem>
            <MenuItem value="checking">Compte courant</MenuItem>
            <MenuItem value="savings">Compte épargne</MenuItem>
            <MenuItem value="mobile">Mobile Money</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Nom de la banque"
            value={bankInfo.bank_name}
            onChange={(e) => handleBankInfoChange('bank_name', e.target.value)}
            margin="normal"
            placeholder="Ex: Unibank, Sogebank, BNC..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenBankDialog(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            onClick={handleUpdateBank}
            disabled={loading || !bankInfo.account_number}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;