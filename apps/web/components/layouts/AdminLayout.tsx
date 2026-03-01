/**
 * Admin Layout Component
 * Navigation and layout for admin pages
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Divider,
  IconButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  SmartToy as SmartToyIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

// Centralized Admin Theme
export const adminTheme = {
  colors: {
    primary: '#696cff',           // Purple-blue primary (Sneat style)
    primaryHover: '#5f61e6',      // Darker for hover states
    primaryLight: '#f0f0ff',      // Very light purple for selected items
    primaryLighter: '#e8e8ff',    // Lighter purple for hover on selected
    secondary: '#8592a3',         // Gray for secondary text and icons
    error: '#ff4c51',             // Red for delete/error actions
    success: '#56ca00',           // Green for success states
    warning: '#ffb400',           // Orange for warnings
    textDark: '#566a7f',          // Dark text for primary content
    textMedium: '#6d788d',        // Medium gray for secondary content
    textLight: '#a8b1bd',         // Light gray for tertiary content
    bgPage: '#f5f5f9',            // Page background
    bgCard: '#ffffff',            // Card/paper background
    bgRow: '#ffffff',             // White for table rows
    bgHover: '#fafafb',           // Hover state for table rows
    bgHoverLight: '#f5f5f9',      // Light hover for menu items
    bgHeader: '#f9fafb',          // Very light gray for table header
    border: '#dbdade',            // Border color
    borderLight: '#ebeef0',       // Light border
  },
  typography: {
    fontSize: {
      xs: '0.75rem',      // 12px - table headers, chips, helper text
      sm: '0.875rem',     // 14px - table content, form fields, buttons
      base: '0.9375rem',  // 15px - normal text
      lg: '1.125rem',     // 18px - dialog titles
      xl: '1.375rem',     // 22px - page titles
      '2xl': '2rem',      // 32px - dashboard stats
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    cardPadding: 3,
    contentGap: 2.5,
    borderRadius: 1.5,
    tableCellPadding: '12px 16px',  // Comfortable table cell padding
  },
};

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const menuItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { label: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { label: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
  { label: 'Members', icon: <GroupsIcon />, path: '/admin/members' },
  { label: 'Bot Scripts', icon: <SmartToyIcon />, path: '/admin/bots' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: adminTheme.colors.bgPage }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#ffffff',
          color: adminTheme.colors.textDark,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          borderBottom: `1px solid ${adminTheme.colors.border}`,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: adminTheme.colors.textDark }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                bgcolor: adminTheme.colors.primary,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: '#ffffff', fontWeight: adminTheme.typography.fontWeight.bold, fontSize: adminTheme.typography.fontSize.base }}>L</Typography>
            </Box>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: adminTheme.typography.fontWeight.bold,
                fontSize: adminTheme.typography.fontSize.base,
                color: adminTheme.colors.textDark,
              }}
            >
              Lido
            </Typography>
          </Box>
          {title && (
            <>
              <Typography sx={{ mx: 1.5, color: adminTheme.colors.textLight, display: { xs: 'none', sm: 'block' } }}>/</Typography>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: adminTheme.typography.fontWeight.normal,
                  fontSize: adminTheme.typography.fontSize.sm,
                  color: adminTheme.colors.textMedium,
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {title}
              </Typography>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: adminTheme.colors.bgCard,
            borderRight: `1px solid ${adminTheme.colors.border}`,
          },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List sx={{ px: 2 }}>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={router.pathname === item.path}
                  onClick={() => {
                    router.push(item.path);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: adminTheme.spacing.borderRadius,
                    minHeight: 40,
                    '&.Mui-selected': {
                      bgcolor: adminTheme.colors.primaryLight,
                      '& .MuiListItemIcon-root': {
                        color: adminTheme.colors.primary,
                      },
                      '&:hover': {
                        bgcolor: adminTheme.colors.primaryLighter,
                      },
                    },
                    '&:hover': {
                      bgcolor: adminTheme.colors.bgHoverLight,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: adminTheme.colors.secondary,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: adminTheme.typography.fontSize.sm,
                      fontWeight: router.pathname === item.path ? adminTheme.typography.fontWeight.medium : adminTheme.typography.fontWeight.normal,
                      color: router.pathname === item.path ? adminTheme.colors.primary : adminTheme.colors.textDark,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: adminTheme.colors.bgCard,
            borderRight: `1px solid ${adminTheme.colors.border}`,
          },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List sx={{ px: 2 }}>
            {menuItems.map((item) => {
              const isSelected = mounted && router.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => router.push(item.path)}
                    sx={{
                      borderRadius: adminTheme.spacing.borderRadius,
                      minHeight: 40,
                      '&.Mui-selected': {
                        bgcolor: adminTheme.colors.primaryLight,
                        '& .MuiListItemIcon-root': {
                          color: adminTheme.colors.primary,
                        },
                        '&:hover': {
                          bgcolor: adminTheme.colors.primaryLighter,
                        },
                      },
                      '&:hover': {
                        bgcolor: adminTheme.colors.bgHoverLight,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: adminTheme.colors.secondary,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: adminTheme.typography.fontSize.sm,
                        fontWeight: isSelected ? adminTheme.typography.fontWeight.medium : adminTheme.typography.fontWeight.normal,
                        color: isSelected ? adminTheme.colors.primary : adminTheme.colors.textDark,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: adminTheme.colors.bgPage,
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Container
          maxWidth={false}
          sx={{
            py: 3,
            px: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
