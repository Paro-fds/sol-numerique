// frontend/src/pages/PaymentsHistoryPage.jsx
// EXEMPLE D'INTÉGRATION DU BOUTON EXPORT

import React, { useState, useEffect } from 'react';
import ExportModal from '../components/ExportModal';
import api from '../services/api';
import './PaymentsHistoryPage.css';

const PaymentsHistoryPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/payments/history');
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payments-history-page">
      <div className="page-header">
        <div>
          <h1>💳 Historique des Paiements</h1>
          <p className="subtitle">
            {payments.length} paiement{payments.length > 1 ? 's' : ''} enregistré{payments.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* ⭐ BOUTON D'EXPORT */}
        <button
          className="btn-export"
          onClick={() => setShowExportModal(true)}
          disabled={payments.length === 0}
        >
          <span>📊</span>
          Exporter
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3>Aucun paiement</h3>
          <p>Vous n'avez pas encore effectué de paiement</p>
        </div>
      ) : (
        <div className="payments-list">
          {payments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <span className="payment-id">#{payment.id}</span>
                <span className={`status-badge status-${payment.status}`}>
                  {getStatusLabel(payment.status)}
                </span>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <span className="label">Sol:</span>
                  <span className="value">{payment.sol_name}</span>
                </div>

                <div className="detail-row">
                  <span className="label">Montant:</span>
                  <span className="value amount">
                    {parseFloat(payment.amount).toFixed(2)} HTG
                  </span>
                </div>

                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="label">Méthode:</span>
                  <span className="value">
                    {payment.method === 'stripe' ? '💳 Stripe' : '🏦 Virement'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ⭐ MODAL D'EXPORT */}
      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        type="payments"
      />
    </div>
  );
};

const getStatusLabel = (status) => {
  const labels = {
    'pending': 'En attente',
    'uploaded': 'Reçu uploadé',
    'validated': 'Validé',
    'completed': 'Complété',
    'rejected': 'Rejeté'
  };
  return labels[status] || status;
};

export default PaymentsHistoryPage;