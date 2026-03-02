import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
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
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi, BotScript } from '../../../lib/api/bots';
import type { BotType } from '../../../lib/api/bots';

// ─ Avatar URL cache ───────────────────────────────────────────────────────────
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
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              Bot Scripts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage chat and application bots.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={typeFilter}
              exclusive
              onChange={(_, v) => v && setTypeFilter(v)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="chat"><ChatIcon fontSize="small" sx={{ mr: 0.5 }} />Chat</ToggleButton>
              <ToggleButton value="application"><AppsIcon fontSize="small" sx={{ mr: 0.5 }} />Apps</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateBot}
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
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={48}></TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No bots found. Create your first bot to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bots.map((bot) => (
                    <TableRow key={bot.id} hover>
                      <TableCell>
                        <Avatar
                          src={avatarUrls[bot.id]}
                          sx={{ width: 36, height: 36, bgcolor: '#696cff' }}
                        >
                          <SmartToyIcon fontSize="small" />
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{bot.display_name || bot.name}</Typography>
                        {bot.display_name && (
                          <Typography variant="caption" color="text.secondary">{bot.name}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={bot.type === 'chat' ? <ChatIcon /> : <AppsIcon />}
                          label={bot.type === 'application' ? 'Application' : 'Chat'}
                          size="small"
                          sx={{
                            bgcolor: bot.type === 'application' ? '#e8f4fd' : '#f0f0ff',
                            color: bot.type === 'application' ? '#2196f3' : '#696cff',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            '& .MuiChip-icon': { fontSize: '14px !important' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bot.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bot.version || '1.0.0'} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {bot.is_active ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Active"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip label="Inactive" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(bot.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditBot(bot.id)}
                          title="Edit Bot"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteBot(bot.id, bot.name)}
                          title="Delete Bot"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </AdminLayout>
  );
}
