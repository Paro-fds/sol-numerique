import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { paymentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const StripePayment = ({ participationId, amount, solName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await paymentAPI.createStripeSession(participationId, amount);
      
      // Rediriger vers Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      const message = err.response?.data?.error || 'Erreur lors du paiement';
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CreditCard sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Paiement par Carte Bancaire
          </Typography>
        </Box>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Payez en toute sécurité avec Stripe
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.light', 
            borderRadius: 1,
            mb: 3 
          }}>
            <Typography variant="body2" color="primary.dark" gutterBottom>
              Sol : {solName}
            </Typography>
            <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 700 }}>
              Montant : {amount}€
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePayment}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CreditCard />}
          >
            {loading ? 'Redirection vers Stripe...' : `Payer ${amount}€ avec Stripe`}
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Vous serez redirigé vers Stripe pour finaliser le paiement
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StripePayment;