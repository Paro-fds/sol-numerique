import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import {
  Dashboard,
  AccountBalanceWallet,
  Payment,
  People,
  AdminPanelSettings,
  Receipt,
  TrendingUp,
  Settings,
  Help
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 250;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Configuration des éléments de navigation
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      description: 'Vue d\'ensemble'
    },
    {
      text: 'Mes Sols',
      icon: <AccountBalanceWallet />,
      path: '/sols',
      description: 'Gestion des sols'
    },
    {
      text: 'Paiements',
      icon: <Payment />,
      path: '/payments',
      description: 'Historique et paiements'
    },
    {
      text: 'Participants',
      icon: <People />,
      path: '/participants',
      description: 'Gérer les participants'
    },
  ];

  // Éléments de navigation pour les administrateurs
  const adminItems = [
    {
      text: 'Administration',
      icon: <AdminPanelSettings />,
      path: '/admin',
      description: 'Panel administrateur',
      isNew: true
    },
    {
      text: 'Validation Reçus',
      icon: <Receipt />,
      path: '/admin/receipts',
      description: 'Valider les reçus'
    },
    {
      text: 'Rapports',
      icon: <TrendingUp />,
      path: '/admin/reports',
      description: 'Statistiques et rapports'
    },
  ];

  // Éléments utilitaires
  const utilityItems = [
    {
      text: 'Paramètres',
      icon: <Settings />,
      path: '/settings',
      description: 'Configuration'
    },
    {
      text: 'Aide',
      icon: <Help />,
      path: '/help',
      description: 'Centre d\'aide'
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const NavigationSection = ({ title, items, showDivider = true }) => (
    <>
      {title && (
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.08em'
          }}
        >
          {title}
        </Typography>
      )}
      
      <List sx={{ py: 0 }}>
        {items.map((item) => {
          const isActive = isActiveRoute(item.path);
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  minHeight: 44,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'primary.dark'
                      : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                    minWidth: 40,
                  },
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.875rem'
                        }}
                      >
                        {item.text}
                      </Typography>
                      {item.isNew && (
                        <Chip
                          label="Nouveau"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: 'error.main',
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    !isActive && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          lineHeight: 1.2
                        }}
                      >
                        {item.description}
                      </Typography>
                    )
                  }
                  sx={{
                    '& .MuiListItemText-secondary': {
                      marginTop: '2px'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {showDivider && <Divider sx={{ mx: 2, my: 1 }} />}
    </>
  );

    return (
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        <Box sx={{ width: DRAWER_WIDTH, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" noWrap>
              Sol Numérique
            </Typography>
          </Box>
  
          <Divider />
  
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <NavigationSection items={navigationItems} />
            {isAdmin && <NavigationSection title="Administration" items={adminItems} />}
            <NavigationSection title="Utilitaires" items={utilityItems} showDivider={false} />
          </Box>
        </Box>
      </Drawer>
    );
  };
  
  export default Sidebar;