import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  DragIndicator,
  Shuffle as ShuffleIcon,
  Save as SaveIcon,
  ArrowUpward,
  ArrowDownward,
  Person as PersonIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../../services/api';

const ParticipantsOrderManager = ({ solId, solStatut, isCreator }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [solId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/sols/${solId}/participants`);
      setParticipants(response.data.participants);
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur chargement participants:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(participants);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Réassigner les ordres
    const updatedItems = items.map((item, index) => ({
      ...item,
      ordre: index + 1
    }));

    setParticipants(updatedItems);
    setHasChanges(true);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const items = [...participants];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    const updatedItems = items.map((item, idx) => ({ ...item, ordre: idx + 1 }));
    setParticipants(updatedItems);
    setHasChanges(true);
  };

  const moveDown = (index) => {
    if (index === participants.length - 1) return;
    const items = [...participants];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    const updatedItems = items.map((item, idx) => ({ ...item, ordre: idx + 1 }));
    setParticipants(updatedItems);
    setHasChanges(true);
  };

  const handleSaveOrder = async () => {
    try {
      setSaving(true);
      
      const order = participants.map(p => ({
        participation_id: p.participation_id,
        ordre: p.ordre
      }));

      await api.put(`/api/sols/${solId}/order`, { order });

      setSnackbar({
        open: true,
        message: 'Ordre sauvegardé avec succès',
        severity: 'success'
      });
      setHasChanges(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erreur lors de la sauvegarde',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRandomize = async () => {
    try {
      setSaving(true);
      await api.post(`/api/sols/${solId}/randomize-order`);
      await loadParticipants();
      setSnackbar({
        open: true,
        message: 'Ordre randomisé avec succès',
        severity: 'success'
      });
      setOpenConfirm(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erreur lors de la randomisation',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isCreator) {
    return (
      <Alert severity="info">
        Seul le créateur du Sol peut gérer l'ordre des participants
      </Alert>
    );
  }

  if (solStatut === 'active') {
    return (
      <Alert severity="warning">
        L'ordre ne peut plus être modifié car le Sol est déjà actif
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Ordre des Bénéficiaires
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<ShuffleIcon />}
                onClick={() => setOpenConfirm(true)}
                variant="outlined"
                disabled={saving}
              >
                Aléatoire
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveOrder}
                variant="contained"
                disabled={!hasChanges || saving}
              >
                {saving ? <CircularProgress size={20} /> : 'Sauvegarder'}
              </Button>
            </Box>
          </Box>

          {hasChanges && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Vous avez des modifications non sauvegardées
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            🎯 Glissez-déposez pour réorganiser l'ordre des tours
          </Alert>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="participants">
              {(provided) => (
                <List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {participants.map((participant, index) => (
                    <Draggable
                      key={participant.participation_id}
                      draggableId={String(participant.participation_id)}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            mb: 1,
                            bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Box {...provided.dragHandleProps} sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                            <DragIndicator color="action" />
                          </Box>

                          <Chip
                            label={`#${participant.ordre}`}
                            color="primary"
                            size="small"
                            sx={{ mr: 2, fontWeight: 600 }}
                          />

                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {participant.firstname[0]}{participant.lastname[0]}
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={`${participant.firstname} ${participant.lastname}`}
                            secondary={
                              <>
                                {participant.email}
                                {participant.payments_count > 0 && (
                                  <Chip
                                    label={`${participant.payments_count} paiements`}
                                    size="small"
                                    color="success"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </>
                            }
                          />

                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                            >
                              <ArrowUpward />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => moveDown(index)}
                              disabled={index === participants.length - 1}
                            >
                              <ArrowDownward />
                            </IconButton>
                          </Box>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>

          {participants.length === 0 && (
            <Alert severity="info">
              Aucun participant pour le moment
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog Confirmation Randomize */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Randomiser l'ordre ?</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir attribuer un ordre aléatoire aux participants ?
            Cette action remplacera l'ordre actuel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Annuler</Button>
          <Button onClick={handleRandomize} variant="contained" color="warning" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Randomiser'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParticipantsOrderManager;