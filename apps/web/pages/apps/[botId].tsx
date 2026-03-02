import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import SmartToyIcon    from '@mui/icons-material/SmartToy';
import RefreshIcon     from '@mui/icons-material/Refresh';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import AppRenderer     from '../../components/app-renderer/AppRenderer';
import { appBotsApi }  from '../../lib/api/app-bots';
import { botsApi }     from '../../lib/api/bots';
import type { AppBotInfo, AppBotExecuteResult } from '../../lib/api/app-bots';
import type { AppComponent } from '../../components/app-renderer/types';

// ─ module-level avatar URL cache ─────────────────────────────────────────────
const _avatarCache = new Map<string, { url: string; expiresAt: number }>();
async function resolveAvatarUrl(key: string): Promise<string | null> {
  const hit = _avatarCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  const url = await botsApi.getAvatarUrl(key).catch(() => null);
  if (url) _avatarCache.set(key, { url, expiresAt: Date.now() + 3_600_000 });
  return url ?? null;
}

export default function AppBotPage() {
  const router = useRouter();

  // Stable numeric botId — only set after router is ready so the loading
  // effect never fires with a null/NaN value.
  const [botId, setBotId] = useState<number | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const id = Number(router.query.botId);
    if (id > 0) setBotId(id);
  }, [router.isReady, router.query.botId]);

  const [botInfo,    setBotInfo]    = useState<AppBotInfo | null>(null);
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null);
  const [layout,     setLayout]     = useState<AppComponent[]>([]);
  const [message,    setMessage]    = useState<string | null>(null);
  // Start false — the loading effect sets it to true once the botId is ready
  const [isLoading,  setIsLoading]  = useState(false);
  const [isActing,   setIsActing]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load bot info + execute init ──────────────────────────────────────────
  useEffect(() => {
    if (!botId) return;
    let mounted = true;

    // Reset stale state immediately before the new fetch completes
    setBotInfo(null);
    setLayout([]);
    setMessage(null);
    setAvatarUrl(null);
    setError(null);
    setIsLoading(true);

    (async () => {
      try {
        // Fetch bot info and execute init in parallel
        const [info, result] = await Promise.all([
          appBotsApi.getBot(botId),
          appBotsApi.execute(botId, 'init'),
        ]);

        if (!mounted) return;

        setBotInfo(info);
        setLayout(result.layout ?? []);
        setMessage(result.message ?? null);

        // Resolve avatar
        if (info.avatar_url) {
          const url = await resolveAvatarUrl(info.avatar_url);
          if (mounted && url) setAvatarUrl(url);
        }
      } catch (err: any) {
        if (mounted) setError(err.message ?? 'Failed to load application bot');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [botId]);

  // ── Handle user actions (intent execution) ────────────────────────────────
  const handleAction = useCallback(
    async (intent: string, params?: Record<string, any>) => {
      if (!botId || isActing) return;
      setIsActing(true);
      setError(null);
      try {
        const result: AppBotExecuteResult = await appBotsApi.execute(botId, intent, params);
        setLayout(result.layout ?? []);
        setMessage(result.message ?? null);
      } catch (err: any) {
        setError(err.message ?? 'Action failed');
      } finally {
        setIsActing(false);
      }
    },
    [botId, isActing],
  );

  const handleRefresh = () => handleAction('init');

  const pageTitle = botInfo
    ? (botInfo.display_name || botInfo.name)
    : 'Application Bot';

  return (
    <DashboardLayout fullWindow>
      <Head>
        <title>{pageTitle} – Lido</title>
      </Head>

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <Box
          sx={{
            display     : 'flex',
            alignItems  : 'center',
            gap         : 1.5,
            px          : 3,
            py          : 1.5,
            borderBottom: '1px solid',
            borderColor : 'divider',
            bgcolor     : 'background.paper',
            position    : 'sticky',
            top         : 0,
            zIndex      : 10,
          }}
        >
          <Tooltip title="Back to Applications">
            <IconButton size="small" onClick={() => router.push('/apps')}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Avatar
            src={avatarUrl ?? undefined}
            sx={{ width: 36, height: 36, bgcolor: '#696cff' }}
          >
            <SmartToyIcon fontSize="small" />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {botInfo ? (botInfo.display_name || botInfo.name) : '…'}
            </Typography>
            {botInfo && (
              <Typography variant="caption" color="text.secondary">
                v{botInfo.version}
              </Typography>
            )}
          </Box>

          {/* Refresh / reload the init intent */}
          <Tooltip title="Refresh">
            <span>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={isLoading || isActing}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, position: 'relative', overflow: 'auto' }}>
          {/* Full-page loading spinner (first load) */}
          {isLoading && (
            <Box
              sx={{
                position       : 'absolute',
                inset          : 0,
                display        : 'flex',
                alignItems     : 'center',
                justifyContent : 'center',
                bgcolor        : 'background.default',
                zIndex         : 5,
              }}
            >
              <CircularProgress sx={{ color: '#696cff' }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Optional bot message above layout */}
          {message && !isLoading && (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {message}
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </>
          )}

          {/* Action in-progress overlay (non-blocking, gentle) */}
          {isActing && (
            <Box
              sx={{
                position: 'fixed',
                bottom  : 24,
                right   : 24,
                zIndex  : 20,
                display : 'flex',
                alignItems: 'center',
                gap     : 1,
                bgcolor : 'background.paper',
                boxShadow: 3,
                px      : 2,
                py      : 1,
                borderRadius: 2,
              }}
            >
              <CircularProgress size={16} sx={{ color: '#696cff' }} />
              <Typography variant="caption" color="text.secondary">
                Processing…
              </Typography>
            </Box>
          )}

          {/* App layout */}
          {!isLoading && layout.length > 0 && (
            <AppRenderer layout={layout} onAction={handleAction} />
          )}

          {/* Empty state */}
          {!isLoading && !error && layout.length === 0 && (
            <Box
              sx={{
                display       : 'flex',
                flexDirection : 'column',
                alignItems    : 'center',
                justifyContent: 'center',
                pt            : 12,
                gap           : 2,
              }}
            >
              <SmartToyIcon sx={{ fontSize: 64, color: '#d4d5ff' }} />
              <Typography variant="h6" color="text.disabled">
                No content returned.
              </Typography>
              <Typography variant="body2" color="text.disabled">
                The bot did not produce any layout components.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
