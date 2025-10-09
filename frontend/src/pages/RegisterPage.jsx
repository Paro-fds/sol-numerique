import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Card, CardContent, Alert, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstname: '', lastname: '', email: '', password: '', confirmPassword: '', phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erreur lors de l\'inscription');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
            Inscription
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" paragraph>
            Créez votre compte Sol Numérique
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Prénom" name="firstname" value={formData.firstname} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Nom" name="lastname" value={formData.lastname} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Mot de passe" name="password" type="password" value={formData.password} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Confirmer le mot de passe" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
              </Grid>
            </Grid>

            <Button fullWidth variant="contained" type="submit" disabled={loading} size="large" sx={{ mt: 3 }}>
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Déjà un compte ? <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>Se connecter</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default RegisterPage;