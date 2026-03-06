import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import AppsIcon from '@mui/icons-material/Apps';
import AdminLayout, { adminTheme } from '../../../components/layouts/AdminLayout';
import { botsApi, BotScript } from '../../../lib/api/bots';
import type { BotType } from '../../../lib/api/bots';

// Avatar URL cache
const _cache = new Map<string, { url: string; expiresAt: number }>();
async function resolveAvatarUrl(key: string): Promise<string | null> {
  const cached = _cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const url = await botsApi.getAvatarUrl(key).catch(() => null);
  if (url) _cache.set(key, { url, expiresAt: Date.now() + 3_600_000 });
  return url ?? null;
}

export default function AdminBotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotScript[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<Record<number, string>>({});
  const [typeFilter, setTypeFilter] = useState<BotType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBots();
  }, [typeFilter]);

  const loadBots = async () => {
    try {
      setIsLoading(true);
      const result = await botsApi.getBots(typeFilter === 'all' ? undefined : typeFilter);
      const list = result.data;
      setBots(list);
      setError(null);
      // Resolve avatars in background
      list.forEach(async (b) => {
        if (b.avatar_url) {
          const url = await resolveAvatarUrl(b.avatar_url);
          if (url) setAvatarUrls((prev) => ({ ...prev, [b.id]: url }));
        }
      });
    } catch (err) {
      console.error('Failed to load bots:', err);
      setError('Failed to load bots. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBot = () => {
    router.push('/admin/bots/new');
  };

  const handleEditBot = (botId: number) => {
    router.push(`/admin/bots/${botId}`);
  };

  const handleDeleteBot = async (botId: number, botName: string) => {
    if (!confirm(`Are you sure you want to delete bot "${botName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await botsApi.deleteBot(botId);
      await loadBots();
    } catch (err: any) {
      console.error('Failed to delete bot:', err);
      setError(err.message || 'Failed to delete bot');
    }
  };

  return (
    <AdminLayout title="Bots">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: adminTheme.typography.fontWeight.semibold,
              color: adminTheme.colors.textDark,
              fontSize: adminTheme.typography.fontSize.xl,
              mb: 0.5,
            }}
          >
            Bot Scripts
          </Typography>
          <Typography sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight }}>
            Manage chat and application bots.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(_, v) => v && setTypeFilter(v)}
            size="small"
            sx={{
              bgcolor: adminTheme.colors.bgRow,
              border: `1px solid ${adminTheme.colors.borderLight}`,
              borderRadius: adminTheme.spacing.borderRadius,
              '& .MuiToggleButton-root': {
                px: 1.5,
                py: 0.6,
                fontSize: adminTheme.typography.fontSize.sm,
                textTransform: 'none',
                color: adminTheme.colors.textMedium,
                border: 0,
              },
              '& .Mui-selected': {
                bgcolor: adminTheme.colors.primaryLight,
                color: adminTheme.colors.primary,
                fontWeight: adminTheme.typography.fontWeight.medium,
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="chat"><ChatIcon fontSize="small" sx={{ mr: 0.5 }} />Chat</ToggleButton>
            <ToggleButton value="application"><AppsIcon fontSize="small" sx={{ mr: 0.5 }} />Apps</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateBot}
            sx={{
              bgcolor: adminTheme.colors.primary,
              textTransform: 'none',
              fontSize: adminTheme.typography.fontSize.sm,
              fontWeight: adminTheme.typography.fontWeight.medium,
              px: 3,
              py: 1,
              boxShadow: '0 2px 6px 0 rgba(105, 108, 255, 0.4)',
              '&:hover': { bgcolor: adminTheme.colors.primaryHover, boxShadow: '0 4px 8px 0 rgba(105, 108, 255, 0.5)' },
            }}
          >
            Create New Bot
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.borderLight}`, borderRadius: adminTheme.spacing.borderRadius, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
                <TableCell width={48} sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}></TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Name</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Type</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Description</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Version</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Status</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Created</TableCell>
                <TableCell align="right" sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bots.length === 0 ? (
                <TableRow sx={{ bgcolor: adminTheme.colors.bgRow }}>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: adminTheme.colors.textLight, fontSize: adminTheme.typography.fontSize.sm, padding: adminTheme.spacing.tableCellPadding, borderBottom: 0 }}>
                    No bots found. Create your first bot to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bots.map((bot) => (
                  <TableRow key={bot.id} sx={{ bgcolor: adminTheme.colors.bgRow, '&:hover': { bgcolor: adminTheme.colors.bgHover }, '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      <Avatar
                        src={avatarUrls[bot.id]}
                        sx={{ width: 34, height: 34, bgcolor: adminTheme.colors.primary }}
                      >
                        <SmartToyIcon fontSize="small" />
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      <Typography sx={{ fontWeight: adminTheme.typography.fontWeight.semibold, fontSize: adminTheme.typography.fontSize.sm }}>
                        {bot.display_name || bot.name}
                      </Typography>
                      {bot.display_name && (
                        <Typography sx={{ fontSize: adminTheme.typography.fontSize.xs, color: adminTheme.colors.textLight }}>{bot.name}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      <Chip
                        icon={bot.type === 'chat' ? <ChatIcon /> : <AppsIcon />}
                        label={bot.type === 'application' ? 'Application' : 'Chat'}
                        size="small"
                        sx={{
                          bgcolor: bot.type === 'application' ? '#e8f4fd' : '#f0f0ff',
                          color: bot.type === 'application' ? '#2196f3' : '#696cff',
                          fontWeight: adminTheme.typography.fontWeight.medium,
                          fontSize: adminTheme.typography.fontSize.xs,
                          height: 22,
                          '& .MuiChip-icon': { fontSize: '14px !important' },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      {bot.description || '�'}
                    </TableCell>
                    <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      <Chip
                        label={bot.version || '1.0.0'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      {bot.is_active ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Active"
                          size="small"
                          color="success"
                          sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22, fontWeight: adminTheme.typography.fontWeight.medium }}
                        />
                      ) : (
                        <Chip label="Inactive" size="small" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      {new Date(bot.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right" sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditBot(bot.id)}
                        title="Edit Bot"
                        sx={{ color: adminTheme.colors.textMedium, padding: '6px', '&:hover': { color: adminTheme.colors.primary, bgcolor: adminTheme.colors.primaryLight } }}
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        title="Delete Bot"
                        sx={{ color: adminTheme.colors.textMedium, padding: '6px', ml: 0.5, '&:hover': { color: adminTheme.colors.error, bgcolor: 'rgba(255, 76, 81, 0.08)' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminLayout>
  );
}
