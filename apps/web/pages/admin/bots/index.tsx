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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi, BotScript } from '../../../lib/api/bots';

export default function AdminBotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setIsLoading(true);
      const result = await botsApi.getBots();
      console.log('Bots loaded:', result.data);
      console.log('First bot data:', result.data[0]);
      setBots(result.data);
      setError(null);
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
          <Typography variant="h4" component="h1">
            Bot Scripts
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateBot}
          >
            Create New Bot
          </Button>
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
                  <TableCell>Name</TableCell>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No bots found. Create your first bot to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bots.map((bot) => (
                    <TableRow key={bot.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CodeIcon color="primary" />
                          <Typography fontWeight="medium">{bot.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{bot.description || '-'}</TableCell>
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
