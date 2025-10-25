import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper
} from '@mui/material';
import {
  People,
  Receipt,
  AccountBalanceWallet,
  TrendingUp,
  AttachMoney,
  PersonAdd,
  Payment,
  CheckCircle
} from '@mui/icons-material';
import api from '../services/api';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/dashboard'); // ✅ Utiliser /dashboard au lieu de /dashboard-stats
      console.log('📊 Stats received:', response.data);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des statistiques...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Reçus en Attente',
      value: stats?.pendingReceipts || 0,
      icon: <Receipt sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      bgColor: 'rgba(237, 108, 2, 0.1)',
      path: '/admin/receipts',
      action: 'Valider',
      urgent: stats?.pendingReceipts > 0
    },
    {
      title: 'Transferts à Effectuer',
      value: stats?.pendingTransfers || 0,
      icon: <AccountBalanceWallet sx={{ fontSize: 40 }} />,
      color: 'info.main',
      bgColor: 'rgba(2, 136, 209, 0.1)',
      path: '/admin/transfers',
      action: 'Gérer',
      urgent: stats?.pendingTransfers > 0
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats?.totalUsers || 0,
      icon: <People sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      bgColor: 'rgba(25, 118, 210, 0.1)',
      path: '/admin/users',
      action: 'Voir'
    },
    {
      title: 'Sols Actifs',
      value: stats?.activeSols || 0,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: 'success.main',
      bgColor: 'rgba(46, 125, 50, 0.1)',
      path: '/sols',
      action: 'Consulter'
    },
    {
      title: 'Volume Total',
      value: `${(stats?.totalTransactions || 0).toLocaleString()} HTG`,
      icon: <AttachMoney sx={{ fontSize: 40 }} />,
      color: 'success.main',
      bgColor: 'rgba(46, 125, 50, 0.1)',
      path: '/admin/reports',
      action: 'Détails'
    },
    {
      title: 'Nouveaux Membres (Mois)',
      value: stats?.newUsersThisMonth || 0,
      icon: <PersonAdd sx={{ fontSize: 40 }} />,
      color: 'secondary.main',
      bgColor: 'rgba(156, 39, 176, 0.1)',
      path: '/admin/users',
      action: 'Voir'
    },
    {
      title: 'Paiements (Mois)',
      value: stats?.paymentsThisMonth || 0,
      subtitle: `${(stats?.monthlyRevenue || 0).toLocaleString()} HTG`,
      icon: <Payment sx={{ fontSize: 40 }} />,
      color: 'info.main',
      bgColor: 'rgba(2, 136, 209, 0.1)',
      path: '/admin/reports',
      action: 'Voir'
    }
  ];

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': { label: 'En attente', color: 'default' },
      'uploaded': { label: 'Reçu uploadé', color: 'warning' },
      'validated': { label: 'Validé', color: 'success' },
      'transferred': { label: 'Transféré', color: 'info' },
      'rejected': { label: 'Rejeté', color: 'error' }
    };
    return statusMap[status] || { label: status, color: 'default' };
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Dashboard Administrateur
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Vue d'ensemble et gestion du système
        </Typography>
      </Box>

      {/* Alertes importantes */}
      {stats?.pendingReceipts > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Receipt />}>
          <Typography variant="body2">
            <strong>{stats.pendingReceipts} reçu(s)</strong> en attente de validation
          </Typography>
        </Alert>
      )}

      {stats?.pendingTransfers > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<AccountBalanceWallet />}>
          <Typography variant="body2">
            <strong>{stats.pendingTransfers} Sol(s)</strong> avec paiements à transférer
          </Typography>
        </Alert>
      )}

      {/* Cartes de statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                border: card.urgent ? '2px solid' : '1px solid',
                borderColor: card.urgent ? card.color : 'divider',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                }
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontSize: '0.75rem' }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, my: 1.5, color: card.color }}>
                        {card.value}
                      </Typography>
                      {card.subtitle && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {card.subtitle}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ color: card.color, fontWeight: 600 }}>
                        {card.action} →
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: card.bgColor,
                        color: card.color,
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Statistiques des Sols */}
      {stats?.solsStats && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              📊 État des Sols
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {stats.solsStats.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Total</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {stats.solsStats.actifs}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Actifs</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(156, 39, 176, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {stats.solsStats.termines}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Terminés</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(237, 108, 2, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {stats.solsStats.en_attente}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">En attente</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Activité Récente */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              🕒 Activité Récente
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Utilisateur</strong></TableCell>
                    <TableCell><strong>Sol</strong></TableCell>
                    <TableCell><strong>Montant</strong></TableCell>
                    <TableCell><strong>Méthode</strong></TableCell>
                    <TableCell><strong>Statut</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentActivity.map((activity) => {
                    const statusInfo = getStatusLabel(activity.status);
                    return (
                      <TableRow key={activity.id} hover>
                        <TableCell>{activity.user}</TableCell>
                        <TableCell>{activity.solName}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {activity.amount.toLocaleString()} HTG
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={activity.method === 'stripe' ? 'Stripe' : 'Hors ligne'} 
                            size="small"
                            variant="outlined"
                            color={activity.method === 'stripe' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={statusInfo.label} 
                            size="small"
                            color={statusInfo.color}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(activity.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Message si aucune activité */}
      {stats?.recentActivity && stats.recentActivity.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Aucune activité récente
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Les paiements et transactions apparaîtront ici
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default AdminDashboardPage;