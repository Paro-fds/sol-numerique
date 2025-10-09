import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Error } from '@mui/icons-material';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Error sx={{ fontSize: 100, color: 'error.main', mb: 2 }} />
      <Typography variant="h3" gutterBottom>404</Typography>
      <Typography variant="h5" color="textSecondary" paragraph>Page non trouvée</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Retour au Dashboard
      </Button>
    </Box>
  );
};
export default NotFoundPage;