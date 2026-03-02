import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Drawer,
  IconButton,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { botsApi } from '../../lib/api/bots';
import type { ActiveBot, ApplicationBotConfig } from '../../lib/api/bots';

// ─ Module-level avatar URL cache ─────────────────────────────────────────────
const _cache = new Map<string, { url: string; expiresAt: number }>();
async function resolveAvatarUrl(key: string): Promise<string | null> {
  const cached = _cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const url = await botsApi.getAvatarUrl(key).catch(() => null);
  if (url) _cache.set(key, { url, expiresAt: Date.now() + 3_600_000 });
  return url ?? null;
}

export default function AppsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<ActiveBot[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedBotId, setHighlightedBotId] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Panel / drawer state for embedType='panel'
  const [panelBot, setPanelBot] = useState<ActiveBot | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const result = await botsApi.getActiveBots('application');
        const list = result.data ?? [];
        if (mounted) {
          setApps(list);
          list.forEach(async (b) => {
            if (b.avatar_url) {
              const url = await resolveAvatarUrl(b.avatar_url);
              if (url && mounted) setAvatarUrls((prev) => ({ ...prev, [b.id]: url }));
            }
          });
        }
      } catch (err: any) {
        if (mounted) setError(err.message ?? 'Failed to load applications');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Highlight + scroll to the bot specified by ?botId query param ─────────
  useEffect(() => {
    if (!router.isReady || apps.length === 0) return;
    const botIdParam = router.query.botId ? Number(router.query.botId) : null;
    setHighlightedBotId(botIdParam);
    if (botIdParam) {
      setTimeout(() => {
        cardRefs.current[botIdParam]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.botId, apps.length]);

  const handleLaunch = (bot: ActiveBot) => {
    const cfg = (bot.config ?? {}) as ApplicationBotConfig;

    // JS-powered dynamic bot — render via app-renderer page
    if (cfg.embedType === 'dynamic' || (!cfg.appUrl && bot.storage_key)) {
      router.push(`/apps/${bot.id}`);
      return;
    }

    const url = cfg.appUrl ?? '';
    if (!url) return;

    switch (cfg.embedType ?? 'redirect') {
      case 'redirect':
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'iframe':
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'panel':
        setPanelBot(bot);
        break;
    }
  };

  const getLaunchLabel = (bot: ActiveBot) => {
    const cfg = (bot.config ?? {}) as ApplicationBotConfig;
    if (cfg.embedType === 'dynamic' || (!cfg.appUrl && bot.storage_key)) return 'Open App';
    return cfg.launchLabel ?? 'Launch';
  };

  const getPanelUrl = (bot: ActiveBot | null) => {
    if (!bot) return '';
    return ((bot.config ?? {}) as ApplicationBotConfig).appUrl ?? '';
  };

  return (
    <DashboardLayout>
      <Box sx={{ px: 3, pt: 3, pb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#566a7f' }}>
            Applications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Launch your integrated application bots.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
            <CircularProgress sx={{ color: '#696cff' }} />
          </Box>
        ) : apps.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 10,
              gap: 2,
            }}
          >
            <SmartToyIcon sx={{ fontSize: 64, color: '#d4d5ff' }} />
            <Typography variant="h6" color="text.disabled">
              No application bots are active yet.
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Create and deploy an application bot from the Bots admin panel.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {apps.map((bot) => {
              const cfg = (bot.config ?? {}) as ApplicationBotConfig;
              const isDynamic = cfg.embedType === 'dynamic' || (!cfg.appUrl && Boolean(bot.storage_key));
              const hasUrl = Boolean(cfg.appUrl) || isDynamic;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={bot.id}>
                  <Card
                    ref={(el: HTMLDivElement | null) => { cardRefs.current[bot.id] = el; }}
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: highlightedBotId === bot.id ? '2px solid #696cff' : '1px solid #e7e7ff',
                      borderRadius: 3,
                      transition: 'box-shadow .2s, border-color .2s',
                      boxShadow: highlightedBotId === bot.id ? '0 0 0 4px #696cff18' : undefined,
                      '&:hover': { boxShadow: '0 4px 20px #696cff22' },
                    }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar
                          src={avatarUrls[bot.id]}
                          sx={{ width: 52, height: 52, bgcolor: '#696cff', flexShrink: 0 }}
                        >
                          <SmartToyIcon />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {bot.display_name || bot.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{bot.version}
                          </Typography>
                        </Box>
                      </Box>

                      {isDynamic ? (
                        <Chip
                          label="Dynamic App"
                          size="small"
                          sx={{ alignSelf: 'flex-start', bgcolor: '#eef2ff', color: '#696cff', fontSize: '0.7rem' }}
                        />
                      ) : cfg.embedType && cfg.embedType !== 'redirect' && (
                        <Chip
                          label={cfg.embedType === 'panel' ? 'Opens in side panel' : 'Embedded'}
                          size="small"
                          sx={{ alignSelf: 'flex-start', bgcolor: '#f0f0ff', color: '#696cff', fontSize: '0.7rem' }}
                        />
                      )}

                      {!hasUrl && (
                        <Typography variant="caption" color="error">
                          No app URL configured.
                        </Typography>
                      )}
                    </CardContent>

                    <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        disabled={!hasUrl}
                        endIcon={cfg.embedType !== 'panel' ? <OpenInNewIcon fontSize="small" /> : undefined}
                        onClick={() => handleLaunch(bot)}
                        sx={{
                          bgcolor: '#696cff',
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': { bgcolor: '#5a5fd4' },
                        }}
                      >
                        {getLaunchLabel(bot)}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Side Panel Drawer for embedType='panel' */}
      <Drawer
        anchor="right"
        open={Boolean(panelBot)}
        onClose={() => setPanelBot(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520, md: 680 }, p: 0 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e7e7ff' }}>
          <Avatar src={panelBot ? avatarUrls[panelBot.id] : undefined} sx={{ bgcolor: '#696cff', width: 32, height: 32, mr: 1.5 }}>
            <SmartToyIcon fontSize="small" />
          </Avatar>
          <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
            {panelBot ? (panelBot.display_name || panelBot.name) : ''}
          </Typography>
          <IconButton onClick={() => setPanelBot(null)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, height: 'calc(100vh - 64px)' }}>
          {panelBot && getPanelUrl(panelBot) && (
            <iframe
              src={getPanelUrl(panelBot)}
              title={panelBot.display_name || panelBot.name}
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          )}
        </Box>
      </Drawer>
    </DashboardLayout>
  );
}
