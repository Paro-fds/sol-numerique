import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { AccountBalanceWallet, Payment, People, TrendingUp } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();

  const stats = [
    { title: 'Mes Sols', value: '0', icon: <AccountBalanceWallet />, color: 'primary.main' },
    { title: 'Paiements', value: '0', icon: <Payment />, color: 'success.main' },
    { title: 'Participants', value: '0', icon: <People />, color: 'info.main' },
    { title: 'Montant Total', value: '0 €', icon: <TrendingUp />, color: 'warning.main' }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Bienvenue, {user?.firstname} !
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Voici un aperçu de votre activité
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, fontSize: 40 }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Activité Récente</Typography>
        <Card>
          <CardContent>
            <Typography color="textSecondary">Aucune activité récente</Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
export default DashboardPage;