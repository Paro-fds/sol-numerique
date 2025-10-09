import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh'
        }}
      >
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les permissions admin si nécessaire
  if (requireAdmin && !isAdmin()) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          textAlign: 'center',
          gap: 2
        }}
      >
        <Lock sx={{ fontSize: 64, color: 'error.main' }} />
        <Typography variant="h5" color="error">
          Accès Refusé
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.history.back()}
          sx={{ mt: 2 }}
        >
          Retour
        </Button>
      </Box>
    );
  }

  // Afficher le contenu protégé
  return <>{children}</>;
};

export default ProtectedRoute;