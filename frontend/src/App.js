import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Layout
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

// Pages publiques
import { 
  HomePage, 
  LoginPage, 
  RegisterPage, 
  NotFoundPage 
} from './pages';

// Pages authentifiées
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SolsPage from './pages/SolsPage';
import CreateSolPage from './pages/CreateSolPage';
import SolDetailsPage from './pages/SolDetailsPage';
import PaymentsHistoryPage from './pages/PaymentsHistoryPage';
import JoinSolPage from './pages/JoinSolPage';
//import TransfersPage from './pages/TransfersPage';  // ⭐ AJOUTER
import SettingsPage from './pages/SettingsPage';        // ✅ NOUVEAU
import HelpPage from './pages/HelpPage';                // ✅ NOUVEAU
import AdminPaymentsPage from './pages/AdminPaymentsPage';

// Pages de paiement (publiques)
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';

// Pages admin
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminReceiptsPage from './pages/AdminReceiptsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import TransfersPage from './pages/admin/TransfersPage';

// Utilitaires
import ProtectedRoute from './components/Common/ProtectedRoute';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Loader pendant la vérification
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      {/* ========================================
          ROUTES PUBLIQUES (sans authentification)
      ======================================== */}
      
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/transfers" element={<TransfersPage />} />  // ⭐ AJOUTER
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/help" element={<HelpPage />} />
      
      {/* ✅ ROUTES DE PAIEMENT - PUBLIQUES */}
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />
      {/* Routes admin */}

<Route path="/admin/payments" element={<AdminPaymentsPage />} />  {/* ⭐ AJOUTER */}
<Route path="/admin/receipts" element={<AdminPaymentsPage />} />  {/* Alternative */}
<Route path="/admin/transfers" element={<TransfersPage />} />
<Route path="/admin/users" element={<AdminUsersPage />} />
      
      {/* ========================================
          ROUTES AUTHENTIFIÉES
      ======================================== */}
      
      {!isAuthenticated ? (
        // Si non authentifié, rediriger tout vers login
        <Route path="*" element={<Navigate to="/login" replace />} />
      ) : (
        // Si authentifié, afficher l'interface complète avec sidebar
        <Route
          path="*"
          element={
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Header />
                <Box sx={{ flexGrow: 1, p: 3 }}>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Profil */}
                    <Route path="/profile" element={<ProfilePage />} />
                    
                    {/* Sols */}
                    <Route path="/sols" element={<SolsPage />} />
                    <Route path="/sols/create" element={<CreateSolPage />} />
                    <Route path="/sols/join" element={<JoinSolPage />} />
                    <Route path="/sols/:id" element={<SolDetailsPage />} />
                    
                    {/* Paiements */}
                    <Route path="/payments" element={<PaymentsHistoryPage />} />
                    
                    {/* Admin */}
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
                          <AdminUsersPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Box>
              </Box>
            </Box>
          }
        />
      )}
    </Routes>
  );
}

export default App;