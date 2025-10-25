import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, 
  CircularProgress, Alert 
} from '@mui/material';
import { 
  AccountBalanceWallet, Payment, People, TrendingUp 
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    solsCount: 0,
    paymentsCount: 0,
    participantsCount: 0,
    totalAmount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les données nécessaires
      const [solsResponse, paymentsResponse] = await Promise.all([
        api.get('/api/sols'),
        api.get('/api/payments/history')
      ]);

      console.log('📊 Dashboard data:', {
        sols: solsResponse.data,
        payments: paymentsResponse.data
      });

      // Calculer les statistiques
      const mySols = solsResponse.data.sols || [];
      const myPayments = paymentsResponse.data.payments || [];
      
      // Nombre de Sols où je suis créateur
      const solsCount = mySols.filter(sol => sol.creator_id === user.id).length;

      // Nombre de paiements
      const paymentsCount = myPayments.length;

      // Nombre de participants dans mes Sols
      let participantsCount = 0;
      mySols.forEach(sol => {
        if (sol.creator_id === user.id && sol.nombre_participants) {
          participantsCount += parseInt(sol.nombre_participants) || 0;
        }
      });

      // Montant total payé
      const totalAmount = myPayments
        .filter(p => p.status === 'validated' || p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      setStats({
        solsCount,
        paymentsCount,
        participantsCount,
        totalAmount: totalAmount.toFixed(2)
      });

      // Activité récente (derniers 5 paiements)
      const recentPayments = myPayments
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          type: 'payment',
          title: `Paiement pour ${p.sol_name || 'Sol'}`,
          amount: `${parseFloat(p.amount).toFixed(2)} HTG`,
          status: p.status,
          date: new Date(p.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        }));

      setRecentActivity(recentPayments);

    } catch (error) {
      console.error('❌ Erreur chargement dashboard:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { 
      title: 'Mes Sols', 
      value: stats.solsCount.toString(), 
      icon: <AccountBalanceWallet />, 
      color: 'primary.main' 
    },
    { 
      title: 'Paiements', 
      value: stats.paymentsCount.toString(), 
      icon: <Payment />, 
      color: 'success.main' 
    },
    { 
      title: 'Participants', 
      value: stats.participantsCount.toString(), 
      icon: <People />, 
      color: 'info.main' 
    },
    { 
      title: 'Montant Total', 
      value: `${stats.totalAmount} HTG`, 
      icon: <TrendingUp />, 
      color: 'warning.main' 
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f59e0b',
      'uploaded': '#3b82f6',
      'validated': '#10b981',
      'completed': '#059669',
      'rejected': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'En attente',
      'uploaded': 'Reçu uploadé',
      'validated': 'Validé',
      'completed': 'Complété',
      'rejected': 'Rejeté'
    };
    return labels[status] || status;
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
        Bienvenue, {user?.firstname} !
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Voici un aperçu de votre activité
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {statsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start' 
                }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      color: stat.color, 
                      fontSize: 40,
                      opacity: 0.8
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Activité Récente */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Activité Récente
        </Typography>
        <Card>
          <CardContent>
            {recentActivity.length === 0 ? (
              <Typography color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                Aucune activité récente
              </Typography>
            ) : (
              <Box>
                {recentActivity.map((activity, index) => (
                  <Box 
                    key={activity.id}
                    sx={{ 
                      py: 2, 
                      px: 2,
                      borderBottom: index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.2s',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: '#f9fafb'
                      }
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {activity.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {activity.date}
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2 
                    }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600,
                          color: 'primary.main'
                        }}
                      >
                        {activity.amount}
                      </Typography>

                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          backgroundColor: `${getStatusColor(activity.status)}20`,
                          color: getStatusColor(activity.status),
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}
                      >
                        {getStatusLabel(activity.status)}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Actions Rapides (optionnel) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Actions Rapides
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => window.location.href = '/sols'}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Parcourir les Sols
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Découvrir et rejoindre des Sols
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => window.location.href = '/payments'}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Payment sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Mes Paiements
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Voir l'historique complet
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => window.location.href = '/participants'}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <People sx={{ fontSize: 40, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Participants
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Gérer mes participations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;