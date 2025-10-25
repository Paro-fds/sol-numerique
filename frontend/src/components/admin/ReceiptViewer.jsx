import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Close, Download, ZoomIn, ZoomOut } from '@mui/icons-material';
import { paymentAPI } from '../../services/api';

const ReceiptViewer = ({ paymentId, open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [zoom, setZoom] = useState(100);

  const loadReceiptUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📥 Loading receipt for payment:', paymentId);

      // ✅ Appeler l'API pour obtenir l'URL
      const response = await paymentAPI.getReceiptUrl(paymentId);

      console.log('✅ Receipt URL received:', response.data);

      // ✅ IMPORTANT : Utiliser l'URL retournée par l'API
      setReceiptUrl(response.data.url);
      
    } catch (err) {
      console.error('❌ Error loading receipt:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement du reçu');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (open && paymentId) {
      loadReceiptUrl();
    }
  }, [open, paymentId, loadReceiptUrl]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 50));

  const handleDownload = () => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>📄 Visualiser le Reçu</span>
          <Box>
            <IconButton onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut />
            </IconButton>
            <span style={{ margin: '0 10px' }}>{zoom}%</span>
            <IconButton onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn />
            </IconButton>
            <IconButton onClick={handleDownload} disabled={!receiptUrl}>
              <Download />
            </IconButton>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
            <Button onClick={loadReceiptUrl} sx={{ ml: 2 }}>
              Réessayer
            </Button>
          </Alert>
        )}

        {receiptUrl && !loading && (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
              overflow: 'auto',
              bgcolor: '#f5f5f5',
              p: 2
            }}
          >
            {/* ✅ Utiliser directement l'URL (S3 ou locale) */}
            <img 
              src={receiptUrl}
              alt="Reçu de paiement"
              style={{
                maxWidth: '100%',
                height: 'auto',
                transform: `scale(${zoom / 100})`,
                transition: 'transform 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onError={(e) => {
                console.error('❌ Image load error:', e);
                console.error('Failed URL:', receiptUrl);
                setError('Impossible de charger l\'image. Vérifiez que le fichier existe.');
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully from:', receiptUrl);
              }}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;