import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import ChatIcon from '@mui/icons-material/Chat';
import AppsIcon from '@mui/icons-material/Apps';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi, BotScript, BotVersion, BotDeployment } from '../../../lib/api/bots';
import type { BotType } from '../../../lib/api/bots';

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

  // Settings tab state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDisplayName, setSettingsDisplayName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsType, setSettingsType] = useState<BotType>('chat');
  const [settingsAvatarFile, setSettingsAvatarFile] = useState<File | null>(null);
  const [settingsAvatarPreview, setSettingsAvatarPreview] = useState<string | null>(null);
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

      // Populate settings fields
      const b = botResult.data;
      if (b) {
        setSettingsName(b.name ?? '');
        setSettingsDisplayName(b.display_name ?? '');
        setSettingsDescription(b.description ?? '');
        setSettingsType((b.type as BotType) ?? 'chat');
        // Resolve avatar presigned URL
        if (b.avatar_url) {
          botsApi.getAvatarUrl(b.avatar_url).then((url) => { if (url) setSettingsAvatarUrl(url); }).catch(() => {});
        }
      }
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

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      setError(null);
      await botsApi.updateBot(botId, {
        name: settingsName.trim() || undefined,
        display_name: settingsDisplayName.trim() || undefined,
        description: settingsDescription.trim() || undefined,
        type: settingsType,
      });
      if (settingsAvatarFile) {
        await botsApi.uploadAvatar(botId, settingsAvatarFile);
        setSettingsAvatarFile(null);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSettingsAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSettingsAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSettingsAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={settingsAvatarUrl ?? undefined}
                sx={{ width: 56, height: 56, bgcolor: '#696cff' }}
              >
                <SmartToyIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" gutterBottom sx={{ mb: 0.5 }}>
                  {bot.display_name || bot.name}
                </Typography>
                {bot.display_name && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {bot.name}
                  </Typography>
                )}
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  {bot.description || 'No description'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`v${bot.version}`} size="small" />
                  <Chip
                    icon={bot.type === 'application' ? <AppsIcon /> : <ChatIcon />}
                    label={bot.type === 'application' ? 'Application' : 'Chat'}
                    size="small"
                    sx={{
                      bgcolor: bot.type === 'application' ? '#e8f4fd' : '#f0f0ff',
                      color: bot.type === 'application' ? '#2196f3' : '#696cff',
                      fontWeight: 600,
                      '& .MuiChip-icon': { fontSize: '14px !important' },
                    }}
                  />
                  <Chip
                    label={bot.is_active ? 'Active' : 'Inactive'}
                    color={bot.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => { setError(null); setUploadDialogOpen(true); }}
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
            <Tab label="Settings" icon={<SettingsIcon />} iconPosition="start" />
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

        {/* Settings Tab */}
        {tabValue === 2 && (
          <Paper sx={{ p: 4, maxWidth: 640 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Bot Settings
            </Typography>

            {/* Type */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Bot Type
            </Typography>
            <ToggleButtonGroup
              value={settingsType}
              exclusive
              onChange={(_, v) => v && setSettingsType(v as BotType)}
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="chat" sx={{ gap: 1 }}>
                <ChatIcon fontSize="small" />Chat Bot
              </ToggleButton>
              <ToggleButton value="application" sx={{ gap: 1 }}>
                <AppsIcon fontSize="small" />Application
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              {settingsType === 'chat'
                ? 'Runs inside the Chat page.'
                : 'Launches from the Applications page.'}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            {/* Avatar */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Avatar
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={settingsAvatarPreview ?? settingsAvatarUrl ?? undefined}
                sx={{ width: 72, height: 72, bgcolor: '#696cff', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <SmartToyIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {settingsAvatarFile ? 'Change Image' : 'Upload Image'}
                </Button>
                {settingsAvatarFile && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    {settingsAvatarFile.name}
                  </Typography>
                )}
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleSettingsAvatarChange}
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            <TextField
              fullWidth
              label="Bot Name"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Internal identifier name"
            />
            <TextField
              fullWidth
              label="Display Name"
              value={settingsDisplayName}
              onChange={(e) => setSettingsDisplayName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Friendly name shown to users"
            />
            <TextField
              fullWidth
              label="Description"
              value={settingsDescription}
              onChange={(e) => setSettingsDescription(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 4 }}
            />

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </Paper>
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
