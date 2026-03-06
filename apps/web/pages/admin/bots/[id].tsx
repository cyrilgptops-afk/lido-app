import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
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
  Stack,
  Tabs,
  Tab,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
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
import AdminLayout, { adminTheme } from '../../../components/layouts/AdminLayout';
import AppRenderer from '../../../components/app-renderer/AppRenderer';
import type { AppComponent } from '../../../components/app-renderer/types';
import BlocklyEditor, { BlocklyDiagnostic } from '../../../components/bots/BlocklyEditor';
import { botsApi, BotScript, BotVersion, BotDeployment } from '../../../lib/api/bots';
import type { BotType } from '../../../lib/api/bots';

type PreviewMode = 'chat' | 'application';

function normalizeChatPayload(payload: any) {
  if (!payload) return { message: '', metadata: {} };
  if (typeof payload === 'string') return { message: payload, metadata: {} };
  const metadata: any = { ...(payload.metadata ?? {}) };
  if (payload.suggestions) metadata.suggestions = payload.suggestions;
  if (payload.actions) metadata.actions = payload.actions;
  if (payload.form) metadata.form = payload.form;
  if (payload.table) metadata.table = payload.table;
  return {
    message: payload.message ?? payload.content ?? '',
    metadata,
  };
}

function ChatPreview({ payload }: { payload: any }) {
  const normalized = normalizeChatPayload(payload);
  const message = normalized.message;
  const metadata = normalized.metadata || {};
  const suggestions = Array.isArray(metadata.suggestions) ? metadata.suggestions : [];
  const actions = Array.isArray(metadata.actions) ? metadata.actions : [];
  const form = metadata.form;
  const table = metadata.table;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Avatar sx={{ bgcolor: '#1E5BD8', width: 32, height: 32 }}>
        <SmartToyIcon fontSize="small" />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: '#F5F7FB',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {message || 'No message provided.'}
          </Typography>
        </Paper>

        {table && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {table.title || 'Table'}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {(table.columns || []).map((col: any) => (
                    <TableCell key={col.key}>{col.label || col.key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(table.rows || []).map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    {(table.columns || []).map((col: any) => (
                      <TableCell key={col.key}>{row[col.key] ?? ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {form && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {form.title || 'Form'}
            </Typography>
            <Stack spacing={1.5}>
              {(form.fields || []).map((field: any) => {
                if (field.type === 'checkbox') {
                  return (
                    <FormControlLabel
                      key={field.name}
                      control={<Checkbox size="small" />}
                      label={field.label || field.name}
                    />
                  );
                }
                if (field.type === 'select') {
                  return (
                    <FormControl key={field.name} size="small" fullWidth>
                      <InputLabel>{field.label || field.name}</InputLabel>
                      <Select label={field.label || field.name} defaultValue="">
                        {(field.options || []).map((opt: string) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );
                }
                return (
                  <TextField
                    key={field.name}
                    label={field.label || field.name}
                    size="small"
                    fullWidth
                    type={field.type === 'password' ? 'password' : 'text'}
                    multiline={field.type === 'textarea'}
                    minRows={field.type === 'textarea' ? 3 : undefined}
                  />
                );
              })}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" size="small">
                {form.submitLabel || 'Submit'}
              </Button>
              {form.cancelLabel && (
                <Button variant="outlined" size="small">
                  {form.cancelLabel}
                </Button>
              )}
            </Box>
          </Box>
        )}

        {actions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
            {actions.map((action: any) => (
              <Button key={action.label} variant="outlined" size="small">
                {action.label}
              </Button>
            ))}
          </Box>
        )}

        {suggestions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
            {suggestions.map((s: string) => (
              <Chip key={s} label={s} size="small" />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function AppPreview({ payload }: { payload: any }) {
  const layout = Array.isArray(payload?.layout) ? (payload.layout as AppComponent[]) : [];
  const message = payload?.message ?? null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {layout.length > 0 ? (
        <AppRenderer layout={layout} onAction={() => {}} cardWrap />
      ) : (
        <Typography color="text.secondary">No application layout to preview.</Typography>
      )}
    </Box>
  );
}

function PreviewPanel({ payload, mode }: { payload: any; mode: PreviewMode }) {
  if (!payload) {
    return <Typography color="text.secondary">No preview available.</Typography>;
  }

  const metaLayout = Array.isArray(payload?.metadata?.layout) ? payload.metadata.layout : null;
  const effectivePayload = metaLayout && (!payload?.layout || !Array.isArray(payload.layout))
    ? { ...payload, layout: metaLayout }
    : payload;
  const hasLayout = Array.isArray(effectivePayload?.layout) && effectivePayload.layout.length > 0;

  if (hasLayout || mode === 'application') {
    return (
      <Stack spacing={1.5}>
        <AppPreview payload={effectivePayload} />
      </Stack>
    );
  }

  return <ChatPreview payload={effectivePayload} />;
}

function DiagnosticsPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ severity: 'error' | 'warning'; message: string }>;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {items.map((item, idx) => (
          <Alert key={idx} severity={item.severity} variant="outlined">
            {item.message}
          </Alert>
        ))}
      </Stack>
    </Box>
  );
}

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

  // Blockly builder state
  const [builderVersion, setBuilderVersion] = useState('');
  const [builderChangelog, setBuilderChangelog] = useState('');
  const [blocklyXml, setBlocklyXml] = useState('');
  const [blocklyCode, setBlocklyCode] = useState('');
  const [blockPreviewPayload, setBlockPreviewPayload] = useState<any>(null);
  const [blockPreviewError, setBlockPreviewError] = useState<string | null>(null);
  const [isSavingBuilder, setIsSavingBuilder] = useState(false);
  const [previewSource, setPreviewSource] = useState<'blocks' | 'js'>('blocks');
  const [blockPreviewIntent, setBlockPreviewIntent] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [jsPreviewSource, setJsPreviewSource] = useState('');
  const [jsPreviewIntents, setJsPreviewIntents] = useState<string[]>([]);
  const [jsPreviewIntent, setJsPreviewIntent] = useState('');
  const [jsPreviewPayload, setJsPreviewPayload] = useState<any>(null);
  const [jsPreviewError, setJsPreviewError] = useState<string | null>(null);
  const [blocklyDiagnostics, setBlocklyDiagnostics] = useState<BlocklyDiagnostic[]>([]);
  const [jsErrors, setJsErrors] = useState<string[]>([]);
  const [jsWarnings, setJsWarnings] = useState<string[]>([]);
  const [jsSyntaxError, setJsSyntaxError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | ''>('');
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [autoLoadedDeployed, setAutoLoadedDeployed] = useState(false);

  const cardSx = {
    border: `1px solid ${adminTheme.colors.borderLight}`,
    borderRadius: adminTheme.spacing.borderRadius,
    bgcolor: adminTheme.colors.bgRow,
  };
  const tableHeadCellSx = {
    fontSize: adminTheme.typography.fontSize.xs,
    fontWeight: adminTheme.typography.fontWeight.semibold,
    color: adminTheme.colors.textMedium,
    textTransform: 'uppercase',
    padding: adminTheme.spacing.tableCellPadding,
    borderBottom: `1px solid ${adminTheme.colors.borderLight}`,
  };
  const tableBodyCellSx = {
    fontSize: adminTheme.typography.fontSize.sm,
    color: adminTheme.colors.textDark,
    padding: adminTheme.spacing.tableCellPadding,
    borderBottom: `1px solid ${adminTheme.colors.borderLight}`,
  };


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
  const encodeBlocklyXml = (xml: string) => {
    if (!xml || !xml.trim()) return '';
    if (typeof window === 'undefined') return '';
    try {
      return window.btoa(unescape(encodeURIComponent(xml)));
    } catch {
      return '';
    }
  };

  const decodeBlocklyXml = (encoded: string) => {
    if (!encoded) return null;
    if (typeof window === 'undefined') return null;
    try {
      return decodeURIComponent(escape(window.atob(encoded)));
    } catch {
      return null;
    }
  };

  const extractBlocklyXml = (script: string) => {
    const match = script.match(/\/\*\s*LIDO_BLOCKLY_XML:([A-Za-z0-9+/=]+)\s*\*\//);
    if (!match) return null;
    return decodeBlocklyXml(match[1]);
  };

  const analyzeBotDefinition = (botDef: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!botDef || typeof botDef !== 'object') {
      errors.push('Bot definition was not exported.');
      return { errors, warnings };
    }

    if (!botDef.name) warnings.push('Bot name is missing.');
    if (!botDef.version) warnings.push('Bot version is missing.');

    const intents = botDef.intents;
    if (!intents || typeof intents !== 'object') {
      errors.push('Bot intents are missing or invalid.');
    } else if (Object.keys(intents).length === 0) {
      warnings.push('No intents found in bot definition.');
    }

    return { errors, warnings };
  };

  const applyHelpersToPayload = async (payload: any) => {
    if (!payload || !Array.isArray(payload.__helpers) || payload.__helpers.length === 0) {
      return payload;
    }
    const next = { ...payload };
    delete next.__helpers;
    next.metadata = next.metadata ?? {};

    const context = {
      userId: 'preview',
      organizationId: 'preview',
      conversationId: 'preview',
      messageId: 'preview',
      userMessage: '',
      intent: blockPreviewIntent,
      entities: [],
      metadata: {},
    };
    const helpers = createMockHelpers();

    for (const helper of payload.__helpers) {
      if (!helper) continue;
      if (helper.type === 'fetch') {
        try {
          const res = await fetch(helper.url || '', {
            method: helper.method || 'GET',
            headers: helper.headers || undefined,
            body: helper.body ? (typeof helper.body === 'string' ? helper.body : JSON.stringify(helper.body)) : undefined,
          });
          const data = await res.json().catch(() => null);
          next.metadata[helper.name || 'fetch'] = data;
        } catch (err: any) {
          next.metadata[helper.name || 'fetch'] = null;
        }
      }
      if (helper.type === 'db_select') {
        try {
          const rows = await helpers.db.select(helper.table || '', helper.columns || ['*'], helper.where || {}, helper.options || {});
          next.metadata[helper.name || 'rows'] = rows;
        } catch {
          next.metadata[helper.name || 'rows'] = [];
        }
      }
      if (helper.type === 'db_aggregate') {
        try {
          const result = await helpers.db.aggregate(helper.table || '', helper.aggregations || {}, helper.where || {});
          next.metadata[helper.name || 'stats'] = result;
        } catch {
          next.metadata[helper.name || 'stats'] = {};
        }
      }
      if (helper.type === 'js') {
        const code = helper.code || '';
        if (code.trim()) {
          const fn = new Function('context', 'helpers', 'payload', 'return (async () => {\n' + code + '\n})();');
          await fn(context, helpers, next);
        }
      }
    }

    return next;
  };
  const handleSaveBuilder = async () => {
    if (!builderVersion.trim()) {
      setError('Version number is required');
      return;
    }
    if (!blocklyCode.trim()) {
      setError('Build the script from Blockly before saving');
      return;
    }

    try {
      setIsSavingBuilder(true);
      setError(null);
      const fileName = 'bot-' + botId + '-' + builderVersion.trim() + '.js';
      const xmlEncoded = encodeBlocklyXml(blocklyXml);
      const fileContents = xmlEncoded ? `/* LIDO_BLOCKLY_XML:${xmlEncoded} */
${blocklyCode}` : blocklyCode;
      const file = new File([fileContents], fileName, {
        type: 'text/javascript',
      });
      await botsApi.uploadVersion({
        botId,
        version: builderVersion.trim(),
        changelog: builderChangelog.trim() || undefined,
        scriptFile: file,
      });
      setBuilderVersion('');
      setBuilderChangelog('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save Blockly build');
    } finally {
      setIsSavingBuilder(false);
    }
  };

  const createMockHelpers = () => {
    const formState: any = { title: '', fields: [], submitLabel: 'Submit', cancelLabel: 'Cancel' };
    const tableState: any = { title: '', columns: [], rows: [] };

    const formBuilder = {
      setTitle: (title: string) => { formState.title = title; return formBuilder; },
      addTextField: (name: string, label: string, opts: any = {}) => { formState.fields.push({ type: 'text', name, label, ...opts }); return formBuilder; },
      addEmailField: (name: string, label: string, opts: any = {}) => { formState.fields.push({ type: 'email', name, label, ...opts }); return formBuilder; },
      addTextArea: (name: string, label: string, opts: any = {}) => { formState.fields.push({ type: 'textarea', name, label, ...opts }); return formBuilder; },
      addSelectField: (name: string, label: string, options: any[]) => { formState.fields.push({ type: 'select', name, label, options }); return formBuilder; },
      addCheckbox: (name: string, label: string, opts: any = {}) => { formState.fields.push({ type: 'checkbox', name, label, ...opts }); return formBuilder; },
      setSubmitLabel: (label: string) => { formState.submitLabel = label; return formBuilder; },
      setCancelLabel: (label: string) => { formState.cancelLabel = label; return formBuilder; },
      build: () => ({ ...formState }),
    };

    const tableBuilder = {
      setTitle: (title: string) => { tableState.title = title; return tableBuilder; },
      addColumn: (key: string, label: string, type: string) => { tableState.columns.push({ key, label, type }); return tableBuilder; },
      setRows: (rows: any[]) => { tableState.rows = rows; return tableBuilder; },
      build: () => ({ ...tableState }),
    };

    return {
      form: formBuilder,
      table: tableBuilder,
      suggestions: { generate: (_: string, count: number) => Array.from({ length: count }).map((__, i) => `Suggestion ${i + 1}`) },
      utils: { formatDate: (value: string) => value },
      db: {
        getCurrentUser: async () => ({ first_name: 'Alex', last_name: 'Kim', email: 'alex@lido.com', status: 'Active', created_at: new Date().toISOString() }),
        select: async () => [],
        aggregate: async () => ({}),
      },
    };
  };

  const handleLoadJsPreview = (source?: string) => {
    try {
      setJsPreviewError(null);
      const module: any = { exports: {} };
      const exports = module.exports;
      const scriptSource = source ?? jsPreviewSource;
      const fn = new Function('module', 'exports', 'require', scriptSource);
      fn(module, exports, () => { throw new Error('require not supported in preview'); });
      const botDef = module.exports?.default ?? module.exports;
      if (source) {
        const xml = extractBlocklyXml(source);
        if (xml) {
          setBlocklyXml(xml);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('lido.blockly.' + botId, xml);
          }
          setPreviewSource('blocks');
        }
      }
      const analysis = analyzeBotDefinition(botDef);
      setJsErrors(analysis.errors);
      setJsWarnings(analysis.warnings);
      const intents = botDef?.intents ? Object.keys(botDef.intents) : [];
      setJsPreviewIntents(intents);
      setJsPreviewIntent(intents[0] || '');
      setJsPreviewPayload(null);
    } catch (err: any) {
      setJsPreviewError(err.message || 'Failed to load JS');
      setJsErrors([]);
      setJsWarnings([]);
    }
  };

  const handleLoadVersionScript = async (versionId: number) => {
    try {
      setIsLoadingVersion(true);
      const blob = await botsApi.downloadVersion(botId, versionId);
      const scriptText = await blob.text();
      setJsPreviewSource(scriptText);
      setPreviewSource('js');
      setJsPreviewPayload(null);
      setJsPreviewError(null);
      handleLoadJsPreview(scriptText);
      const xml = extractBlocklyXml(scriptText);
      if (xml) {
        setBlocklyXml(xml);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('lido.blockly.' + botId, xml);
        }
        setPreviewSource('blocks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load version');
    } finally {
      setIsLoadingVersion(false);
    }
  };

  const handleRunJsPreview = async () => {
    try {
      setJsPreviewError(null);
      setJsPreviewPayload(null);
      if (jsSyntaxError) {
        setJsPreviewError(jsSyntaxError);
        return;
      }
      const module: any = { exports: {} };
      const exports = module.exports;
      const fn = new Function('module', 'exports', 'require', jsPreviewSource);
      fn(module, exports, () => { throw new Error('require not supported in preview'); });
      const botDef = module.exports?.default ?? module.exports;
      const intentFn = botDef?.intents?.[jsPreviewIntent];
      if (!intentFn) {
        setJsPreviewError('Intent not found');
        return;
      }
      const payload = await intentFn({ userId: 1 }, createMockHelpers());
      setJsPreviewPayload(payload);
    } catch (err: any) {
      setJsPreviewError(err.message || 'Failed to run preview');
      setJsPreviewPayload(null);
    }
  };

  const previewMode: PreviewMode = settingsType === 'application' ? 'application' : 'chat';
  const blockPayload = blockPreviewIntent && previewData?.intents
    ? previewData.intents[blockPreviewIntent]
    : null;
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (previewSource !== "blocks") return;
      if (!blockPayload) {
        setBlockPreviewPayload(null);
        setBlockPreviewError(null);
        return;
      }
      try {
        const result = await applyHelpersToPayload(blockPayload);
        if (active) {
          setBlockPreviewPayload(result);
          setBlockPreviewError(null);
        }
      } catch (err: any) {
        if (active) {
          setBlockPreviewPayload(blockPayload);
          setBlockPreviewError(err?.message || "Failed to build preview");
        }
      }
    };
    run();
    return () => { active = false; };
  }, [previewSource, blockPayload]);

  const previewPayload = previewSource === 'blocks' ? (blockPreviewPayload ?? blockPayload) : jsPreviewPayload;
  const hasPreviewLayout = Array.isArray(previewPayload?.layout) && previewPayload.layout.length > 0;
  const previewModeLabel = settingsType === 'application'
    ? 'Application'
    : hasPreviewLayout
    ? 'Application'
    : 'Chat';
  const blockDiagnosticItems = [
    ...blocklyDiagnostics.map((item) => ({
      severity: item.severity,
      message: item.message,
    })),
    ...(blockPreviewError ? [{ severity: 'error', message: blockPreviewError }] : []),
  ];
  const jsDiagnosticItems = [
    ...(jsSyntaxError ? [{ severity: 'error', message: jsSyntaxError }] : []),
    ...jsErrors.map((message) => ({ severity: 'error', message })),
    ...jsWarnings.map((message) => ({ severity: 'warning', message })),
    ...(jsPreviewError ? [{ severity: 'error', message: jsPreviewError }] : []),
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Bots">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!bot) {
    return (
      <AdminLayout title="Bots">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">Bot not found</Alert>
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bots">
      <Box sx={{ py: 1 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/bots')}
          sx={{ mb: 3, textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textMedium }}
        >
          Back to Bots
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Bot Info */}
        <Paper sx={{ p: 3, mb: 3, ...cardSx }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={settingsAvatarUrl ?? undefined}
                sx={{ width: 56, height: 56, bgcolor: adminTheme.colors.primary }}
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
                      fontWeight: adminTheme.typography.fontWeight.medium,
                      '& .MuiChip-icon': { fontSize: '14px !important' },
                      fontSize: adminTheme.typography.fontSize.xs,
                      height: 22,
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
            <Tab label="Builder" />
          </Tabs>
        </Box>

        {/* Versions Tab */}
        {tabValue === 0 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.borderLight}`, borderRadius: adminTheme.spacing.borderRadius, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
                  <TableCell sx={tableHeadCellSx}>Version</TableCell>
                  <TableCell sx={tableHeadCellSx}>File Size</TableCell>
                  <TableCell sx={tableHeadCellSx}>Changelog</TableCell>
                  <TableCell sx={tableHeadCellSx}>Status</TableCell>
                  <TableCell sx={tableHeadCellSx}>Created</TableCell>
                  <TableCell align="right" sx={tableHeadCellSx}>Actions</TableCell>
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
                      <TableCell sx={tableBodyCellSx}>
                        <Chip label={version.version} size="small" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }} />
                      </TableCell>
                      <TableCell sx={tableBodyCellSx}>{(version.file_size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell sx={tableBodyCellSx}>{version.changelog || '-'}</TableCell>
                      <TableCell sx={tableBodyCellSx}>
                        {version.is_deployed ? (
                          <Chip label="Deployed" color="success" size="small" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }} />
                        ) : (
                          <Chip label="Not Deployed" size="small" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell sx={tableBodyCellSx}>
                        {new Date(version.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right" sx={tableBodyCellSx}>
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
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.borderLight}`, borderRadius: adminTheme.spacing.borderRadius, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
                  <TableCell sx={tableHeadCellSx}>Version</TableCell>
                  <TableCell sx={tableHeadCellSx}>Deployed By</TableCell>
                  <TableCell sx={tableHeadCellSx}>Status</TableCell>
                  <TableCell sx={tableHeadCellSx}>Deployed At</TableCell>
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
                      <TableCell sx={tableBodyCellSx}>
                        <Chip label={deployment.version} size="small" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22 }} />
                      </TableCell>
                      <TableCell sx={tableBodyCellSx}>{deployment.deployed_by_email}</TableCell>
                      <TableCell sx={tableBodyCellSx}>
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
                      <TableCell sx={tableBodyCellSx}>
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
          <Paper sx={{ p: 4, maxWidth: 720, ...cardSx }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: adminTheme.typography.fontWeight.semibold, fontSize: adminTheme.typography.fontSize.lg, color: adminTheme.colors.textDark }}>
              Bot Settings
            </Typography>

            {/* Type */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textDark }}>
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
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textDark }}>
              Avatar
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={settingsAvatarPreview ?? settingsAvatarUrl ?? undefined}
                sx={{ width: 72, height: 72, bgcolor: adminTheme.colors.primary, cursor: 'pointer' }}
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
              size="small"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Internal identifier name"
            />
            <TextField
              fullWidth
              label="Display Name"
              size="small"
              value={settingsDisplayName}
              onChange={(e) => setSettingsDisplayName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Friendly name shown to users"
            />
            <TextField
              fullWidth
              label="Description"
              size="small"
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

        {/* Builder Tab */}
        {tabValue === 3 && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Blockly Builder
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Build visually and generate bot JavaScript.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                  gap: 2,
                }}
              >
                <Box sx={{ minHeight: 520, borderRadius: 2, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  <BlocklyEditor
                    initialXml={blocklyXml}
                    onXmlChange={(xml) => {
                      setBlocklyXml(xml);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('lido.blockly.' + botId, xml);
                      }
                    }}
                    onCodeChange={(code) => setBlocklyCode(code)}
                    onPreviewChange={(data) => {
                      setPreviewData(data);
                      const keys = data?.intents ? Object.keys(data.intents) : [];
                      setBlockPreviewIntent((prev) => prev || keys[0] || '');
                    }}
                    onDiagnosticsChange={(items) => setBlocklyDiagnostics(items)}
                  />
                </Box>

                <Stack spacing={2}>
                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          Live Preview
                        </Typography>
                        <Chip
                          size="small"
                          label={previewModeLabel}
                          sx={{ bgcolor: '#E8F1FF', color: '#1E5BD8', fontWeight: 600 }}
                        />
                      </Box>

                      <ToggleButtonGroup
                        size="small"
                        value={previewSource}
                        exclusive
                        onChange={(_, value) => value && setPreviewSource(value)}
                      >
                        <ToggleButton value="blocks">Blocks</ToggleButton>
                        <ToggleButton value="js">JS</ToggleButton>
                      </ToggleButtonGroup>

                      {previewSource === 'blocks' && (
                        <FormControl size="small" fullWidth>
                          <InputLabel>Intent</InputLabel>
                          <Select
                            label="Intent"
                            value={blockPreviewIntent}
                            onChange={(e) => setBlockPreviewIntent(e.target.value)}
                          >
                            {(previewData?.intents ? Object.keys(previewData.intents) : []).map((intent) => (
                              <MenuItem key={intent} value={intent}>
                                {intent}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {previewSource === 'js' && jsPreviewIntents.length > 0 && (
                        <FormControl size="small" fullWidth>
                          <InputLabel>Intent</InputLabel>
                          <Select
                            label="Intent"
                            value={jsPreviewIntent}
                            onChange={(e) => setJsPreviewIntent(e.target.value)}
                          >
                            {jsPreviewIntents.map((intent) => (
                              <MenuItem key={intent} value={intent}>
                                {intent}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      <Box
                        sx={{
                          border: '1px solid #E5E7EB',
                          borderRadius: 2,
                          p: 2,
                          bgcolor: '#F8FAFC',
                          minHeight: 340,
                          maxHeight: 520,
                          overflow: 'auto',
                        }}
                      >
                        <PreviewPanel payload={previewPayload} mode={previewMode} />
                      </Box>
                    </Stack>
                  </Paper>

                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Builder Output
                      </Typography>
                      <TextField
                        label="Generated JS"
                        value={blocklyCode}
                        multiline
                        minRows={8}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                      <DiagnosticsPanel title="Block Warnings" items={blockDiagnosticItems} />
                      <TextField
                        label="Version"
                        value={builderVersion}
                        onChange={(e) => setBuilderVersion(e.target.value)}
                        placeholder="1.0.0"
                        fullWidth
                      />
                      <TextField
                        label="Changelog"
                        value={builderChangelog}
                        onChange={(e) => setBuilderChangelog(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                      />
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveBuilder}
                        disabled={isSavingBuilder || !builderVersion.trim()}
                      >
                        {isSavingBuilder ? 'Saving...' : 'Save as New Version'}
                      </Button>
                    </Stack>
                  </Paper>

                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        JS Preview Loader
                      </Typography>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Load From Version</InputLabel>
                        <Select
                          label="Load From Version"
                          value={selectedVersionId}
                          onChange={(e) => setSelectedVersionId(e.target.value as number | '')}
                        >
                          <MenuItem value="">Select version</MenuItem>
                          {versions.map((version) => (
                            <MenuItem key={version.id} value={version.id}>
                              {version.version}{version.is_deployed ? ' (deployed)' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        disabled={!selectedVersionId || isLoadingVersion}
                        onClick={() => {
                          if (selectedVersionId) handleLoadVersionScript(Number(selectedVersionId));
                        }}
                      >
                        {isLoadingVersion ? 'Loading...' : 'Load Version'}
                      </Button>
                      <TextField
                        label="Paste Bot JS"
                        value={jsPreviewSource}
                        onChange={(e) => setJsPreviewSource(e.target.value)}
                        multiline
                        minRows={6}
                        maxRows={16}
                        fullWidth
                        InputProps={{
                          sx: {
                            maxHeight: 360,
                            overflow: 'auto',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => handleLoadJsPreview()}>
                          Load JS
                        </Button>
                        <Button variant="text" onClick={() => setJsPreviewSource(blocklyCode)}>
                          Use Generated JS
                        </Button>
                      </Box>
                      {jsPreviewIntents.length > 0 && (
                        <FormControl size="small" fullWidth>
                          <InputLabel>Intent</InputLabel>
                          <Select
                            label="Intent"
                            value={jsPreviewIntent}
                            onChange={(e) => setJsPreviewIntent(e.target.value)}
                          >
                            {jsPreviewIntents.map((intent) => (
                              <MenuItem key={intent} value={intent}>
                                {intent}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <Button variant="contained" onClick={handleRunJsPreview}>
                        Preview Intent
                      </Button>
                      <DiagnosticsPanel title="JS Diagnostics" items={jsDiagnosticItems} />
                    </Stack>
                  </Paper>
                </Stack>
              </Box>
            </Stack>
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
      </Box>
    </AdminLayout>
  );
}





































