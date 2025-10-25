import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Badge,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  AccountCircle,
  Notifications,
  Settings,
  ExitToApp,
  Person,
  Security
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);

  // Menu utilisateur
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Menu notifications
  const handleNotificationOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  // Actions du menu
  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleAdminClick = () => {
    handleMenuClose();
    navigate('/admin');
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  // Formatage du nom d'affichage
  const displayName = user ? `${user.firstname} ${user.lastname}` : 'Utilisateur';
  const initials = user ? `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo et titre */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Sol Numérique
          </Typography>
        </Box>

        {/* Actions de droite */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationOpen}
            aria-label="notifications"
          >
            <Badge badgeContent={0} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Menu utilisateur */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {user?.role === 'admin' ? 'Administrateur' : 'Membre'}
              </Typography>
            </Box>
            
            <IconButton
              onClick={handleMenuOpen}
              aria-label="account menu"
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 36,
                  height: 36,
                  fontSize: '0.875rem'
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Box>
        </Box>
      </Toolbar>

      {/* Menu déroulant utilisateur */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          '& .MuiPaper-root': {
            minWidth: 200,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }
        }}
      >
        {/* Informations utilisateur */}
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {user?.email}
          </Typography>
        </Box>

        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mon Profil</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => navigate('/settings')}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Paramètres</ListItemText>
        </MenuItem>

        {user?.mfa_enabled && (
          <MenuItem onClick={() => navigate('/security')}>
            <ListItemIcon>
              <Security fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sécurité</ListItemText>
          </MenuItem>
        )}

        {isAdmin && (
          <>
            <Divider />
            <MenuItem onClick={handleAdminClick}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>Administration</ListItemText>
            </MenuItem>
          </>
        )}

        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <ExitToApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Se déconnecter</ListItemText>
        </MenuItem>
      </Menu>

      {/* Menu notifications */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          '& .MuiPaper-root': {
            minWidth: 300,
            maxWidth: 400,
            maxHeight: 400,
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Aucune nouvelle notification
          </Typography>
        </Box>
      </Menu>
    </AppBar>
  );
};

export default Header;