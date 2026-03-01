/**
 * Admin Dashboard - Overview
 */

import { useEffect, useState } from 'react';
import AdminLayout, { adminTheme } from '../../components/layouts/AdminLayout';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalOrgs: number;
  totalMembers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Check if we're in the browser
      if (typeof window === 'undefined') {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalOrgs: 0,
          totalMembers: 0,
        });
        setLoading(false);
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const [usersRes, orgsRes] = await Promise.all([
        fetch(`${baseUrl}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => null),
        fetch(`${baseUrl}/admin/organizations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => null),
      ]);

      let users: any[] = [];
      let orgs: any[] = [];

      if (usersRes?.ok) {
        try {
          const usersData = await usersRes.json();
          users = usersData.data?.users || [];
        } catch (e) {
          console.error('Failed to parse users response:', e);
        }
      }

      if (orgsRes?.ok) {
        try {
          const orgsData = await orgsRes.json();
          orgs = orgsData.data || [];
        } catch (e) {
          console.error('Failed to parse orgs response:', e);
        }
      }

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        totalOrgs: orgs.length,
        totalMembers: orgs.reduce((sum: number, o: any) => sum + (o.member_count || 0), 0),
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalOrgs: 0,
        totalMembers: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
            <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
              <Box display="flex" flexDirection="column" gap={adminTheme.spacing.contentGap}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.normal }}>
                    Total Users
                  </Typography>
                  <Box sx={{ bgcolor: adminTheme.colors.primaryLight, borderRadius: adminTheme.spacing.borderRadius, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 24, color: adminTheme.colors.primary }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: adminTheme.typography.fontWeight.bold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize['2xl'] }}>
                  {stats?.totalUsers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
            <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
              <Box display="flex" flexDirection="column" gap={adminTheme.spacing.contentGap}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.normal }}>
                    Active Users
                  </Typography>
                  <Box sx={{ bgcolor: adminTheme.colors.primaryLight, borderRadius: adminTheme.spacing.borderRadius, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 24, color: adminTheme.colors.success }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: adminTheme.typography.fontWeight.bold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize['2xl'] }}>
                  {stats?.activeUsers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users (continuation placeholder) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
            <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
              <Box display="flex" flexDirection="column" gap={adminTheme.spacing.contentGap}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.normal }}>
                    Active Users
                  </Typography>
                  <Box sx={{ bgcolor: adminTheme.colors.primaryLight, borderRadius: adminTheme.spacing.borderRadius, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 24, color: adminTheme.colors.primary }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: adminTheme.typography.fontWeight.bold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize['2xl'] }}>
                  {stats?.activeUsers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Organizations */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
            <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
              <Box display="flex" flexDirection="column" gap={adminTheme.spacing.contentGap}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.normal }}>
                    Organizations
                  </Typography>
                  <Box sx={{ bgcolor: adminTheme.colors.primaryLight, borderRadius: adminTheme.spacing.borderRadius, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 24, color: adminTheme.colors.primary }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: adminTheme.typography.fontWeight.bold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize['2xl'] }}>
                  {stats?.totalOrgs || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Members */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
            <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
              <Box display="flex" flexDirection="column" gap={adminTheme.spacing.contentGap}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.normal }}>
                    Total Members
                  </Typography>
                  <Box sx={{ bgcolor: adminTheme.colors.primaryLight, borderRadius: adminTheme.spacing.borderRadius, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 24, color: adminTheme.colors.primary }} />
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: adminTheme.typography.fontWeight.bold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize['2xl'] }}>
                  {stats?.totalMembers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Card elevation={0} sx={{ mt: 3, bgcolor: adminTheme.colors.bgCard, border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
        <CardContent sx={{ p: adminTheme.spacing.cardPadding }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize.base }}>
            Quick Stats
          </Typography>
          <Typography variant="body2" color={adminTheme.colors.textLight} sx={{ fontSize: adminTheme.typography.fontSize.sm }}>
            System is running smoothly. {stats?.activeUsers} active users across {stats?.totalOrgs} organizations.
          </Typography>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
