import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Badge,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import {
  chatApi,
  type Message,
  type Conversation,
  type ActiveBot,
  type FormDefinition,
  type TableDefinition,
  type BotAction,
  type BotMessageMetadata,
  type BotMessagePayload,
} from '../../lib/api/chat';
import socketClient from '../../lib/socket';

// ─── BotForm ──────────────────────────────────────────────────────────────────

function BotForm({
  form,
  onSubmit,
  onCancel,
}: {
  form: FormDefinition;
  onSubmit: (summary: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    form.fields.forEach((f) => { init[f.name] = f.defaultValue ?? ''; });
    return init;
  });

  const set = (name: string, value: any) => setValues((p) => ({ ...p, [name]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const summary = form.fields
      .filter((f) => !f.disabled)
      .map((f) => `${f.label}: ${values[f.name] ?? ''}`)
      .join(', ');
    onSubmit(`[${form.title}] ${summary}`);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ mt: 1, p: 2, border: '1px solid #e7e7ff', borderRadius: 2, bgcolor: '#fff',
            display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 260 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#566a7f' }}>
        {form.title}
      </Typography>

      {form.fields.map((field) => {
        if (field.type === 'select') {
          return (
            <FormControl key={field.name} size="small" required={field.required} disabled={field.disabled}>
              <InputLabel>{field.label}</InputLabel>
              <Select label={field.label} value={values[field.name] ?? ''}
                      onChange={(e) => set(field.name, e.target.value)}>
                {(field.options ?? []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
        if (field.type === 'checkbox') {
          return (
            <FormControlLabel key={field.name}
              control={<Checkbox size="small" checked={!!values[field.name]}
                                 onChange={(e) => set(field.name, e.target.checked)}
                                 required={field.required} />}
              label={<Typography variant="body2">{field.label}</Typography>}
            />
          );
        }
        return (
          <TextField key={field.name} label={field.label} size="small"
            type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
            multiline={field.type === 'textarea'} minRows={field.type === 'textarea' ? 2 : undefined}
            required={field.required} disabled={field.disabled}
            placeholder={field.placeholder}
            value={values[field.name] ?? ''}
            onChange={(e) => set(field.name, e.target.value)}
          />
        );
      })}

      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Button type="submit" variant="contained" size="small"
                sx={{ bgcolor: '#696cff', '&:hover': { bgcolor: '#5f61e6' } }}>
          {form.submitLabel ?? 'Submit'}
        </Button>
        <Button type="button" variant="outlined" size="small" onClick={onCancel}>
          {form.cancelLabel ?? 'Cancel'}
        </Button>
      </Box>
    </Box>
  );
}

// ─── BotTable ─────────────────────────────────────────────────────────────────

function BotTable({ table }: { table: TableDefinition }) {
  return (
    <Box sx={{ mt: 1, overflowX: 'auto' }}>
      {table.title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#566a7f', mb: 0.5 }}>
          {table.title}
        </Typography>
      )}
      <Table size="small" sx={{ border: '1px solid #e7e7ff', borderRadius: 1 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f5f9' }}>
            {table.columns.map((col) => (
              <TableCell key={col.key} sx={{ fontWeight: 700, color: '#566a7f', fontSize: '0.78rem', py: 0.8 }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {table.rows.map((row, i) => (
            <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
              {table.columns.map((col) => (
                <TableCell key={col.key} sx={{ fontSize: '0.82rem', py: 0.7, color: '#566a7f' }}>
                  {String(row[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ─── BotActions ───────────────────────────────────────────────────────────────

function BotActions({ actions, onAction }: { actions: BotAction[]; onAction: (label: string) => void }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
      {actions.map((a) => (
        <Button key={a.value} size="small" variant="outlined" onClick={() => onAction(a.label)}
          sx={{ fontSize: '0.75rem', borderColor: '#696cff', color: '#696cff', textTransform: 'none',
                '&:hover': { bgcolor: '#696cff', color: '#fff' } }}>
          {a.label}
        </Button>
      ))}
    </Box>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBot, setActiveBot] = useState<ActiveBot | null>(null);
  const [dismissedForms, setDismissedForms] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  // ── Keep global suggestion chips up-to-date from last bot reply ──────────
  const refreshSuggestions = useCallback((msgs: Message[]) => {
    const last = [...msgs].reverse().find((m) => m.sender_type === 'bot');
    const sug = last?.metadata?.suggestions ?? last?.nlp_suggestions ?? [];
    setSuggestions(Array.isArray(sug) ? sug : []);
  }, []);

  // ── Initialize: active bot + conversation + messages + socket ────────────
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setIsLoading(true);

        // Load the currently deployed bot for this org
        const bot = await chatApi.getActiveBot().catch(() => null);
        if (mounted) setActiveBot(bot);

        // Create or reuse a user_bot conversation
        const conv = await chatApi.createConversation({ type: 'user_bot' });
        if (!mounted) return;
        setConversation(conv);

        // Load previous messages (includes bot greeting stored during createConversation)
        const msgs = await chatApi.getMessages(conv.uuid);
        if (!mounted) return;
        // Pre-populate seenIds so Socket.IO never re-adds a message already in history
        msgs.forEach((m) => seenIds.current.add(m.uuid));
        setMessages(msgs);
        refreshSuggestions(msgs);

        // Connect Socket.IO
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
        const sock = socketClient.initialize({
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
          token,
        });
        socketRef.current = sock;

        sock.emit('chat:join', { conversationId: conv.uuid });

        sock.on('chat:message', (msg: Message) => {
          if (!mounted) return;
          // User messages are added optimistically — skip to prevent duplicates
          if (msg.sender_type === 'user') return;
          setMessages((prev) => {
            if (seenIds.current.has(msg.uuid)) return prev;
            seenIds.current.add(msg.uuid);
            const next = [...prev, msg];
            refreshSuggestions(next);
            return next;
          });
          setIsTyping(false);
        });

        sock.on('chat:typing', () => {
          if (!mounted) return;
          setIsTyping(true);
          setTimeout(() => { if (mounted) setIsTyping(false); }, 3000);
        });

        setError(null);
      } catch (err: any) {
        if (mounted) setError(`Failed to initialize chat: ${err?.message ?? String(err)}`);
        console.error('Chat init error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
      const sock = socketRef.current;
      if (sock) {
        sock.off('chat:message');
        sock.off('chat:typing');
        socketClient.disconnect();
        socketRef.current = null;
      }
    };
  }, [refreshSuggestions]);

  // ── Send a message (optimistic UI) ───────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversation || isSending) return;

      setInput('');
      setIsSending(true);

      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        uuid: tempId,
        sender_type: 'user',
        content: trimmed,
        content_type: 'text',
        created_at: new Date().toISOString(),
      };
      seenIds.current.add(tempId);
      setMessages((prev) => [...prev, tempMsg]);
      setIsTyping(true);

      socketRef.current?.emit('chat:typing', {
        conversationId: conversation.uuid,
        isTyping: true,
      });

      try {
        const result = await chatApi.sendMessage({
          conversationUuid: conversation.uuid,
          content: trimmed,
        });
        if (result?.data?.messageId) {
          seenIds.current.add(result.data.messageId);
          setMessages((prev) =>
            prev.map((m) => (m.uuid === tempId ? { ...m, uuid: result.data.messageId } : m)),
          );
        }
        // Fallback: add bot response directly from HTTP response
        // if Socket.IO hasn't delivered it yet (race condition protection)
        const bm: BotMessagePayload | null | undefined = result?.data?.botMessage;
        if (bm && !seenIds.current.has(bm.uuid)) {
          seenIds.current.add(bm.uuid);
          const botMsg: Message = {
            uuid: bm.uuid,
            sender_type: 'bot',
            content: bm.content,
            content_type: bm.content_type,
            metadata: bm.metadata,
            created_at: bm.created_at,
          };
          setMessages((prev) => {
            const next = [...prev, botMsg];
            refreshSuggestions(next);
            return next;
          });
          setIsTyping(false);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setError('Failed to send message. Please try again.');
        setMessages((prev) => prev.filter((m) => m.uuid !== tempId));
        setIsTyping(false);
      } finally {
        setIsSending(false);
      }
    },
    [conversation, isSending],
  );

  // ── Render a single message bubble ───────────────────────────────────────
  const renderMessage = (msg: Message) => {
    const isBot = msg.sender_type === 'bot';
    const meta: BotMessageMetadata = (msg.metadata as BotMessageMetadata) ?? {};
    const msgSuggestions: string[] = meta.suggestions ?? msg.nlp_suggestions ?? [];

    return (
      <Box
        key={msg.uuid}
        sx={{
          display: 'flex',
          flexDirection: isBot ? 'row' : 'row-reverse',
          alignItems: 'flex-start',
          gap: 1,
          mb: 2,
        }}
      >
        <Avatar
          sx={{
            bgcolor: isBot ? '#696cff' : 'secondary.main',
            width: 34,
            height: 34,
            flexShrink: 0,
          }}
        >
          {isBot ? <SmartToyIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
        </Avatar>

        <Box sx={{ maxWidth: '72%' }}>
          {/* Message text bubble */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: isBot ? '#f5f5f9' : '#696cff',
              color: isBot ? 'text.primary' : '#fff',
              borderRadius: 2,
              border: isBot ? '1px solid #e7e7ff' : 'none',
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {msg.content}
            </Typography>
          </Paper>

          {/* Rich content: table */}
          {isBot && meta.table && <BotTable table={meta.table} />}

          {/* Rich content: form (dismissible) */}
          {isBot && meta.form && !dismissedForms.has(msg.uuid) && (
            <BotForm
              form={meta.form}
              onSubmit={(summary) => {
                setDismissedForms((p) => new Set(p).add(msg.uuid));
                sendMessage(summary);
              }}
              onCancel={() => setDismissedForms((p) => new Set(p).add(msg.uuid))}
            />
          )}

          {/* Rich content: quick-action buttons */}
          {isBot && meta.actions && meta.actions.length > 0 && (
            <BotActions actions={meta.actions} onAction={sendMessage} />
          )}

          {/* Per-message suggestion chips */}
          {isBot && msgSuggestions.length > 0 && (
            <Box sx={{ mt: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {msgSuggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={s}
                  size="small"
                  variant="outlined"
                  onClick={() => sendMessage(s)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    borderColor: '#696cff',
                    color: '#696cff',
                    '&:hover': { bgcolor: '#696cff', color: '#fff' },
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 0.4, display: 'block' }}
          >
            {new Date(msg.created_at).toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    );
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout>
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}
        >
          <CircularProgress sx={{ color: '#696cff' }} />
        </Box>
      </DashboardLayout>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          px: 3,
          pt: 2,
          pb: 0,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}
        >
          <SmartToyIcon sx={{ color: '#696cff', fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#566a7f', flexGrow: 1 }}
          >
            Lido Connect Chat
          </Typography>

          {activeBot ? (
            <Tooltip title={`Storage key: ${activeBot.storage_key}`} arrow>
              <Chip
                icon={
                  <FiberManualRecordIcon
                    sx={{ fontSize: '10px !important', color: '#71dd37 !important' }}
                  />
                }
                label={`${activeBot.name} v${activeBot.version}`}
                size="small"
                sx={{
                  bgcolor: '#e8fcd4',
                  color: '#71dd37',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  border: '1px solid #71dd37',
                }}
              />
            </Tooltip>
          ) : (
            <Chip
              icon={
                <FiberManualRecordIcon
                  sx={{ fontSize: '10px !important', color: '#a8b0b9 !important' }}
                />
              }
              label="No bot active"
              size="small"
              sx={{
                bgcolor: '#f5f5f9',
                color: '#a8b0b9',
                fontSize: '0.75rem',
                border: '1px solid #e0e0e0',
              }}
            />
          )}
        </Box>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* ── No-bot warning ───────────────────────────────────────────────── */}
        {!activeBot && (
          <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }}>
            No bot is currently deployed. Deploy a bot from the Bots page to enable AI responses.
          </Alert>
        )}

        {/* ── Chat paper ───────────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e7e7ff',
            borderRadius: 3,
          }}
        >
          {/* Messages scroll area */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pt: 6,
                  gap: 1,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 56, color: '#d4d5ff' }} />
                <Typography variant="h6" color="text.disabled">
                  {activeBot
                    ? `Hi! I'm ${activeBot.name}. How can I help?`
                    : 'Start a conversation below.'}
                </Typography>
              </Box>
            ) : (
              messages.map(renderMessage)
            )}

            {/* Typing indicator */}
            {isTyping && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#696cff', width: 34, height: 34 }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: '#f5f5f9',
                    border: '1px solid #e7e7ff',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    typing…
                  </Typography>
                </Paper>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* ── Global suggestion chips ──────────────────────────────────── */}
          {suggestions.length > 0 && (
            <Box
              sx={{
                px: 2,
                py: 1,
                borderTop: '1px solid #f0f0f7',
                display: 'flex',
                gap: 0.75,
                flexWrap: 'wrap',
                bgcolor: '#fafaff',
              }}
            >
              {suggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={s}
                  size="small"
                  onClick={() => sendMessage(s)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    bgcolor: '#fff',
                    border: '1px solid #696cff',
                    color: '#696cff',
                    '&:hover': { bgcolor: '#696cff', color: '#fff' },
                  }}
                />
              ))}
            </Box>
          )}

          {/* ── Input bar ────────────────────────────────────────────────── */}
          <Box
            sx={{
              p: 1.5,
              borderTop: '1px solid #e7e7ff',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
              bgcolor: '#fff',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder={
                activeBot ? `Ask ${activeBot.name} anything…` : 'Type a message…'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={isSending || !conversation}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e7e7ff' },
                  '&:hover fieldset': { borderColor: '#696cff' },
                  '&.Mui-focused fieldset': { borderColor: '#696cff' },
                },
              }}
            />
            <IconButton
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isSending || !conversation}
              sx={{
                bgcolor: '#696cff',
                color: '#fff',
                borderRadius: 2,
                width: 40,
                height: 40,
                flexShrink: 0,
                '&:hover': { bgcolor: '#5f61e6' },
                '&.Mui-disabled': { bgcolor: '#e7e7ff', color: '#a8b0b9' },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
