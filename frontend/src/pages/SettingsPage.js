import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const SettingsPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        ⚙️ Paramètres
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Configuration de votre compte et préférences
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Cette page est en cours de développement
      </Alert>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <SettingsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Paramètres
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Fonctionnalité à venir...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;