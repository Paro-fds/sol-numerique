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
      // 🔍 LOGS DE DEBUG
      console.log('=== TENTATIVE DE PAIEMENT STRIPE ===');
      console.log('participationId:', participationId);
      console.log('amount:', amount);
      console.log('solName:', solName);
      console.log('Type participationId:', typeof participationId);

      // ✅ VALIDATION
      if (!participationId) {
        throw new Error('participationId est manquant');
      }

      if (!amount || amount <= 0) {
        throw new Error('Montant invalide');
      }

      // ✅ CORRECTION CRITIQUE: Envoyer un OBJET, pas des paramètres séparés
      const paymentData = {
        participationId: parseInt(participationId),
        amount: parseFloat(amount),
        solName: solName || 'Paiement Sol'
      };

      console.log('📤 Données envoyées:', paymentData);

      const response = await paymentAPI.createStripeSession(paymentData);
      
      console.log('✅ Réponse reçue:', response.data);

      // Rediriger vers Stripe Checkout
      if (response.data.url) {
        console.log('🔄 Redirection vers:', response.data.url);
        window.location.href = response.data.url;
      } else if (response.data.sessionId) {
        // Si pas d'URL mais un sessionId, utiliser Stripe SDK
        console.log('⚠️ Pas d\'URL, sessionId:', response.data.sessionId);
        toast.error('Redirection Stripe non configurée correctement');
      } else {
        throw new Error('Aucune URL de redirection reçue');
      }
    } catch (err) {
      console.error('❌ ERREUR STRIPE:', err);
      console.error('❌ Réponse serveur:', err.response?.data);
      console.error('❌ Status:', err.response?.status);
      
      const message = err.response?.data?.message || 
                     err.response?.data?.error || 
                     err.message || 
                     'Erreur lors du paiement';
      
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CreditCard sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Paiement par Carte Bancaire
          </Typography>
        </Box>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Paiement sécurisé via Stripe • Vos données sont protégées
        </Typography>

        {/* Info de debug - À retirer en production */}
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="caption" component="div">
            <strong>Debug Info:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            participationId: {participationId || '❌ MANQUANT'}
          </Typography>
          <Typography variant="caption" component="div">
            amount: {amount || '❌ MANQUANT'}
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Box sx={{ 
            p: 3, 
            bgcolor: 'primary.light', 
            borderRadius: 2,
            mb: 3,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="primary.dark" gutterBottom>
              {solName}
            </Typography>
            <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 700, mt: 1 }}>
              {amount}€
            </Typography>
            <Typography variant="caption" color="primary.dark" sx={{ mt: 1, display: 'block' }}>
              Montant à payer
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePayment}
            disabled={loading || !participationId || !amount}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
            sx={{ py: 1.5 }}
          >
            {loading ? 'Redirection vers Stripe...' : `Payer ${amount}€ avec Stripe`}
          </Button>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              💳 <strong>Carte de test:</strong> 4242 4242 4242 4242
            </Typography>
            <Typography variant="caption" display="block">
              Date: 12/34 • CVC: 123 • Code postal: 12345
            </Typography>
          </Alert>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            🔒 Paiement 100% sécurisé • Vous serez redirigé vers Stripe
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StripePayment;