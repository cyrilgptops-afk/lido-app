/**
 * Admin Layout Component
 * Navigation and layout for admin pages
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material/styles';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  Business as BusinessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  Groups as GroupsIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';

const drawerWidth = 220;
const collapsedWidth = 68;

// Centralized Admin Theme
export const adminTheme = {
  colors: {
    primary: '#1E5BD8',
    primaryHover: '#1748B1',
    primaryLight: '#E8F0FF',
    primaryLighter: '#DDE8FF',
    secondary: '#8592a3',
    error: '#ff4c51',
    success: '#56ca00',
    warning: '#ffb400',
    textDark: '#1F2937',
    textMedium: '#4B5563',
    textLight: '#9CA3AF',
    bgPage: '#F2F4F7',
    bgCard: '#ffffff',
    bgRow: '#ffffff',
    bgHover: '#fafafb',
    bgHoverLight: '#f5f5f9',
    bgHeader: '#f9fafb',
    border: '#E5E7EB',
    borderLight: '#EEF1F4',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.8125rem',
      base: '0.875rem',
      lg: '1rem',
      xl: '1.25rem',
      '2xl': '1.75rem',
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
    tableCellPadding: '10px 14px',
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
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const collapseStorageKey = 'admin.nav.collapsed';

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(collapseStorageKey);
      if (stored !== null) setIsCollapsed(stored === 'true');
    } catch {
      // Ignore storage access errors (private mode, etc.)
    }
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const effectiveCollapsed = isDesktop && isCollapsed;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: adminTheme.colors.bgPage }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          bgcolor: '#1f2430',
          backgroundImage: 'linear-gradient(90deg, #1f2430 0%, #232a38 55%, #1c2230 100%)',
          color: '#f8fafc',
          boxShadow: '0 14px 28px rgba(2, 6, 23, 0.38)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 52 }, px: { xs: 2, sm: 3 } }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#f8fafc' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDesktop && (
              <IconButton
                size="small"
                onClick={() => {
                  setIsCollapsed((prev) => {
                    const next = !prev;
                    if (typeof window !== 'undefined') {
                      try {
                        window.localStorage.setItem(collapseStorageKey, String(next));
                      } catch {
                        // Ignore storage write errors
                      }
                    }
                    return next;
                  });
                }}
                sx={{ color: '#e2e8f0' }}
              >
                {effectiveCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            )}
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: '#1e293b',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(226, 232, 240, 0.35)',
              }}
            >
              <Typography
                sx={{
                  color: '#f8fafc',
                  fontWeight: adminTheme.typography.fontWeight.bold,
                  fontSize: adminTheme.typography.fontSize.sm,
                }}
              >
                L
              </Typography>
            </Box>
            {!effectiveCollapsed && (
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontWeight: adminTheme.typography.fontWeight.bold,
                  fontSize: adminTheme.typography.fontSize.sm,
                  color: '#f8fafc',
                  letterSpacing: '0.02em',
                }}
              >
                Lido
              </Typography>
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {title && !effectiveCollapsed && (
            <>
              <Typography sx={{ mx: 1.5, color: '#94a3b8', display: { xs: 'none', sm: 'block' } }}>/</Typography>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: adminTheme.typography.fontWeight.medium,
                  fontSize: adminTheme.typography.fontSize.sm,
                  color: '#f1f5f9',
                  letterSpacing: '0.01em',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {title}
              </Typography>
            </>
          )}
        </Toolbar>
      </AppBar>

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
            bgcolor: '#1f2430',
            backgroundImage: 'linear-gradient(180deg, #1f2430 0%, #1c2230 100%)',
            borderRight: '1px solid rgba(148, 163, 184, 0.2)',
          },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 52 }, px: { xs: 2, sm: 3 } }} />
        <Box sx={{ overflow: effectiveCollapsed ? 'hidden' : 'auto', py: 2 }}>
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
                    minHeight: 34,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(148, 163, 184, 0.18)',
                        '& .MuiListItemIcon-root': { color: '#f8fafc' },
                        '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.22)' },
                    },
                      '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.12)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: '#94a3b8' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: adminTheme.typography.fontSize.sm,
                      fontWeight: router.pathname === item.path ? adminTheme.typography.fontWeight.medium : adminTheme.typography.fontWeight.normal,
                      color: router.pathname === item.path ? '#ffffff' : '#e2e8f0',
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
          width: effectiveCollapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: effectiveCollapsed ? collapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1f2430',
            backgroundImage: 'linear-gradient(180deg, #1f2430 0%, #1c2230 100%)',
            borderRight: '1px solid rgba(148, 163, 184, 0.2)',
          },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 52 }, px: { xs: 2, sm: 3 } }} />
        <Box sx={{ overflow: effectiveCollapsed ? 'hidden' : 'auto', py: 2 }}>
          <List sx={{ px: effectiveCollapsed ? 1 : 2 }}>
            {menuItems.map((item) => {
              const isSelected = mounted && router.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => router.push(item.path)}
                    sx={{
                      borderRadius: adminTheme.spacing.borderRadius,
                      minHeight: 34,
                      justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(148, 163, 184, 0.18)',
                        '& .MuiListItemIcon-root': { color: '#f8fafc' },
                        '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.22)' },
                      },
                      '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.12)' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: '#94a3b8', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: adminTheme.typography.fontSize.sm,
                        fontWeight: isSelected ? adminTheme.typography.fontWeight.medium : adminTheme.typography.fontWeight.normal,
                        color: isSelected ? '#ffffff' : '#e2e8f0',
                      }}
                      sx={{
                        opacity: effectiveCollapsed ? 0 : 1,
                        width: effectiveCollapsed ? 0 : 'auto',
                        transition: 'opacity 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: adminTheme.colors.bgPage, minHeight: '100vh' }}>
        <Toolbar sx={{ minHeight: { xs: 48, sm: 52 }, px: { xs: 2, sm: 3 } }} />
        <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
















