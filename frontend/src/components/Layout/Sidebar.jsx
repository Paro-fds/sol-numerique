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
  Chip,
  Badge
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
  Help,
  Search,
  AccountBalance
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { usePendingTransfers } from '../../hooks/usePendingTransfers';

const DRAWER_WIDTH = 250;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // ✅ Hook conditionnellement appelé
  const pendingTransfersHook = usePendingTransfers();
  const pendingTransfersCount = isAdmin ? pendingTransfersHook.count : 0;

   // ✅ DEBUG
  

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
      text: 'Parcourir les Sols',
      icon: <Search />,
      path: '/sols/join',
      description: 'Rejoindre un sol',
      isNew: true
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
      description: 'Panel administrateur'
    },
    {
      text: 'Gestion Utilisateurs',
      icon: <People />,
      path: '/admin/users',
      description: 'Gérer les utilisateurs'
    },
    {
      text: 'Validation Paiements',
      icon: <Receipt />,
      path: '/admin/payments',
      description: 'Valider les paiements',
      isNew: true
    },
    {
      text: 'Transferts',
      icon: <AccountBalance />,
      path: '/admin/transfers',
      description: 'Gérer les transferts',
      badge: pendingTransfersCount, // ✅ Utilise la valeur du hook
      isImportant: pendingTransfersCount > 0
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
                  animation: item.isImportant && !isActive ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(255, 82, 82, 0.4)' },
                    '70%': { boxShadow: '0 0 0 10px rgba(255, 82, 82, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)' }
                  },
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
                  {item.badge > 0 ? (
                    <Badge 
                      badgeContent={item.badge} 
                      color="error"
                      max={99}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
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
          {/* ✅ Section admin uniquement si isAdmin === true */}
          {isAdmin && <NavigationSection title="ADMINISTRATION" items={adminItems} />}
          <NavigationSection title="UTILITAIRES" items={utilityItems} showDivider={false} />
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;