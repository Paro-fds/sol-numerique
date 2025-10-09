import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Card, CardContent, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
            Connexion
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" paragraph>
            Connectez-vous à votre compte Sol Numérique
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Mot de passe" name="password" type="password" value={formData.password} onChange={handleChange} required sx={{ mb: 3 }} />
            <Button fullWidth variant="contained" type="submit" disabled={loading} size="large">
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Pas encore de compte ? <Link to="/register" style={{ color: '#1976d2', textDecoration: 'none' }}>S'inscrire</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default LoginPage;