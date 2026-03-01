import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { botsApi } from '../../../lib/api/bots';

export default function NewBotPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Bot name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await botsApi.createBot({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Navigate to bot detail page
      router.push(`/admin/bots/${result.data.id}`);
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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mb: 3 }}
        >
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
            <TextField
              fullWidth
              label="Bot Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 3 }}
              helperText="A descriptive name for your bot (e.g., Account Help Bot)"
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 4 }}
              helperText="Optional description of what this bot does"
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

              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>

        <Alert severity="info" sx={{ mt: 3 }}>
          After creating the bot, you'll be able to upload script versions and deploy them.
        </Alert>
      </Container>
    </AdminLayout>
  );
}
