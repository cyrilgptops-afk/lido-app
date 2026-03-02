import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ChatIcon from '@mui/icons-material/Chat';
import AppsIcon from '@mui/icons-material/Apps';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi } from '../../../lib/api/bots';
import type { BotType } from '../../../lib/api/bots';

export default function NewBotPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [botType, setBotType] = useState<BotType>('chat');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bot name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const result = await botsApi.createBot({
        name: name.trim(),
        description: description.trim() || undefined,
        type: botType,
        display_name: displayName.trim() || undefined,
      });
      const newBotId = result.data.id;

      // Upload avatar if selected
      if (avatarFile) {
        await botsApi.uploadAvatar(newBotId, avatarFile).catch((err) => {
          console.warn('Avatar upload failed (bot still created):', err);
        });
      }

      router.push(`/admin/bots/${newBotId}`);
    } catch (err: any) {
      console.error('Failed to create bot:', err);
      setError(err.response?.data?.error?.message || 'Failed to create bot. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 3 }}>
          Back
        </Button>

        <Typography variant="h4" component="h1" gutterBottom>
          Create New Bot Script
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            {/* ── Bot Type ─────────────────────────────────────────────── */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Bot Type
            </Typography>
            <ToggleButtonGroup
              value={botType}
              exclusive
              onChange={(_, v) => v && setBotType(v as BotType)}
              sx={{ mb: 1 }}
            >
              <ToggleButton value="chat" sx={{ gap: 1 }}>
                <ChatIcon fontSize="small" />
                Chat Bot
              </ToggleButton>
              <ToggleButton value="application" sx={{ gap: 1 }}>
                <AppsIcon fontSize="small" />
                Application
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              {botType === 'chat'
                ? 'A conversational bot that runs inside the Chat page.'
                : 'An application that launches from the Applications page.'}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            {/* ── Avatar ───────────────────────────────────────────────── */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Avatar (optional)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={avatarPreview ?? undefined}
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
                  {avatarFile ? 'Change Image' : 'Upload Image'}
                </Button>
                {avatarFile && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    {avatarFile.name}
                  </Typography>
                )}
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* ── Fields ───────────────────────────────────────────────── */}
            <TextField
              fullWidth
              label="Bot Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 3 }}
              helperText="Internal name used to identify this bot (e.g., support-bot)"
            />

            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Friendly name shown to users (e.g., Support Assistant). Defaults to bot name if blank."
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 4 }}
              helperText="Optional description of what this bot does."
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Bot'}
              </Button>
              <Button variant="outlined" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>

        <Alert severity="info" sx={{ mt: 3 }}>
          After creating the bot, you'll be able to upload script versions, deploy them, and
          configure advanced settings.
        </Alert>
      </Container>
    </AdminLayout>
  );
}
