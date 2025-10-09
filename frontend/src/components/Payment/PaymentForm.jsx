import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper
} from '@mui/material';
import { CreditCard, Receipt } from '@mui/icons-material';
import StripePayment from './StripePayment';
import ReceiptUpload from './ReceiptUpload';

const PaymentForm = ({ participationId, amount, solName, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const handleMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setPaymentMethod(newMethod);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Effectuer un Paiement
      </Typography>

      {/* Sélecteur de méthode de paiement */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Choisissez votre méthode de paiement
        </Typography>
        <ToggleButtonGroup
          value={paymentMethod}
          exclusive
          onChange={handleMethodChange}
          fullWidth
          sx={{ mt: 1 }}
        >
          <ToggleButton value="stripe" sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CreditCard sx={{ mb: 1 }} />
              <Typography variant="body2">Carte Bancaire (Stripe)</Typography>
            </Box>
          </ToggleButton>
          <ToggleButton value="offline" sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Receipt sx={{ mb: 1 }} />
              <Typography variant="body2">Paiement Hors Ligne</Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Formulaire de paiement selon la méthode */}
      {paymentMethod === 'stripe' ? (
        <StripePayment
          participationId={participationId}
          amount={amount}
          solName={solName}
          onSuccess={onSuccess}
        />
      ) : (
        <ReceiptUpload
          participationId={participationId}
          solName={solName}
          onSuccess={onSuccess}
        />
      )}
    </Box>
  );
};

export default PaymentForm;