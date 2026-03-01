import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi, BotScript, BotVersion, BotDeployment } from '../../../lib/api/bots';

export default function BotDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const botId = parseInt(id as string);

  const [bot, setBot] = useState<BotScript | null>(null);
  const [versions, setVersions] = useState<BotVersion[]>([]);
  const [deployments, setDeployments] = useState<BotDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadChangelog, setUploadChangelog] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (botId) {
      loadData();
    }
  }, [botId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [botResult, versionsResult, deploymentsResult] = await Promise.all([
        botsApi.getBot(botId),
        botsApi.listVersions(botId),
        botsApi.getDeploymentHistory(botId),
      ]);

      setBot(botResult.data || null);
      setVersions(Array.isArray(versionsResult.data) ? versionsResult.data : []);
      setDeployments(Array.isArray(deploymentsResult.data) ? deploymentsResult.data : []);
    } catch (err: any) {
      console.error('Failed to load bot data:', err);
      setError(err.message || 'Failed to load bot data. Please try again.');
      setBot(null);
      setVersions([]);
      setDeployments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadVersion = async () => {
    if (!uploadFile || !uploadVersion.trim()) {
      setError('Version number and script file are required');
      return;
    }

    try {
      setIsUploading(true);
      await botsApi.uploadVersion({
        botId,
        version: uploadVersion.trim(),
        changelog: uploadChangelog.trim() || undefined,
        scriptFile: uploadFile,
      });

      setUploadDialogOpen(false);
      setUploadVersion('');
      setUploadChangelog('');
      setUploadFile(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to upload version:', err);
      setError(err.message || 'Failed to upload version');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeployVersion = async (versionId: number) => {
    if (!confirm('Are you sure you want to deploy this version?')) return;

    try {
      await botsApi.deployVersion(botId, versionId);
      await loadData();
    } catch (err: any) {
      console.error('Failed to deploy version:', err);
      setError(err.message || 'Failed to deploy version');
    }
  };

  const handleDownloadVersion = async (versionId: number) => {
    try {
      const blob = await botsApi.downloadVersion(botId, versionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bot-script-${versionId}.js`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download version:', err);
      setError('Failed to download version');
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('Are you sure you want to delete this version?')) return;

    try {
      await botsApi.deleteVersion(botId, versionId);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete version:', err);
      setError(err.message || 'Failed to delete version');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!bot) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Bot not found</Alert>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/bots')}
          sx={{ mb: 3 }}
        >
          Back to Bots
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Bot Info */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {bot.name}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {bot.description || 'No description'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`Version: ${bot.version}`} />
                <Chip
                  label={bot.is_active ? 'Active' : 'Inactive'}
                  color={bot.is_active ? 'success' : 'default'}
                />
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => {
                setError(null);
                setUploadDialogOpen(true);
              }}
            >
              Upload New Version
            </Button>
          </Box>
        </Paper>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Versions" />
            <Tab label="Deployment History" icon={<HistoryIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Versions Tab */}
        {tabValue === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>File Size</TableCell>
                  <TableCell>Changelog</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(versions) || versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No versions uploaded yet. Upload your first version to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  versions.map((version) => (
                    <TableRow key={version.id} hover>
                      <TableCell>
                        <Chip label={version.version} size="small" />
                      </TableCell>
                      <TableCell>{(version.file_size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell>{version.changelog || '-'}</TableCell>
                      <TableCell>
                        {version.is_deployed ? (
                          <Chip label="Deployed" color="success" size="small" />
                        ) : (
                          <Chip label="Not Deployed" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(version.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownloadVersion(version.id)}
                          title="Download"
                        >
                          <DownloadIcon />
                        </IconButton>
                        {!version.is_deployed && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleDeployVersion(version.id)}
                              title="Deploy"
                            >
                              <RocketLaunchIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteVersion(version.id)}
                              title="Delete"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Deployments Tab */}
        {tabValue === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Deployed By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Deployed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(deployments) || deployments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No deployments yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deployments.map((deployment) => (
                    <TableRow key={deployment.id} hover>
                      <TableCell>
                        <Chip label={deployment.version} size="small" />
                      </TableCell>
                      <TableCell>{deployment.deployed_by_email}</TableCell>
                      <TableCell>
                        <Chip
                          label={deployment.deployment_status}
                          size="small"
                          color={
                            deployment.deployment_status === 'success'
                              ? 'success'
                              : deployment.deployment_status === 'failed'
                              ? 'error'
                              : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(deployment.deployed_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Version"
              value={uploadVersion}
              onChange={(e) => setUploadVersion(e.target.value)}
              required
              sx={{ mt: 2, mb: 2 }}
              helperText={`Use a unique version number (e.g., 1.0.1, 2.0.0). Existing: ${Array.isArray(versions) && versions.length > 0 ? versions.map(v => v.version).join(', ') : 'none'}`}
            />

            <TextField
              fullWidth
              label="Changelog"
              value={uploadChangelog}
              onChange={(e) => setUploadChangelog(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              helperText="What's new in this version?"
            />

            <Button variant="outlined" component="label" fullWidth>
              {uploadFile ? uploadFile.name : 'Choose Script File (.js)'}
              <input
                type="file"
                hidden
                accept=".js"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadVersion}
              variant="contained"
              disabled={isUploading || !uploadFile || !uploadVersion.trim()}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminLayout>
  );
}
