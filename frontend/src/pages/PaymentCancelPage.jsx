import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert
} from '@mui/material';
import { Cancel, ArrowBack, Refresh } from '@mui/icons-material';

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
      <Card elevation={3}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {/* Icône d'annulation */}
          <Cancel 
            sx={{ 
              fontSize: 80, 
              color: 'warning.main',
              mb: 2
            }} 
          />

          {/* Message principal */}
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Paiement Annulé
          </Typography>

          <Typography variant="body1" color="textSecondary" paragraph sx={{ mt: 2, mb: 4 }}>
            Vous avez annulé le processus de paiement. Aucun montant n'a été débité de votre compte.
          </Typography>

          {/* Info */}
          <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
            Si vous avez rencontré un problème ou si vous souhaitez utiliser un autre mode de paiement,
            vous pouvez réessayer à tout moment depuis la page du sol.
          </Alert>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(-1)}
              startIcon={<ArrowBack />}
            >
              Retour
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/sols')}
            >
              Voir mes Sols
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentCancelPage;