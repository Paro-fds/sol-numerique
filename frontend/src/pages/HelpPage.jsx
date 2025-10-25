import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';

const HelpPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        ❓ Centre d'Aide
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Documentation et support
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Cette page est en cours de développement
      </Alert>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <HelpIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Centre d'Aide
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Documentation et FAQ à venir...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HelpPage;