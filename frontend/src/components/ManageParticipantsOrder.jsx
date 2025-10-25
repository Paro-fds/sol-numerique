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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  DragHandle,
  Shuffle,
  Save,
  Person,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../services/api';
import toast from 'react-hot-toast';

const ManageParticipantsOrder = ({ solId, onClose }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    fetchParticipants();
  }, [solId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/sols/${solId}/participants`);
      setParticipants(response.data.participants);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Erreur lors du chargement des participants');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(participants);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Mettre à jour les ordres
    const updatedItems = items.map((item, index) => ({
      ...item,
      ordre: index + 1
    }));

    setParticipants(updatedItems);
    setHasChanges(true);
  };

  const handleRandomize = () => {
    setConfirmDialog(true);
  };

  const confirmRandomize = async () => {
    try {
      setSaving(true);
      await api.post(`/api/sols/${solId}/randomize-order`);
      toast.success('Ordre randomisé avec succès !');
      await fetchParticipants();
      setConfirmDialog(false);
    } catch (error) {
      console.error('Error randomizing:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la randomisation');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const participantsData = participants.map(p => ({
        id: p.id,
        ordre: p.ordre
      }));

      await api.put(`/api/sols/${solId}/order`, {
        participants: participantsData
      });

      toast.success('Ordre sauvegardé avec succès !');
      setHasChanges(false);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Gérer l'ordre des bénéficiaires
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Shuffle />}
              onClick={handleRandomize}
              disabled={saving}
            >
              Randomiser
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Glissez-déposez les participants pour modifier l'ordre des bénéficiaires. 
          Le participant en position 1 recevra les paiements au premier tour.
        </Alert>

        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Vous avez des modifications non sauvegardées
          </Alert>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="participants">
            {(provided) => (
              <List
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {participants.map((participant, index) => (
                  <Draggable
                    key={participant.id}
                    draggableId={String(participant.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <ListItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          mb: 1,
                          bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          boxShadow: snapshot.isDragging ? 3 : 0,
                        }}
                      >
                        <IconButton
                          {...provided.dragHandleProps}
                          sx={{ mr: 1, cursor: 'grab' }}
                        >
                          <DragHandle />
                        </IconButton>

                        <Chip
                          label={`#${participant.ordre}`}
                          color="primary"
                          size="small"
                          sx={{ mr: 2, minWidth: 50 }}
                        />

                        <ListItemAvatar>
                          <Avatar>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>

                        <ListItemText
                          primary={`${participant.firstname} ${participant.lastname}`}
                          secondary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="caption">
                                {participant.email}
                              </Typography>
                              {participant.validated_payments > 0 && (
                                <Chip
                                  icon={<CheckCircle />}
                                  label={`${participant.validated_payments} paiements`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      {/* Dialog de confirmation pour randomiser */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirmer la randomisation</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir randomiser l'ordre des participants ? 
            Cette action mélangera aléatoirement l'ordre actuel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={confirmRandomize}
            variant="contained"
            color="primary"
            disabled={saving}
          >
            {saving ? 'Randomisation...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ManageParticipantsOrder;