import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  AttachFile,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  Receipt
} from '@mui/icons-material';
import { paymentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ReceiptUpload = ({ participationId, solName, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError('Format de fichier non accepté. Utilisez PDF, JPEG ou PNG (max 5MB)');
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      setSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    maxFileSize: 5 * 1024 * 1024, // 5MB
    multiple: false
  });

  const removeFile = () => {
    setFile(null);
    setError('');
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await paymentAPI.uploadReceipt(participationId, file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);
      
      toast.success('Reçu uploadé avec succès ! Il sera vérifié par l\'administrateur.');
      
      if (onSuccess) {
        setTimeout(() => onSuccess(response.data), 1500);
      }
    } catch (err) {
      console.error('Upload error:', err);
      const message = err.response?.data?.error || 'Erreur lors de l\'upload';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Receipt sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Upload de Reçu de Paiement
          </Typography>
        </Box>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Uploadez votre preuve de paiement (PDF, JPEG ou PNG - max 5MB)
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Reçu uploadé avec succès ! En attente de validation par l'administrateur.
          </Alert>
        )}

        {!success && (
          <>
            {/* Zone de drop */}
            <Paper
              {...getRootProps()}
              sx={{
                mt: 3,
                p: 4,
                border: 2,
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderStyle: 'dashed',
                borderRadius: 2,
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              {isDragActive ? (
                <Typography>Déposez le fichier ici...</Typography>
              ) : (
                <>
                  <Typography variant="body1" gutterBottom>
                    Glissez-déposez un fichier ici
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ou cliquez pour sélectionner
                  </Typography>
                </>
              )}
            </Paper>

            {/* Fichier sélectionné */}
            {file && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Fichier sélectionné :
                </Typography>
                <List dense>
                  <ListItem
                    divider
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon>
                      <AttachFile />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                    {!uploading && (
                      <IconButton
                        edge="end"
                        onClick={removeFile}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </ListItem>
                </List>

                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      Upload en cours... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Bouton d'upload */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!file || uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
              sx={{ mt: 3 }}
            >
              {uploading ? 'Upload en cours...' : 'Uploader le Reçu'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important :</strong> Votre reçu sera vérifié par l'administrateur avant validation.
                Assurez-vous qu'il est lisible et contient toutes les informations nécessaires.
              </Typography>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;