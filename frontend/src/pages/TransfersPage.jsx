import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  HourglassEmpty,
  ReportProblem,
  AccountBalanceWallet,
  TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TransfersPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Données
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [myHistory, setMyHistory] = useState({ received: [], participated: [] });
  const [stats, setStats] = useState(null);
  
  // Modals
  const [confirmModal, setConfirmModal] = useState({ open: false, transfer: null, type: null });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pendingRes, historyRes, statsRes] = await Promise.all([
        api.get('/api/transfers/pending'),
        api.get('/api/transfers/my-history'),
        api.get('/api/transfers/stats')
      ]);

      setPendingTransfers(pendingRes.data.transfers || []);
      setMyHistory({
        received: historyRes.data.received?.transfers || [],
        participated: historyRes.data.participated?.transfers || []
      });
      setStats(statsRes.data.stats);

    } catch (error) {
      console.error('❌ Erreur chargement transferts:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTransferred = async () => {
    try {
      setLoading(true);
      await api.post(`/api/transfers/${confirmModal.transfer.id}/mark-transferred`, {
        notes: notes || undefined
      });

      setConfirmModal({ open: false, transfer: null, type: null });
      setNotes('');
      await loadData();
      
      alert('✅ Transfert marqué comme effectué');
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors du marquage du transfert');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    try {
      setLoading(true);
      await api.post(`/api/transfers/${confirmModal.transfer.id}/confirm-receipt`, {
        notes: notes || undefined
      });

      setConfirmModal({ open: false, transfer: null, type: null });
      setNotes('');
      await loadData();
      
      alert('✅ Réception confirmée avec succès');
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert(error.response?.data?.error || 'Erreur lors de la confirmation');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!notes.trim()) {
      alert('Veuillez indiquer la raison du litige');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/api/transfers/${confirmModal.transfer.id}/dispute`, {
        notes
      });

      setConfirmModal({ open: false, transfer: null, type: null });
      setNotes('');
      await loadData();
      
      alert('⚠️ Litige signalé. Un administrateur va intervenir.');
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors du signalement du litige');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'En attente', color: 'warning', icon: <HourglassEmpty /> },
      ready: { label: 'Prêt à transférer', color: 'info', icon: <Schedule /> },
      transferring: { label: 'En cours de transfert', color: 'primary', icon: <TrendingUp /> },
      completed: { label: 'Complété', color: 'success', icon: <CheckCircle /> },
      disputed: { label: 'Litige', color: 'error', icon: <ReportProblem /> }
    };
    return configs[status] || configs.pending;
  };

  const renderTransferCard = (transfer, showActions = false) => {
    const statusConfig = getStatusConfig(transfer.status);
    const isReceiver = transfer.receiver_id === user.id;

    return (
      <Card 
        key={transfer.id}
        sx={{ 
          mb: 2,
          border: transfer.status === 'ready' ? '2px solid #2563eb' : '1px solid #e5e7eb',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)'
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {transfer.sol_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tour {transfer.tour_number}
              </Typography>
            </Box>
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              color={statusConfig.color}
              size="small"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Bénéficiaire
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {transfer.receiver_name}
                {isReceiver && ' (Vous)'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Montant
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {parseFloat(transfer.amount).toLocaleString()} HTG
              </Typography>
            </Grid>
          </Grid>

          {transfer.payments_status && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Paiements collectés
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    height: 8,
                    bgcolor: '#e5e7eb',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${transfer.payments_status.percentage}%`,
                      bgcolor: transfer.payments_status.is_ready ? '#10b981' : '#f59e0b',
                      transition: 'width 0.3s'
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 60 }}>
                  {transfer.payments_status.validated}/{transfer.payments_status.total}
                </Typography>
              </Box>
            </Box>
          )}

          {transfer.marked_at && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f3f4f6', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                📤 Marqué comme transféré le {new Date(transfer.marked_at).toLocaleDateString('fr-FR')}
                {transfer.marked_by_name && ` par ${transfer.marked_by_name}`}
              </Typography>
            </Box>
          )}

          {transfer.confirmed_at && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#d1fae5', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: '#065f46' }}>
                ✅ Réception confirmée le {new Date(transfer.confirmed_at).toLocaleDateString('fr-FR')}
              </Typography>
            </Box>
          )}

          {transfer.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2">
                {transfer.notes}
              </Typography>
            </Box>
          )}

          {showActions && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Action créateur/admin: Marquer comme transféré */}
              {transfer.status === 'ready' && !isReceiver && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => setConfirmModal({ open: true, transfer, type: 'mark' })}
                >
                  Marquer comme transféré
                </Button>
              )}

              {/* Action bénéficiaire: Confirmer réception */}
              {transfer.status === 'transferring' && isReceiver && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={() => setConfirmModal({ open: true, transfer, type: 'confirm' })}
                  >
                    Confirmer réception
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setConfirmModal({ open: true, transfer, type: 'dispute' })}
                  >
                    Signaler un problème
                  </Button>
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        💸 Gestion des Transferts
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Suivez et gérez les transferts d'argent de vos Sols
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Total Transferts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Complétés
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  En cours
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {stats.in_progress + stats.ready}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Montant Total
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {parseFloat(stats.total_amount).toLocaleString()} HTG
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Onglets */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`En cours (${pendingTransfers.length})`} />
          <Tab label={`Reçus (${myHistory.received.length})`} />
          <Tab label={`Participations (${myHistory.participated.length})`} />
        </Tabs>
      </Box>

      {/* Contenu des onglets */}
      {activeTab === 0 && (
        <Box>
          {pendingTransfers.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AccountBalanceWallet sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Aucun transfert en cours
                </Typography>
              </CardContent>
            </Card>
          ) : (
            pendingTransfers.map(transfer => renderTransferCard(transfer, true))
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {myHistory.received.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="textSecondary">
                  Aucun transfert reçu
                </Typography>
              </CardContent>
            </Card>
          ) : (
            myHistory.received.map(transfer => renderTransferCard(transfer, false))
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {myHistory.participated.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="textSecondary">
                  Aucune participation
                </Typography>
              </CardContent>
            </Card>
          ) : (
            myHistory.participated.map(transfer => renderTransferCard(transfer, false))
          )}
        </Box>
      )}

      {/* Modal de confirmation */}
      <Dialog
        open={confirmModal.open}
        onClose={() => {
          setConfirmModal({ open: false, transfer: null, type: null });
          setNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmModal.type === 'mark' && '📤 Marquer le transfert comme effectué'}
          {confirmModal.type === 'confirm' && '✅ Confirmer la réception'}
          {confirmModal.type === 'dispute' && '⚠️ Signaler un problème'}
        </DialogTitle>
        <DialogContent>
          {confirmModal.transfer && (
            <>
              <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
                <strong>Sol:</strong> {confirmModal.transfer.sol_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Tour:</strong> {confirmModal.transfer.tour_number}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Montant:</strong> {parseFloat(confirmModal.transfer.amount).toLocaleString()} HTG
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                <strong>Bénéficiaire:</strong> {confirmModal.transfer.receiver_name}
              </Typography>

              <TextField
                label={confirmModal.type === 'dispute' ? 'Raison du problème (requis)' : 'Notes (optionnel)'}
                multiline
                rows={4}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={confirmModal.type === 'dispute'}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmModal({ open: false, transfer: null, type: null });
              setNotes('');
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color={confirmModal.type === 'dispute' ? 'error' : 'primary'}
            onClick={() => {
              if (confirmModal.type === 'mark') handleMarkTransferred();
              if (confirmModal.type === 'confirm') handleConfirmReceipt();
              if (confirmModal.type === 'dispute') handleDispute();
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransfersPage;