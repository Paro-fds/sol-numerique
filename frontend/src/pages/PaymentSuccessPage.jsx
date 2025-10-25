import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { CheckCircle, Home, Receipt } from '@mui/icons-material';
import { paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setError('Session de paiement introuvable');
        setLoading(false);
        return;
      }

      console.log('🔍 Vérification du paiement:', sessionId);

      // Optionnel : Vérifier le paiement côté serveur
      // const response = await paymentAPI.verifyStripeSession(sessionId);
      
      // Pour l'instant, on considère que si on arrive ici, c'est OK
      setPaymentInfo({
        sessionId,
        success: true
      });

      toast.success('Paiement effectué avec succès !');
      
    } catch (err) {
      console.error('❌ Erreur vérification:', err);
      setError('Erreur lors de la vérification du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Vérification du paiement...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/sols')}
              startIcon={<Home />}
            >
              Retour aux Sols
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
      <Card elevation={3}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {/* Icône de succès */}
          <CheckCircle 
            sx={{ 
              fontSize: 80, 
              color: 'success.main',
              mb: 2
            }} 
          />

          {/* Message principal */}
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
            Paiement Réussi !
          </Typography>

          <Typography variant="body1" color="textSecondary" paragraph sx={{ mt: 2, mb: 4 }}>
            Votre paiement a été effectué avec succès. Un reçu vous sera envoyé par email
            une fois que l'administrateur aura validé votre paiement.
          </Typography>

          {/* Informations */}
          <Box sx={{ 
            bgcolor: 'grey.50', 
            p: 3, 
            borderRadius: 2,
            mb: 4,
            textAlign: 'left'
          }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Informations de transaction
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
              Session ID: {paymentInfo?.sessionId?.slice(0, 20)}...
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Date: {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/sols')}
              startIcon={<Home />}
            >
              Retour aux Sols
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/payments')}
              startIcon={<Receipt />}
            >
              Voir mes paiements
            </Button>
          </Box>

          {/* Note */}
          <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Prochaines étapes :</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>L'administrateur va vérifier votre paiement</li>
              <li>Vous recevrez un email de confirmation</li>
              <li>Le reçu officiel sera disponible dans votre historique</li>
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentSuccessPage;