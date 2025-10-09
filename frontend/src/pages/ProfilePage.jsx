import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Avatar, Chip } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Mon Profil
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2rem' }}>
                {user?.firstname?.[0]}{user?.lastname?.[0]}
              </Avatar>
              <Typography variant="h6">{user?.firstname} {user?.lastname}</Typography>
              <Typography variant="body2" color="textSecondary">{user?.email}</Typography>
              <Chip label={user?.role === 'admin' ? 'Administrateur' : 'Membre'} color="primary" sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Informations Personnelles</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Prénom</Typography>
                  <Typography>{user?.firstname}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Nom</Typography>
                  <Typography>{user?.lastname}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Email</Typography>
                  <Typography>{user?.email}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Téléphone</Typography>
                  <Typography>{user?.phone || 'Non renseigné'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default ProfilePage;