import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';
import toast from 'react-hot-toast';

// Création du contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Charger l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getAuthToken();
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // Vérifier si le token est toujours valide
          try {
            const response = await authAPI.verifyToken();
            const userData = JSON.parse(storedUser);
            
            setUser(userData);
            setIsAuthenticated(true);
            setAuthToken(token);
          } catch (error) {
            // Token invalide, nettoyer
            console.warn('Token invalid, clearing auth data');
            removeAuthToken();
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Fonction de connexion
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      const { user: userData, token, mfaRequired } = response.data;

      if (mfaRequired) {
        // Retourner l'information MFA sans authentifier complètement
        return { success: true, mfaRequired: true };
      }

      // Connexion réussie
      setUser(userData);
      setIsAuthenticated(true);
      setAuthToken(token);
      
      // Sauvegarder dans le localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      toast.success(`Bienvenue ${userData.firstname} !`);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || 'Erreur de connexion';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de connexion avec MFA
  const loginWithMFA = async (credentials, mfaToken) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({
        ...credentials,
        mfaToken
      });
      
      const { user: userData, token } = response.data;

      setUser(userData);
      setIsAuthenticated(true);
      setAuthToken(token);
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      toast.success(`Bienvenue ${userData.firstname} !`);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('MFA Login error:', error);
      const message = error.response?.data?.error || 'Code MFA invalide';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      const { user: newUser, token } = response.data;

      setUser(newUser);
      setIsAuthenticated(true);
      setAuthToken(token);
      
      localStorage.setItem('user', JSON.stringify(newUser));
      
      toast.success(`Compte créé avec succès ! Bienvenue ${newUser.firstname} !`);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Register error:', error);
      const message = error.response?.data?.error || 'Erreur lors de la création du compte';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Nettoyer l'état local dans tous les cas
      setUser(null);
      setIsAuthenticated(false);
      removeAuthToken();
      localStorage.removeItem('user');
      
      toast.success('Déconnexion réussie');
    }
  };

  // Fonction de mise à jour du profil
  const updateProfile = async (profileData) => {
    try {
      setIsLoading(true);
      await authAPI.updateProfile(profileData);
      
      // Récupérer le profil mis à jour
      const response = await authAPI.getProfile();
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Profil mis à jour avec succès');
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update profile error:', error);
      const message = error.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de changement de mot de passe
  const changePassword = async (passwordData) => {
    try {
      setIsLoading(true);
      await authAPI.changePassword(passwordData);
      
      toast.success('Mot de passe modifié avec succès');
      
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      const message = error.response?.data?.error || 'Erreur lors du changement de mot de passe';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de rafraîchissement du profil
  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.user;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('Refresh profile error:', error);
      // En cas d'erreur, déconnecter l'utilisateur
      logout();
      return null;
    }
  };

  // Fonctions MFA
  const setupMFA = async () => {
    try {
      const response = await authAPI.setupMFA();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Setup MFA error:', error);
      const message = error.response?.data?.error || 'Erreur lors de la configuration MFA';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const verifyMFA = async (token) => {
    try {
      const response = await authAPI.verifyMFA(token);
      
      // Rafraîchir le profil utilisateur pour obtenir le statut MFA mis à jour
      await refreshProfile();
      
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      console.error('Verify MFA error:', error);
      const message = error.response?.data?.error || 'Code MFA invalide';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const disableMFA = async (password) => {
    try {
      await authAPI.disableMFA(password);
      
      // Rafraîchir le profil
      await refreshProfile();
      
      toast.success('MFA désactivé avec succès');
      return { success: true };
    } catch (error) {
      console.error('Disable MFA error:', error);
      const message = error.response?.data?.error || 'Erreur lors de la désactivation MFA';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Valeurs du contexte
  const value = {
    // État
    user,
    isLoading,
    isAuthenticated,
    
    // Actions d'authentification
    login,
    loginWithMFA,
    register,
    logout,
    
    // Actions de profil
    updateProfile,
    changePassword,
    refreshProfile,
    
    // Actions MFA
    setupMFA,
    verifyMFA,
    disableMFA,
    
    // Utilitaires
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};