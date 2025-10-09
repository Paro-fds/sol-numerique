import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const AdminReceiptsPage = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [validationDialog, setValidationDialog] = useState(false);
  const [validationType, setValidationType] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingReceipts();
      setReceipts(response.data.receipts || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
  };

  const handleCloseView = () => {
    setSelectedReceipt(null);
  };

  const handleOpenValidation = (receipt, type) => {
    setSelectedReceipt(receipt);
    setValidationType(type);
    setNotes('');
    setValidationDialog(true);
  };

  const handleCloseValidation = () => {
    setValidationDialog(false);
    setSelectedReceipt(null);
    setValidationType('');
    setNotes('');
  };

  const handleValidate = async () => {
    if (!selectedReceipt) return;

    setProcessing(true);
    try {
      await adminAPI.validateReceipt(
        selectedReceipt.id,
        validationType,
        notes
      );

      toast.success(
        validationType === 'validated'
          ? 'Reçu validé avec succès'
          : 'Reçu rejeté'
      );

      // Recharger la liste
      await loadReceipts();
      handleCloseValidation();
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const getReceiptUrl = (receiptPath) => {
    return `${process.env.REACT_APP_API_URL}/uploads/${receiptPath}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 2 }}
        >
          Retour au Dashboard
        </Button>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Validation des Reçus
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Vérifiez et validez les reçus de paiement uploadés
        </Typography>
      </Box>

      {/* Liste des reçus */}
      {receipts.length === 0 ? (
        <Alert severity="info">
          Aucun reçu en attente de validation
        </Alert>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Sol</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Ordre</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id} hover>
                    <TableCell>
                      {new Date(receipt.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {receipt.firstname} {receipt.lastname}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {receipt.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{receipt.sol_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {parseFloat(receipt.amount).toFixed(2)}€
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`Tour ${receipt.ordre}`} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewReceipt(receipt)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleOpenValidation(receipt, 'validated')}
                        >
                          Valider
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleOpenValidation(receipt, 'rejected')}
                        >
                          Rejeter
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Dialog de visualisation du reçu */}
      <Dialog
        open={!!selectedReceipt && !validationDialog}
        onClose={handleCloseView}
        maxWidth="md"
        fullWidth
      >
        {selectedReceipt && (
          <>
            <DialogTitle>
              Reçu de {selectedReceipt.firstname} {selectedReceipt.lastname}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Sol : {selectedReceipt.sol_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Montant : {selectedReceipt.amount}€
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Date : {new Date(selectedReceipt.created_at).toLocaleDateString('fr-FR')}
                </Typography>
              </Box>

              {selectedReceipt.receipt_path && (
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.100'
                  }}
                >
                  {selectedReceipt.receipt_path.endsWith('.pdf') ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography gutterBottom>Fichier PDF</Typography>
                      <Button
                        variant="contained"
                        href={getReceiptUrl(selectedReceipt.receipt_path)}
                        target="_blank"
                      >
                        Ouvrir le PDF
                      </Button>
                    </Box>
                  ) : (
                    <img
                      src={getReceiptUrl(selectedReceipt.receipt_path)}
                      alt="Reçu"
                      style={{ width: '100%', display: 'block' }}
                    />
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseView}>Fermer</Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={() => {
                  handleCloseView();
                  handleOpenValidation(selectedReceipt, 'rejected');
                }}
              >
                Rejeter
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => {
                  handleCloseView();
                  handleOpenValidation(selectedReceipt, 'validated');
                }}
              >
                Valider
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog de confirmation de validation */}
      <Dialog open={validationDialog} onClose={handleCloseValidation} maxWidth="sm" fullWidth>
        <DialogTitle>
          {validationType === 'validated' ? 'Valider le Reçu' : 'Rejeter le Reçu'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {validationType === 'validated'
              ? 'Confirmez-vous la validation de ce reçu ?'
              : 'Pourquoi rejetez-vous ce reçu ?'}
          </Typography>
          <TextField
            fullWidth
            label="Notes (optionnel)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder={
              validationType === 'rejected'
                ? 'Précisez la raison du rejet...'
                : 'Ajoutez des notes si nécessaire...'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseValidation} disabled={processing}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color={validationType === 'validated' ? 'success' : 'error'}
            onClick={handleValidate}
            disabled={processing}
          >
            {processing ? 'Traitement...' : validationType === 'validated' ? 'Valider' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReceiptsPage;