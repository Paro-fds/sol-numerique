import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ AJOUTÉ
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Download, 
  Receipt as ReceiptIcon,
  Add as AddIcon, // ✅ AJOUTÉ
  Payment as PaymentIcon // ✅ AJOUTÉ
} from '@mui/icons-material';
import { paymentAPI, solAPI } from '../services/api'; // ✅ MODIFIÉ
import toast from 'react-hot-toast';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ NOUVEAU - État pour la modal de sélection de sol
  const [openSolDialog, setOpenSolDialog] = useState(false);
  const [mySols, setMySols] = useState([]);
  const [loadingSols, setLoadingSols] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentHistory();
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU - Charger mes sols
  const loadMySols = async () => {
    try {
      setLoadingSols(true);
      const response = await solAPI.getMySols();
      // Filtrer seulement les sols actifs
      const activeSols = (response.data.sols || []).filter(
        sol => sol.statut === 'active'
      );
      setMySols(activeSols);
    } catch (error) {
      console.error('Error loading sols:', error);
      toast.error('Erreur lors du chargement des sols');
    } finally {
      setLoadingSols(false);
    }
  };

  // ✅ NOUVEAU - Ouvrir la modal de sélection
  const handleOpenPaymentDialog = () => {
    setOpenSolDialog(true);
    loadMySols();
  };

  // ✅ NOUVEAU - Sélectionner un sol et aller à la page de paiement
  const handleSelectSol = (solId) => {
    setOpenSolDialog(false);
    navigate(`/sols/${solId}`); // Redirige vers la page de détails du sol
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'validated':
        return 'success';
      case 'uploaded':
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'validated':
        return 'Validé';
      case 'uploaded':
        return 'En attente de validation';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const getMethodLabel = (method) => {
    return method === 'stripe' ? 'Carte Bancaire' : 'Paiement Hors Ligne';
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const response = await paymentAPI.downloadReceipt(paymentId);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Reçu téléchargé');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
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
      {/* Header avec bouton Nouveau Paiement */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Historique des Paiements
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Consultez tous vos paiements et reçus
          </Typography>
        </Box>
        
        {/* ✅ NOUVEAU - Bouton pour effectuer un paiement */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpenPaymentDialog}
          sx={{ height: 'fit-content' }}
        >
          Effectuer un Paiement
        </Button>
      </Box>

      {/* Statistiques */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total des Paiements
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {payments.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Montant Total
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)} HTG
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              En Attente
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {payments.filter(p => p.status === 'uploaded' || p.status === 'pending').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tableau des paiements */}
      {payments.length === 0 ? (
        <Alert 
          severity="info"
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={handleOpenPaymentDialog}
            >
              Effectuer un paiement
            </Button>
          }
        >
          Vous n'avez pas encore effectué de paiement
        </Alert>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Sol</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Méthode</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {payment.sol_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {parseFloat(payment.amount).toFixed(2)} HTG
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {getMethodLabel(payment.method)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(payment.status)}
                        color={getStatusColor(payment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {payment.receipt_path && (
                        <Button
                          size="small"
                          startIcon={<Download />}
                          onClick={() => handleDownloadReceipt(payment.id)}
                        >
                          Télécharger
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ✅ NOUVEAU - Dialog pour sélectionner un sol */}
      <Dialog 
        open={openSolDialog} 
        onClose={() => setOpenSolDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentIcon />
            <Typography variant="h6">
              Sélectionnez un Sol
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingSols ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : mySols.length === 0 ? (
            <Alert severity="info">
              Vous n'avez pas de sol actif. Rejoignez ou créez un sol pour effectuer des paiements.
            </Alert>
          ) : (
            <List>
              {mySols.map((sol, index) => (
                <React.Fragment key={sol.id}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelectSol(sol.id)}>
                      <ListItemText
                        primary={sol.nom}
                        secondary={`${sol.montant_par_periode} HTG - ${sol.frequence}`}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < mySols.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSolDialog(false)}>
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentsPage;