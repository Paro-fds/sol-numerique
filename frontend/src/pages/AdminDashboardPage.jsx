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
  Alert
} from '@mui/material';
import {
  People,
  Receipt,
  AccountBalanceWallet,
  TrendingUp,
  AttachMoney,
  PersonAdd,
  Payment
} from '@mui/icons-material';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Reçus en Attente',
      value: stats?.pendingReceipts || 0,
      icon: <Receipt sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      bgColor: 'warning.light',
      path: '/admin/receipts',
      action: 'Valider'
    },
    {
      title: 'Virements à Effectuer',
      value: stats?.pendingTransfers || 0,
      icon: <AccountBalanceWallet sx={{ fontSize: 40 }} />,
      color: 'info.main',
      bgColor: 'info.light',
      path: '/admin/transfers',
      action: 'Gérer'
    },
    {
      title: 'Total Utilisateurs',
      value: stats?.totalUsers || 0,
      icon: <People sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      bgColor: 'primary.light',
      path: '/admin/users',
      action: 'Voir'
    },
    {
      title: 'Sols Actifs',
      value: stats?.activeSols || 0,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: 'success.main',
      bgColor: 'success.light',
      path: '/sols',
      action: 'Consulter'
    },
    {
      title: 'Total Transactions',
      value: `${(stats?.totalTransactions || 0).toFixed(2)}€`,
      icon: <AttachMoney sx={{ fontSize: 40 }} />,
      color: 'success.main',
      bgColor: 'success.light',
      path: '/admin/reports',
      action: 'Rapports'
    },
    {
      title: 'Nouveaux Utilisateurs (Mois)',
      value: stats?.newUsersThisMonth || 0,
      icon: <PersonAdd sx={{ fontSize: 40 }} />,
      color: 'secondary.main',
      bgColor: 'secondary.light',
      path: '/admin/users',
      action: 'Voir'
    },
    {
      title: 'Paiements (Mois)',
      value: stats?.paymentsThisMonth || 0,
      icon: <Payment sx={{ fontSize: 40 }} />,
      color: 'info.main',
      bgColor: 'info.light',
      path: '/admin/reports',
      action: 'Détails'
    }
  ];

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
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{stats.pendingReceipts} reçu(s)</strong> en attente de validation
          </Typography>
        </Alert>
      )}

      {stats?.pendingTransfers > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{stats.pendingTransfers} virement(s)</strong> à effectuer
          </Typography>
        </Alert>
      )}

      {/* Cartes de statistiques */}
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        {card.title}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, my: 2 }}>
                        {card.value}
                      </Typography>
                      <Typography variant="body2" color="primary">
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

      {/* Actions rapides */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Actions Rapides
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
              onClick={() => navigate('/admin/receipts')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Receipt sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2">Valider les Reçus</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
              onClick={() => navigate('/admin/users')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2">Gérer les Utilisateurs</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
              onClick={() => navigate('/admin/reports')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2">Voir les Rapports</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
              onClick={() => navigate('/sols')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <AccountBalanceWallet sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2">Consulter les Sols</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;