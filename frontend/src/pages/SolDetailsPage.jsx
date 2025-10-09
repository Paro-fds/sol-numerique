import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, Tabs, Tab
} from '@mui/material';
import { ArrowBack, PersonAdd, Payment, TrendingUp } from '@mui/icons-material';
import { solAPI } from '../services/api';
import toast from 'react-hot-toast';

import PaymentForm from '../components/Payment/PaymentForm';
const SolDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sol, setSol] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadSolDetails();
  }, [id]);

  const loadSolDetails = async () => {
    try {
      setLoading(true);
      const response = await solAPI.getSol(id);
      setSol(response.data.sol);
      setParticipants(response.data.participants || []);
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error loading sol details:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!sol) {
    return <Alert severity="error">Sol non trouvé</Alert>;
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/sols')} sx={{ mb: 2 }}>
        Retour
      </Button>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>{sol.nom}</Typography>
      
      {sol.description && (
        <Typography variant="body1" color="textSecondary" paragraph>{sol.description}</Typography>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Montant</Typography>
              <Typography variant="h5">{sol.montant_par_periode}€</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Participants</Typography>
              <Typography variant="h5">{participants.length} / {sol.max_participants}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Participants</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ordre</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.ordre}</TableCell>
                    <TableCell>{p.firstname} {p.lastname}</TableCell>
                    <TableCell>
                      <Chip label={p.statut_tour} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SolDetailsPage;