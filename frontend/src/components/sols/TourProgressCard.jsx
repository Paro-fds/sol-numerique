import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  EmojiEvents,
  Refresh
} from '@mui/icons-material';
import api from '../../services/api';

const TourProgressCard = ({ solId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadTourStatus();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadTourStatus, 30000);
    return () => clearInterval(interval);
  }, [solId]);

  const loadTourStatus = async () => {
    try {
      const response = await api.get(`/api/sols/${solId}/tour-status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Erreur chargement statut tour:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTour = async () => {
    try {
      setChecking(true);
      const response = await api.post(`/api/sols/${solId}/check-tour`);
      
      if (response.data.tourComplete) {
        await loadTourStatus();
      }
    } catch (error) {
      console.error('Erreur vérification tour:', error);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Progression du Tour {status.tourActuel}/{status.totalTours}
          </Typography>
          <Button
            startIcon={<Refresh />}
            onClick={handleCheckTour}
            disabled={checking}
            size="small"
          >
            {checking ? <CircularProgress size={20} /> : 'Vérifier'}
          </Button>
        </Box>

        {/* Bénéficiaire actuel */}
        {status.beneficiary && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <EmojiEvents />
              </Avatar>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Bénéficiaire du tour
                </Typography>
                <Typography variant="h6">
                  {status.beneficiary.firstname} {status.beneficiary.lastname}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Progression */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Paiements validés
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {status.validatedPayments}/{status.totalParticipants}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={status.progress}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            {status.progress}% complété
          </Typography>
        </Box>

        {/* Statut */}
        {status.isComplete ? (
          <Alert severity="success" icon={<CheckCircle />}>
            Tour terminé ! {status.remaining === 0 && 'Tous les paiements sont validés.'}
          </Alert>
        ) : (
          <Alert severity="info" icon={<HourglassEmpty />}>
            En attente de {status.remaining} paiement(s)
          </Alert>
        )}

        {/* Paiements en attente */}
        {status.pendingPayments && status.pendingPayments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Paiements en attente :
            </Typography>
            <List dense>
              {status.pendingPayments.map((payment, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {payment.firstname[0]}{payment.lastname[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${payment.firstname} ${payment.lastname}`}
                    secondary={
                      <Chip
                        label={payment.status}
                        size="small"
                        color={payment.status === 'uploaded' ? 'warning' : 'default'}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TourProgressCard;