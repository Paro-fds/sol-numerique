import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Download,
  HourglassEmpty
} from '@mui/icons-material';
import { paymentAPI } from '../services/api';
import toast from 'react-hot-toast';
import ReceiptViewer from '../components/admin/ReceiptViewer';

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal de validation
  const [validateModal, setValidateModal] = useState({ open: false, payment: null });
  const [notes, setNotes] = useState('');
  const [validating, setValidating] = useState(false);

  // ✅ Viewer de reçu
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Utiliser l'endpoint correct
      const response = await paymentAPI.getPendingReceipts();
      
      setPayments(response.data.payments || []);

    } catch (error) {
      console.error('❌ Erreur chargement paiements:', error);
      setError('Erreur lors du chargement des paiements');
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRIGER : Fonction pour voir le reçu
  const handleViewReceipt = async (payment) => {
    try {
      console.log('👁️ Viewing receipt for payment:', payment.id);
      
      const response = await paymentAPI.getReceiptUrl(payment.id);
      console.log('✅ Receipt URL:', response.data.url);
      
      // Ouvrir dans un nouvel onglet
      window.open(response.data.url, '_blank');
      
    } catch (error) {
      console.error('❌ Error viewing receipt:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du chargement du reçu');
    }
  };

  // ✅ ALTERNATIVE : Utiliser le modal viewer
  const handleViewReceiptModal = (payment) => {
    console.log('👁️ Opening receipt viewer for payment:', payment.id);
    setSelectedPayment(payment);
    setViewerOpen(true);
  };

  const handleValidate = async () => {
    if (!validateModal.payment) return;

    try {
      setValidating(true);

      await paymentAPI.validatePayment(validateModal.payment.id, {
        notes: notes || 'Paiement validé par admin'
      });

      setValidateModal({ open: false, payment: null });
      setNotes('');
      await loadPayments();
      
      toast.success('✅ Paiement validé avec succès !');

    } catch (error) {
      console.error('❌ Erreur validation:', error);
      toast.error('Erreur lors de la validation du paiement');
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async (payment) => {
    const reason = prompt('Raison du rejet :');
    if (!reason) return;

    try {
      await paymentAPI.rejectPayment(payment.id, {
        reason
      });

      await loadPayments();
      toast.success('❌ Paiement rejeté');

    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      toast.error('Erreur lors du rejet du paiement');
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'En attente', color: 'warning', icon: <HourglassEmpty /> },
      uploaded: { label: 'Reçu uploadé', color: 'info', icon: <Visibility /> },
      validated: { label: 'Validé', color: 'success', icon: <CheckCircle /> },
      rejected: { label: 'Rejeté', color: 'error', icon: <Cancel /> }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        ✅ Validation des Paiements
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Gérez et validez les paiements en attente
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Total en attente
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {payments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Reçus uploadés
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {payments.filter(p => p.status === 'uploaded').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Montant total
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()} HTG
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Liste des paiements */}
      {payments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Aucun paiement en attente
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Tous les paiements ont été traités
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Membre</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Sol</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Montant</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Méthode</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                
                return (
                  <TableRow 
                    key={payment.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'grey.50' },
                      bgcolor: payment.status === 'uploaded' ? '#e3f2fd' : 'inherit'
                    }}
                  >
                    <TableCell>#{payment.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {payment.payer_firstname} {payment.payer_lastname}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {payment.payer_email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {payment.sol_name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {parseFloat(payment.amount).toFixed(2)} HTG
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.method === 'stripe' ? 'Stripe' : 'Hors ligne'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusConfig.icon}
                        label={statusConfig.label}
                        color={statusConfig.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(payment.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {payment.receipt_path && (
                          <>
                            <Tooltip title="Voir le reçu (nouvel onglet)">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleViewReceipt(payment)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            
                            {/* ✅ ALTERNATIVE : Modal viewer */}
                            <Tooltip title="Voir le reçu (modal)">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleViewReceiptModal(payment)}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        
                        <Tooltip title="Valider">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => setValidateModal({ open: true, payment })}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Rejeter">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReject(payment)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal de validation */}
      <Dialog
        open={validateModal.open}
        onClose={() => {
          setValidateModal({ open: false, payment: null });
          setNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>✅ Valider le paiement</DialogTitle>
        <DialogContent>
          {validateModal.payment && (
            <>
              <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
                <strong>ID:</strong> #{validateModal.payment.id}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Membre:</strong> {validateModal.payment.payer_firstname} {validateModal.payment.payer_lastname}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Sol:</strong> {validateModal.payment.sol_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Montant:</strong> {parseFloat(validateModal.payment.amount).toFixed(2)} HTG
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                <strong>Méthode:</strong> {validateModal.payment.method === 'stripe' ? 'Stripe' : 'Hors ligne'}
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                En validant ce paiement, vous confirmez avoir vérifié le reçu et effectué les vérifications nécessaires.
              </Alert>

              <TextField
                label="Notes (optionnel)"
                multiline
                rows={3}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reçu vérifié, paiement confirmé"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setValidateModal({ open: false, payment: null });
              setNotes('');
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleValidate}
            disabled={validating}
            startIcon={validating ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {validating ? 'Validation...' : 'Valider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Modal Viewer de reçu */}
      {selectedPayment && (
        <ReceiptViewer
          paymentId={selectedPayment.id}
          open={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </Box>
  );
};

export default AdminPaymentsPage;