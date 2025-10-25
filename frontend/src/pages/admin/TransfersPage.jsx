import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // ✅ Importer le contexte
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  LockPerson as LockPersonIcon
} from '@mui/icons-material';
import api from '../../services/api'; // ✅ Utiliser l'instance API configurée

const TransfersPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // ✅ Utiliser le contexte
  
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Formulaire de transfert
  const [transferForm, setTransferForm] = useState({
    transfer_reference: '',
    transfer_notes: ''
  });

  // Vérifier l'authentification et le rôle admin
  useEffect(() => {
    console.log('🔍 Auth check:', { isAuthenticated, user, authLoading });
    
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    } else if (!authLoading && isAuthenticated && user?.role !== 'admin') {
      setError('Vous devez être administrateur pour accéder à cette page.');
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  // Charger les transferts en attente
  const loadPendingTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 DEBUG - User:', user);
      console.log('🔍 DEBUG - Is authenticated:', isAuthenticated);
      console.log('🔍 DEBUG - Making request to: /api/payments/pending-transfers');

      const response = await api.get('/api/payments/pending-transfers'); // ✅ Utiliser api au lieu d'axios

      console.log('✅ DEBUG - Response received:', response.data);
      setTransfers(response.data.transfers || []);
    } catch (err) {
      console.error('❌ DEBUG - Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
      } else {
        setError(err.response?.data?.error || 'Erreur lors du chargement des transferts');
      }
      
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Erreur lors du chargement',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTransfers();
  }, []);

  // Ouvrir le dialogue de transfert
  const handleOpenTransferDialog = (transfer) => {
    setSelectedTransfer(transfer);
    setTransferForm({
      transfer_reference: `TRANS-${transfer.sol_id}-${Date.now()}`,
      transfer_notes: ''
    });
    setDialogOpen(true);
  };

  // Fermer le dialogue
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTransfer(null);
    setTransferForm({
      transfer_reference: '',
      transfer_notes: ''
    });
  };

  // Effectuer le transfert groupé
  const handleConfirmTransfer = async () => {
    if (!selectedTransfer) return;

    try {
      setTransferring(true);

      const response = await api.post(
        `api/payments/sols/${selectedTransfer.sol_id}/transfer-all`,
        transferForm
      );

      setSnackbar({
        open: true,
        message: `✅ ${response.data.message}`,
        severity: 'success'
      });

      // Recharger les transferts
      await loadPendingTransfers();

      // Fermer le dialogue
      handleCloseDialog();
    } catch (err) {
      console.error('Transfer error:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Erreur lors du transfert',
        severity: 'error'
      });
    } finally {
      setTransferring(false);
    }
  };

  // Marquer un paiement individuel comme transféré
  const handleTransferSingle = async (paymentId) => {
    try {
      const response = await api.post(
        `api/payments/${paymentId}/mark-transferred`,
        {
          transfer_reference: `SINGLE-${paymentId}-${Date.now()}`,
          transfer_notes: 'Transfert individuel effectué'
        }
      );

      setSnackbar({
        open: true,
        message: '✅ Paiement marqué comme transféré',
        severity: 'success'
      });

      // Recharger
      await loadPendingTransfers();
    } catch (err) {
      console.error('Transfer error:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Erreur lors du transfert',
        severity: 'error'
      });
    }
  };

  // Fermer le snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Attendre que l'authentification soit vérifiée
  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement des transferts...</Typography>
      </Container>
    );
  }

  // Vérifier l'authentification
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Card sx={{ p: 4 }}>
          <LockPersonIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Authentification requise
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Vous devez être connecté en tant qu'administrateur pour accéder à cette page.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/login')}
          >
            Se connecter
          </Button>
        </Card>
      </Container>
    );
  }

  // Vérifier le rôle admin
  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Card sx={{ p: 4 }}>
          <LockPersonIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Accès refusé
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Seuls les administrateurs peuvent accéder à cette page.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Retour au tableau de bord
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* En-tête */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon fontSize="large" />
            Gestion des Transferts
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Effectuez les virements vers les bénéficiaires
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadPendingTransfers}
          disabled={loading}
        >
          Actualiser
        </Button>
      </Box>

      {/* Message d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* État vide */}
      {!loading && transfers.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Aucun transfert en attente
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tous les paiements validés ont été transférés
          </Typography>
        </Card>
      )}

      {/* Liste des transferts */}
      {transfers.map((transfer) => (
        <Card key={transfer.sol_id} sx={{ mb: 3, border: '2px solid', borderColor: 'divider' }}>
          <CardContent>
            {/* En-tête du Sol */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {transfer.sol_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tour {transfer.tour_actuel} / {transfer.nombre_participants}
                </Typography>
              </Box>
              
              <Chip 
                label={transfer.all_paid ? "✅ Tous payé" : "⏳ En attente"}
                color={transfer.all_paid ? "success" : "warning"}
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Informations du bénéficiaire */}
            {transfer.beneficiary ? (
              <Box sx={{ bgcolor: '#e8f5e9', p: 2, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'success.dark' }}>
                  💰 Bénéficiaire du tour {transfer.tour_actuel}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Nom :</strong> {transfer.beneficiary.firstname} {transfer.beneficiary.lastname}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Email :</strong> {transfer.beneficiary.email}
                    </Typography>
                  </Grid>
                  
                  {transfer.beneficiary.phone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Téléphone :</strong> {transfer.beneficiary.phone}
                      </Typography>
                    </Grid>
                  )}
                  
                  {transfer.beneficiary.compte_bancaire ? (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: 'success.main',
                        fontSize: '1.1rem',
                        bgcolor: 'white',
                        p: 1,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: 'success.main'
                      }}>
                        <strong>💳 Compte :</strong> {transfer.beneficiary.compte_bancaire}
                      </Typography>
                    </Grid>
                  ) : (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        ⚠️ Aucun compte bancaire renseigné pour ce bénéficiaire
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                ❌ Aucun bénéficiaire défini pour ce tour
              </Alert>
            )}

            {/* Montant total */}
            <Box sx={{ bgcolor: '#fff3e0', p: 3, borderRadius: 2, mb: 2, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                {transfer.total_amount.toLocaleString()} HTG
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {transfer.payments_count} paiement(s) validé(s) sur {transfer.nombre_participants}
              </Typography>
              
              {transfer.expected_amount && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  Montant attendu : {transfer.expected_amount.toLocaleString()} HTG
                </Typography>
              )}
            </Box>

            {/* Liste des paiements */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📋 Détail des paiements
            </Typography>
            
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Payeur</strong></TableCell>
                    <TableCell><strong>Montant</strong></TableCell>
                    <TableCell><strong>Méthode</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell align="center"><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transfer.payments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>
                        {payment.payer.firstname} {payment.payer.lastname}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {payment.amount.toLocaleString()} HTG
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={payment.method === 'stripe' ? '💳 Stripe' : '🏦 Hors ligne'}
                          size="small"
                          variant="outlined"
                          color={payment.method === 'stripe' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(payment.validated_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleTransferSingle(payment.id)}
                        >
                          Marquer transféré
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Bouton de transfert groupé */}
            <Box sx={{ mt: 3 }}>
              {transfer.beneficiary ? (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    size="large"
                    onClick={() => handleOpenTransferDialog(transfer)}
                    disabled={!transfer.all_paid}
                    sx={{ 
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600
                    }}
                  >
                    💸 Transférer {transfer.total_amount.toLocaleString()} HTG à {transfer.beneficiary.firstname}
                  </Button>
                  
                  {!transfer.all_paid && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      ⏳ En attente de {transfer.nombre_participants - transfer.payments_count} paiement(s) supplémentaire(s)
                    </Alert>
                  )}
                </>
              ) : (
                <Alert severity="error">
                  Impossible d'effectuer le transfert : aucun bénéficiaire défini
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Dialogue de confirmation de transfert */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>💸 Confirmer le transfert</span>
            <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          {selectedTransfer && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Attention :</strong> Vous êtes sur le point d'effectuer un transfert de{' '}
                <strong>{selectedTransfer.total_amount.toLocaleString()} HTG</strong> vers{' '}
                <strong>{selectedTransfer.beneficiary?.firstname} {selectedTransfer.beneficiary?.lastname}</strong>
              </Alert>

              {selectedTransfer.beneficiary?.compte_bancaire && (
                <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1, mb: 3, border: '2px solid', borderColor: 'success.main' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    📱 Compte bénéficiaire :
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'success.main' }}>
                    {selectedTransfer.beneficiary.compte_bancaire}
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label="Référence du transfert"
                value={transferForm.transfer_reference}
                onChange={(e) => setTransferForm({ ...transferForm, transfer_reference: e.target.value })}
                sx={{ mb: 2 }}
                required
                helperText="Ex: MONCASH-20250123-001, VIREMENT-001"
              />

              <TextField
                fullWidth
                label="Notes (optionnel)"
                value={transferForm.transfer_notes}
                onChange={(e) => setTransferForm({ ...transferForm, transfer_notes: e.target.value })}
                multiline
                rows={3}
                placeholder="Ajoutez des notes sur ce transfert..."
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>⚠️ Important :</strong> Assurez-vous d'avoir effectué le virement bancaire 
                AVANT de confirmer ici. Cette action marquera tous les paiements comme transférés.
              </Alert>
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseDialog} 
            disabled={transferring}
          >
            Annuler
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleConfirmTransfer}
            disabled={transferring || !transferForm.transfer_reference}
            startIcon={transferring ? <CircularProgress size={20} /> : null}
          >
            {transferring ? 'Transfert en cours...' : 'Confirmer le transfert'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TransfersPage;