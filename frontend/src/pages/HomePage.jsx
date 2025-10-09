import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, Grid, Card, CardContent } from '@mui/material';
import { AccountBalanceWallet, Security, Speed, People } from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <AccountBalanceWallet />, title: 'Gestion Simplifiée', description: 'Gérez vos sols en toute simplicité' },
    { icon: <Security />, title: 'Sécurisé', description: 'Vos données sont protégées' },
    { icon: <Speed />, title: 'Rapide', description: 'Paiements instantanés' },
    { icon: <People />, title: 'Collaboratif', description: 'Travaillez en groupe' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Sol Numérique
          </Typography>
          <Typography variant="h5" color="textSecondary" paragraph>
            Simplifiez la gestion de vos sols collectifs
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" size="large" onClick={() => navigate('/register')}>
              S'inscrire
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" gutterBottom>{feature.title}</Typography>
                  <Typography variant="body2" color="textSecondary">{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};
export default HomePage;