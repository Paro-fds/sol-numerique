import axios from 'axios';
import toast from 'react-hot-toast';

// Configuration de base d'Axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Pour les cookies de session
});

// Gestion du token d'authentification
let authToken = localStorage.getItem('authToken');

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    // Log des requêtes en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔗 ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    // Log des réponses en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Gestion des erreurs par code de statut
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expiré ou invalide
          removeAuthToken();
          if (window.location.pathname !== '/login') {
            toast.error('Session expirée. Veuillez vous reconnecter.');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          toast.error('Accès interdit');
          break;
          
        case 404:
          toast.error('Ressource non trouvée');
          break;
          
        case 429:
          toast.error('Trop de requêtes. Veuillez patienter.');
          break;
          
        case 500:
          toast.error('Erreur serveur. Veuillez réessayer plus tard.');
          break;
          
        default:
          // Afficher le message d'erreur du serveur s'il existe
          const message = data?.error || data?.message || 'Une erreur est survenue';
          toast.error(message);
      }
    } else if (error.request) {
      // Erreur réseau
      toast.error('Erreur de connexion. Vérifiez votre connexion internet.');
    } else {
      // Autre erreur
      toast.error('Une erreur inattendue est survenue');
    }
    
    return Promise.reject(error);
  }
);

// Fonctions utilitaires pour la gestion du token
export const setAuthToken = (token) => {
  if (token) {
    authToken = token;
    localStorage.setItem('authToken', token);
  } else {
    removeAuthToken();
  }
};

export const getAuthToken = () => {
  return authToken || localStorage.getItem('authToken');
};

export const removeAuthToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
  // Également supprimer les autres données utilisateur
  localStorage.removeItem('user');
};

// Services API organisés par domaine

// === SERVICE D'AUTHENTIFICATION ===
export const authAPI = {
  // Inscription
  register: (userData) => api.post('/api/auth/register', userData),
  
  // Connexion
  login: (credentials) => api.post('/api/auth/login', credentials),
  
  // Déconnexion
  logout: () => api.post('/api/auth/logout'),
  
  // Profil utilisateur
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
  
  // Changement de mot de passe
  changePassword: (data) => api.put('/api/auth/change-password', data),
  
  // Vérification du token
  verifyToken: () => api.get('/api/auth/verify'),
  
  // MFA (Multi-Factor Authentication)
  setupMFA: () => api.post('/api/auth/mfa/setup'),
  verifyMFA: (token) => api.post('/api/auth/mfa/verify', { token }),
  disableMFA: (password) => api.post('/api/auth/mfa/disable', { password }),
};

// === SERVICE DES SOLS ===
export const solAPI = {
  // Liste des sols
  getSols: (filters = {}) => api.get('/api/sols', { params: filters }),
  
  // Détails d'un sol
  getSol: (solId) => api.get(`/api/sols/${solId}`),
  
  // Créer un sol
  createSol: (solData) => api.post('/api/sols', solData),
  
  // Mettre à jour un sol
  updateSol: (solId, data) => api.put(`/api/sols/${solId}`, data),
  
  // Supprimer un sol
  deleteSol: (solId) => api.delete(`/api/sols/${solId}`),
  
  // Rejoindre un sol
  joinSol: (solId) => api.post(`/api/sols/${solId}/join`),
  
  // Quitter un sol
  leaveSol: (solId) => api.post(`/api/sols/${solId}/leave`),
  
  // Obtenir les participants
  getParticipants: (solId) => api.get(`/api/sols/${solId}/participants`),
  
  // Statistiques du sol
  getStatistics: (solId) => api.get(`/api/sols/${solId}/statistics`),
};

// === SERVICE DES PAIEMENTS ===
export const paymentAPI = {
  // Créer une session Stripe
  createStripeSession: (participationId, amount) => 
    api.post('/api/payments/stripe/create-session', { participationId, amount }),
  
  // Upload d'un reçu
  uploadReceipt: (participationId, file) => {
    const formData = new FormData();
    formData.append('participationId', participationId);
    formData.append('receipt', file);
    
    return api.post('/api/payments/upload-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Historique des paiements
  getPaymentHistory: () => api.get('/api/payments/history'),
  
  // Détails d'un paiement
  getPayment: (paymentId) => api.get(`/api/payments/${paymentId}`),
  
  // Télécharger un reçu
  downloadReceipt: (paymentId) => api.get(`/api/payments/${paymentId}/receipt`, {
    responseType: 'blob'
  }),
  
  // Annuler un paiement
  cancelPayment: (paymentId) => api.post(`/api/payments/${paymentId}/cancel`),
};

// === SERVICE D'ADMINISTRATION ===
export const adminAPI = {
  // Reçus en attente
  getPendingReceipts: () => api.get('/api/admin/receipts/pending'),
  
  // Valider/rejeter un reçu
  validateReceipt: (paymentId, status, notes = '') => 
    api.post(`/api/admin/receipts/${paymentId}/validate`, { status, notes }),
  
  // Virements à effectuer
  getTransferRequests: () => api.get('/api/admin/transfers/pending'),
  
  // Marquer un virement comme effectué
  markTransferCompleted: (paymentId, notes = '') => 
    api.post(`/api/admin/transfers/${paymentId}/complete`, { notes }),
  
  // Gestion des utilisateurs
  getUsers: (filters = {}) => api.get('/api/admin/users', { params: filters }),
  updateUserStatus: (userId, status) => 
    api.put(`/api/admin/users/${userId}/status`, { status }),
  
  // Rapports et statistiques
  getReports: (filters = {}) => api.get('/api/admin/reports', { params: filters }),
  exportReport: (format, filters = {}) => 
    api.get(`/api/admin/reports/export/${format}`, { 
      params: filters,
      responseType: 'blob'
    }),
  
  // Dashboard admin
  getDashboardStats: () => api.get('/api/admin/dashboard'),
};

// === SERVICE DES FICHIERS ===
export const fileAPI = {
  // Upload générique
  uploadFile: (file, path = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    return api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Supprimer un fichier
  deleteFile: (fileId) => api.delete(`/api/files/${fileId}`),
  
  // URL pour accéder aux fichiers
  getFileUrl: (filename) => `${API_BASE_URL}/uploads/${filename}`,
};

// === SERVICE DE SANTÉ DE L'API ===
export const healthAPI = {
  checkHealth: () => api.get('/health'),
  checkDatabase: () => api.get('/health/db'),
};

// Export par défaut de l'instance axios configurée
export default api;