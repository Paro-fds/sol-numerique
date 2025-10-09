import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// Import des hooks
import { useAuth } from './context/AuthContext';

// Import des composants de layout
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

// Import des pages
import { 
  HomePage, 
  LoginPage, 
  RegisterPage, 
  DashboardPage, 
  ProfilePage, 
  NotFoundPage 
} from './pages';
import SolsPage from './pages/SolsPage';
import CreateSolPage from './pages/CreateSolPage';
import SolDetailsPage from './pages/SolDetailsPage';
import PaymentsPage from './pages/PaymentsPage';
import PaymentForm from './components/Payment/PaymentForm';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminReceiptsPage from './pages/AdminReceiptsPage';

// Import des composants utilitaires
import ProtectedRoute from './components/Common/ProtectedRoute';

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Affichage du loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Chargement de Sol Numérique...
        </Typography>
      </Box>
    );
  }

  // Rendu pour les utilisateurs non authentifiés
  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    );
  }

  // Rendu pour les utilisateurs authentifiés
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar de navigation */}
      <Sidebar />
      
      {/* Contenu principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Header />
        
        {/* Zone de contenu */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            {/* Page d'accueil après connexion */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Profil utilisateur */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            
            {/* Routes des sols */}
           // Routes des sols
<Route
  path="/sols"
  element={
    <ProtectedRoute>
      <SolsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/sols/create"
  element={
    <ProtectedRoute>
      <CreateSolPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/sols/:id"
  element={
    <ProtectedRoute>
      <SolDetailsPage />
    </ProtectedRoute>
  }
/>
            
            {/* Routes des paiements */}
           // Routes des paiements
<Route
  path="/payments"
  element={
    <ProtectedRoute>
      <PaymentsPage />
    </ProtectedRoute>
  }
/>
            
            {/* Routes d'administration */}
            // Routes d'administration
<Route
  path="/admin"
  element={
    <ProtectedRoute requireAdmin>
      <AdminDashboardPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/receipts"
  element={
    <ProtectedRoute requireAdmin>
      <AdminReceiptsPage />
    </ProtectedRoute>
  }
/>
            
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h5" gutterBottom>
                      Gestion des Utilisateurs
                    </Typography>
                    <Typography color="textSecondary">
                      Fonctionnalité en cours de développement
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/receipts"
              element={
                <ProtectedRoute requireAdmin>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h5" gutterBottom>
                      Validation des Reçus
                    </Typography>
                    <Typography color="textSecondary">
                      Fonctionnalité en cours de développement
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            
            {/* Paramètres et autres */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h5" gutterBottom>
                      Paramètres
                    </Typography>
                    <Typography color="textSecondary">
                      Fonctionnalité en cours de développement
                    </Typography>
                  </Box>
                </ProtectedRoute>
              }
            />
            
            {/* Page 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;