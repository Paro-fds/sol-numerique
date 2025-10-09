import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'Chargement...', size = 40, fullScreen = false }) => {
  const containerStyles = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
      };

  return (
    <Box sx={containerStyles}>
      <CircularProgress size={size} sx={{ mb: 2 }} />
      {message && (
        <Typography variant="body2" color="textSecondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;