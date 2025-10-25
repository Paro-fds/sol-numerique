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
  
  // ✅ NOUVEAU - Liste des sols disponibles à rejoindre
  getAvailableSols: () => api.get('/api/sols/available'),
  
  // ✅ NOUVEAU - Mes sols
  getMySols: () => api.get('/api/sols/my-sols'),
  
  // Détails d'un sol
  getSol: (solId) => api.get(`/api/sols/${solId}`),
  
  // ✅ NOUVEAU - Détails complets d'un sol (avec participants)
  getSolDetails: (solId) => api.get(`/api/sols/${solId}/details`),
  
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
  createStripeSession: (data) => {
    return api.post('/api/payments/create-stripe-session', data);
  },

  // Upload un reçu
  uploadReceipt: (participationId, file) => {
    const formData = new FormData();
    formData.append('participationId', participationId);
    formData.append('receipt', file);
    
    return api.post('/api/payments/upload-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Obtenir l'historique des paiements
  getPaymentHistory: (params) => {
    return api.get('/api/payments/history', { params });
  },

  // Obtenir un paiement
  getPayment: (paymentId) => {
    return api.get(`/api/payments/${paymentId}`);
  },

  // Valider un paiement (admin)
  validatePayment: (paymentId, data) => {
    return api.post(`/api/payments/${paymentId}/validate`, data);
  },

  // Rejeter un paiement (admin)
  rejectPayment: (paymentId, data) => {
    return api.post(`/api/payments/${paymentId}/reject`, data);
  },

  // Obtenir les reçus en attente (admin)
  getPendingReceipts: () => {
    return api.get('/api/payments/pending-receipts');
  },

  // Obtenir l'URL d'un reçu
  getReceiptUrl: (paymentId) => {
    return api.get(`/api/payments/${paymentId}/receipt-url`);
  },

  // Télécharger un reçu
  downloadReceipt: (paymentId) => {
    return api.get(`/api/payments/${paymentId}/download`, {
      responseType: 'blob'
    });
  },

  // Marquer comme transféré (admin)
  markAsTransferred: (paymentId, data) => {
    return api.post(`/api/payments/${paymentId}/transfer`, data);
  },

  // Obtenir les transferts en attente (admin)
  getPendingTransfers: () => {
    return api.get('/api/payments/pending-transfers');
  },

  // Transférer tous les paiements d'un Sol (admin)
  transferAllPayments: (solId, data) => {
    return api.post(`/api/sols/${solId}/transfer-all`, data);
  }
};
 



// === SERVICE D'ADMINISTRATION ===
export const adminAPI = {
  // === REÇUS ===
  // Reçus en attente
  getPendingReceipts: () => api.get('/api/admin/receipts/pending'),
  
  // Valider/rejeter un reçu
  validateReceipt: (paymentId, status, notes = '') => 
    api.post(`/api/admin/receipts/${paymentId}/validate`, { status, notes }),
  
  // === VIREMENTS ===
  // Virements à effectuer
  getTransferRequests: () => api.get('/api/admin/transfers/pending'),
  
  // Marquer un virement comme effectué
  markTransferCompleted: (paymentId, notes = '') => 
    api.post(`/api/admin/transfers/${paymentId}/complete`, { notes }),
  
  // === GESTION DES UTILISATEURS ===
  // Liste des utilisateurs
  getUsers: (filters = {}) => api.get('/api/admin/users', { params: filters }),
  
  // ✅ NOUVEAU - Détails d'un utilisateur
  getUserById: (userId) => api.get(`/api/admin/users/${userId}`),
  
  // ✅ NOUVEAU - Créer un utilisateur
  createUser: (userData) => api.post('/api/admin/users', userData),
  
  // ✅ NOUVEAU - Mettre à jour un utilisateur
  updateUser: (userId, userData) => api.put(`/api/admin/users/${userId}`, userData),
  
  // Changer le statut d'un utilisateur
  updateUserStatus: (userId, status) => 
    api.patch(`/api/admin/users/${userId}/status`, { status }),
  
  // ✅ NOUVEAU - Supprimer un utilisateur
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
  
  // ✅ NOUVEAU - Statistiques utilisateurs
  getUsersStats: () => api.get('/api/admin/users/stats'),
  
  // === RAPPORTS ===
  // Rapports et statistiques
  getReports: (filters = {}) => api.get('/api/admin/reports', { params: filters }),
  exportReport: (format, filters = {}) => 
    api.get(`/api/admin/reports/export/${format}`, { 
      params: filters,
      responseType: 'blob'
    }),
  
  // Dashboard admin
  getDashboardStats: () => api.get('/api/admin/dashboard'),
  
  // ✅ NOUVEAU - Générer et envoyer un reçu PDF par email
  generateAndSendReceipt: (paymentId) => 
    api.post('/api/admin/receipts/generate-receipt', { paymentId }),
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

// === SERVICE PDF ===
export const pdfAPI = {
  // Générer un reçu PDF
  generateReceipt: (paymentData) => 
    api.post('/api/pdf/generate-receipt', paymentData, {
      responseType: 'blob'
    }),
  
  // Générer un rapport mensuel PDF
  generateMonthlyReport: (reportData) => 
    api.post('/api/pdf/generate-report', reportData, {
      responseType: 'blob'
    }),
  
  // Télécharger un reçu existant
  downloadReceipt: (receiptId) => 
    api.get(`/api/pdf/receipts/${receiptId}`, {
      responseType: 'blob'
    }),
};

// === SERVICE DE SANTÉ DE L'API ===
export const healthAPI = {
  checkHealth: () => api.get('/health'),
  checkDatabase: () => api.get('/health/db'),
};
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
    // ✅ NOUVEAU : Ignorer silencieusement les 403 sur pending-transfers
    if (
      error.response?.status === 403 &&
      error.config?.url?.includes('/pending-transfers')
    ) {
      console.log('👤 Access denied to pending-transfers (not admin) - returning empty data');
      return Promise.resolve({ 
        data: { 
          success: true,
          count: 0, 
          transfers: [] 
        } 
      });
    }

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
          // ✅ Ne pas afficher toast pour pending-transfers
          if (!error.config?.url?.includes('/pending-transfers')) {
            toast.error('Accès interdit');
          }
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
          const message = data?.error || data?.message || 'Une erreur est survenue';
          toast.error(message);
      }
    } else if (error.request) {
      toast.error('Erreur de connexion. Vérifiez votre connexion internet.');
    } else {
      toast.error('Une erreur inattendue est survenue');
    }
    
    return Promise.reject(error);
  });


// Export par défaut de l'instance axios configurée
export default api;