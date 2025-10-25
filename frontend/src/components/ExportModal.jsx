// frontend/src/components/ExportModal.jsx
import React, { useState } from 'react';
import api from '../services/api';
import './Exportmodal.css';

const ExportModal = ({ show, onClose, type = 'payments', solId = null }) => {
  const [format, setFormat] = useState('csv');
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleExport = async () => {
    try {
      setLoading(true);

      let url = '';
      let filename = '';

      // Construire l'URL selon le type
      if (type === 'payments') {
        url = `/api/export/payments/${format}`;
        filename = `paiements_${new Date().toISOString().split('T')[0]}.${format}`;

        // Ajouter les filtres
        const params = new URLSearchParams();
        if (filters.status !== 'all') params.append('status', filters.status);
        if (filters.method !== 'all') params.append('method', filters.method);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (solId) params.append('solId', solId);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

      } else if (type === 'participants') {
        url = `/api/export/sols/${solId}/participants/csv`;
        filename = `participants_sol_${solId}_${new Date().toISOString().split('T')[0]}.csv`;

      } else if (type === 'monthly-report') {
        if (!filters.month) {
          alert('Veuillez sélectionner un mois');
          setLoading(false);
          return;
        }
        url = `/api/export/sols/${solId}/monthly-report?month=${filters.month}`;
        filename = `rapport_mensuel_${filters.month}.pdf`;
      }

      // Faire la requête
      const response = await api.get(url, {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      // Fermer le modal
      setTimeout(() => {
        onClose();
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'payments':
        return '📊 Exporter l\'historique des paiements';
      case 'participants':
        return '👥 Exporter les participants';
      case 'monthly-report':
        return '📄 Générer un rapport mensuel';
      default:
        return 'Export';
    }
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>{getTitle()}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="export-modal-body">
          {/* Format selection */}
          {type !== 'participants' && (
            <div className="form-group">
              <label>Format d'export :</label>
              <div className="format-options">
                <button
                  className={`format-btn ${format === 'csv' ? 'active' : ''}`}
                  onClick={() => setFormat('csv')}
                  disabled={type === 'monthly-report'}
                >
                  <span className="format-icon">📊</span>
                  <span>CSV</span>
                  <small>Excel, Google Sheets</small>
                </button>
                <button
                  className={`format-btn ${format === 'pdf' ? 'active' : ''}`}
                  onClick={() => setFormat('pdf')}
                >
                  <span className="format-icon">📄</span>
                  <span>PDF</span>
                  <small>Document imprimable</small>
                </button>
              </div>
            </div>
          )}

          {/* Filters for payments */}
          {type === 'payments' && (
            <>
              <div className="form-group">
                <label>Statut :</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="uploaded">Reçu uploadé</option>
                  <option value="validated">Validés</option>
                  <option value="completed">Complétés</option>
                  <option value="rejected">Rejetés</option>
                </select>
              </div>

              <div className="form-group">
                <label>Méthode de paiement :</label>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                >
                  <option value="all">Toutes les méthodes</option>
                  <option value="stripe">Stripe (en ligne)</option>
                  <option value="offline">Virement bancaire</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date de début :</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date de fin :</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Month selection for monthly report */}
          {type === 'monthly-report' && (
            <div className="form-group">
              <label>Mois :</label>
              <input
                type="month"
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                max={new Date().toISOString().slice(0, 7)}
              />
              <small className="help-text">
                Sélectionnez le mois pour lequel générer le rapport
              </small>
            </div>
          )}

          {/* Info box */}
          <div className="info-box">
            <p>
              {type === 'payments' && format === 'csv' && (
                <>
                  📊 Le fichier CSV contiendra : Date, Membre, Email, Sol, Montant, Méthode, Statut, etc.
                </>
              )}
              {type === 'payments' && format === 'pdf' && (
                <>
                  📄 Le rapport PDF contiendra un résumé statistique et la liste détaillée des paiements.
                </>
              )}
              {type === 'participants' && (
                <>
                  👥 Le fichier CSV contiendra : Tour, Membre, Email, Téléphone, Statut, Nb paiements, Total payé.
                </>
              )}
              {type === 'monthly-report' && (
                <>
                  📄 Le rapport mensuel contiendra les statistiques et tous les paiements du mois sélectionné.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="export-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Génération...
              </>
            ) : (
              <>
                {format === 'csv' ? '📊' : '📄'} Exporter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;