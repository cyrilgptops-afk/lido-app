/**
 * Bot Log Viewer
 * Version: 1.0.0
 *
 * Reads the daily bot execution log from GET /bots/logs and renders
 * a rich analytics dashboard: KPI cards, execution timeline, API fetch
 * performance, per-bot drilldown, and a raw log browser.
 *
 * Intents:
 *   init              — today's dashboard (KPIs + charts + recent activity)
 *   view_executions   — full paginated execution table     (params: { date?, page?, botName? })
 *   view_fetches      — API fetch log + latency stats      (params: { date?, page?, botId? })
 *   view_bot_detail   — per-bot summary + intent breakdown (params: { botName, date? })
 *   view_raw_log      — paginated raw NDJSON entries       (params: { date?, page?, event? })
 *   select_date       — switch to another log date         (params: { date })
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE   = 'http://localhost:4000';
const PAGE_SIZE  = 20;

// ─── Auth helper ──────────────────────────────────────────────────────────────
// The bot context exposes context.token for authenticated API calls
function authHeader(context) {
  return context.token ? { 'Authorization': `Bearer ${context.token}` } : {};
}

// ─── Fetch log data ───────────────────────────────────────────────────────────
async function fetchLog(context, date) {
  const qs   = date ? `?date=${date}` : '';
  const resp = await fetch(`${API_BASE}/bots/logs${qs}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(context) },
  });
  if (!resp.ok) throw new Error(`Log API returned HTTP ${resp.status}`);
  const body = await resp.json();
  if (!body.success) throw new Error(body.error?.message || 'Failed to load logs');
  return body.data; // { date, availableDates, entries, summary }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTs(iso) {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 19);
}

function fmtMs(ms) {
  if (ms == null) return '—';
  return `${ms} ms`;
}

function latencyColor(ms) {
  if (ms == null) return 'default';
  if (ms  <  500) return 'success';
  if (ms  < 2000) return 'warning';
  return 'error';
}

function execColor(ms) {
  if (ms == null) return 'default';
  if (ms  <  100) return 'success';
  if (ms  < 2000) return 'warning';
  return 'error';
}

/** Group entries by botName */
function groupByBot(entries) {
  const map = {};
  entries.forEach(e => {
    const key = e.botName || e.botId || 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });
  return map;
}

/** Compute latency stats from an array of ms values */
function latencyStats(values) {
  if (!values.length) return { min: null, avg: null, p95: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    avg: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length),
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1],
    max: sorted[sorted.length - 1],
  };
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
  name   : 'Bot Log Viewer',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[BotLogViewer] init user=${context.userId}`);
  },

  intents: {

    // ── Today's dashboard ────────────────────────────────────────────────────
    init: async (context) => {
      const date = context.metadata?.date || null;
      let logData;

      try {
        logData = await fetchLog(context, date);
      } catch (err) {
        return {
          layout: [{
            type    : 'alert',
            severity: 'error',
            title   : 'Failed to load bot logs',
            message : err.message,
          }],
        };
      }

      const { entries, summary, availableDates } = logData;
      const displayDate = logData.date;

      // ── Parse entry types ──────────────────────────────────────────────
      const executions  = entries.filter(e => e.event === 'bot.execute');
      const fetches     = entries.filter(e => e.event === 'bot.fetch');
      const loads       = entries.filter(e => e.event === 'bot.load');
      const scriptLogs  = entries.filter(e => e.event === 'bot.script_log');
      const errors      = entries.filter(e => e.success === false);

      // ── Bot breakdown ─────────────────────────────────────────────────
      const botGroups   = groupByBot(executions);
      const uniqueBots  = Object.keys(botGroups);

      // ── Execution time stats ──────────────────────────────────────────
      const execMs    = executions.map(e => e.executionTimeMs).filter(v => v != null);
      const execStats = latencyStats(execMs);

      // ── Fetch latency stats ───────────────────────────────────────────
      const fetchMs    = fetches.map(f => f.latencyMs).filter(v => v != null);
      const fetchStats = latencyStats(fetchMs);

      // ── Recent activity (last 8) ──────────────────────────────────────
      const recent = entries.slice(-8).reverse();

      // ── Intent frequency ──────────────────────────────────────────────
      const intentCount = {};
      executions.forEach(e => {
        intentCount[e.intent] = (intentCount[e.intent] || 0) + 1;
      });
      const topIntents = Object.entries(intentCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6);

      // ── Unique fetch URLs ─────────────────────────────────────────────
      const urlCount = {};
      fetches.forEach(f => {
        const url = (f.url || '').split('?')[0];
        urlCount[url] = (urlCount[url] || 0) + 1;
      });
      const topUrls = Object.entries(urlCount).sort(([, a], [, b]) => b - a).slice(0, 5);

      return {
        layout: [
          // ── Header ──────────────────────────────────────────────────
          {
            type    : 'text',
            content : `# 📋 Bot Log Viewer — ${displayDate}`,
            markdown: true,
          },

          // Date switcher (if multiple logs available)
          ...(availableDates.length > 1 ? [{
            type    : 'text',
            content : `> 📅 **Other dates:** ${availableDates.slice(0, 8).map(d =>
              d === displayDate ? `**${d}**` : d
            ).join('  ·  ')}`,
            markdown: true,
          }] : []),

          // No data state
          ...(entries.length === 0 ? [{
            type    : 'alert',
            severity: 'info',
            title   : 'No log entries for this date',
            message : availableDates.length > 0
              ? `Try one of the available dates: ${availableDates.slice(0, 5).join(', ')}`
              : 'No log files found.',
          }] : []),

          // ── Top KPI row ──────────────────────────────────────────────
          ...(entries.length > 0 ? [{
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Events',
                  value   : summary.total,
                  icon    : 'Article',
                  color   : 'primary',
                  subtitle: `${displayDate}`,
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'Executions',
                  value   : summary.executions,
                  icon    : 'PlayArrow',
                  color   : 'info',
                  subtitle: `${uniqueBots.length} bot${uniqueBots.length !== 1 ? 's' : ''}`,
                  action  : { label: 'View', intent: 'view_executions', params: { date: displayDate } },
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'API Fetches',
                  value   : summary.fetches,
                  icon    : 'Http',
                  color   : 'warning',
                  subtitle: `avg ${fmtMs(fetchStats.avg)}`,
                  action  : { label: 'View', intent: 'view_fetches', params: { date: displayDate } },
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg Exec Time',
                  value   : fmtMs(execStats.avg),
                  icon    : 'Speed',
                  color   : execColor(execStats.avg),
                  subtitle: `p95: ${fmtMs(execStats.p95)}`,
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'Bot Loads',
                  value   : summary.loads,
                  icon    : 'CloudDownload',
                  color   : 'secondary',
                  subtitle: 'script loads',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type    : 'stat_card',
                  title   : 'Errors',
                  value   : errors.length,
                  icon    : 'ErrorOutline',
                  color   : errors.length === 0 ? 'success' : 'error',
                  subtitle: errors.length === 0 ? 'All healthy ✓' : `${errors.length} failures`,
                }],
              },
            ],
          }] : []),

          // ── Per-bot activity table ────────────────────────────────────
          ...(uniqueBots.length > 0 ? [{
            type   : 'data_table',
            title  : 'Bot Activity Summary',
            columns: [
              { field: 'botName',    label: 'Bot',          align: 'left'   },
              { field: 'execCount',  label: 'Executions',   align: 'center' },
              { field: 'avgExecMs',  label: 'Avg Exec ms',  align: 'center' },
              { field: 'maxExecMs',  label: 'Max Exec ms',  align: 'center' },
              { field: 'topIntent',  label: 'Top Intent',   align: 'left'   },
              { field: 'errors',     label: 'Errors',       align: 'center' },
              {
                field  : '_actions', label: 'Drill Down', align: 'center',
                actions: [{ label: 'View', intent: 'view_bot_detail', params: { botName: '{{row.botName}}', date: displayDate } }],
              },
            ],
            rows: uniqueBots.map(botName => {
              const botExecs   = botGroups[botName];
              const ms         = botExecs.map(e => e.executionTimeMs).filter(v => v != null);
              const stats      = latencyStats(ms);
              const intents    = {};
              botExecs.forEach(e => { intents[e.intent] = (intents[e.intent] || 0) + 1; });
              const topIntent  = Object.entries(intents).sort(([,a],[,b]) => b-a)[0]?.[0] || '—';
              const errCount   = botExecs.filter(e => e.success === false).length;
              return {
                botName,
                execCount : botExecs.length,
                avgExecMs : stats.avg != null ? `${stats.avg} ms` : '—',
                maxExecMs : stats.max != null ? `${stats.max} ms` : '—',
                topIntent,
                errors    : errCount,
              };
            }),
            emptyMessage: 'No executions logged.',
          }] : []),

          // ── Two-column: Top Intents + Top Fetch URLs ──────────────────
          ...(topIntents.length > 0 || topUrls.length > 0 ? [{
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6,
                components: [{
                  type   : 'data_table',
                  title  : 'Top Intents Called',
                  columns: [
                    { field: 'intent', label: 'Intent', align: 'left'   },
                    { field: 'count',  label: 'Calls',  align: 'center' },
                  ],
                  rows        : topIntents.map(([intent, count]) => ({ intent, count })),
                  emptyMessage: 'No executions.',
                }],
              },
              {
                xs: 12, sm: 6,
                components: [{
                  type   : 'data_table',
                  title  : 'Top External API Endpoints',
                  columns: [
                    { field: 'url',   label: 'URL',   align: 'left'   },
                    { field: 'calls', label: 'Calls', align: 'center' },
                  ],
                  rows        : topUrls.map(([url, calls]) => ({ url, calls })),
                  emptyMessage: 'No fetches.',
                }],
              },
            ],
          }] : []),

          // ── Fetch latency stats row ───────────────────────────────────
          ...(fetches.length > 0 ? [{
            type    : 'text',
            content : '### ⚡ API Fetch Performance',
            markdown: true,
          }, {
            type   : 'grid',
            spacing: 2,
            columns: [
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Min Latency',  value: fmtMs(fetchStats.min), icon: 'KeyboardArrowDown', color: 'success',            subtitle: 'fastest fetch' }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Avg Latency',  value: fmtMs(fetchStats.avg), icon: 'Speed',             color: latencyColor(fetchStats.avg), subtitle: 'mean'  }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'P95 Latency',  value: fmtMs(fetchStats.p95), icon: 'TrendingUp',        color: latencyColor(fetchStats.p95), subtitle: '95th pct' }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Max Latency',  value: fmtMs(fetchStats.max), icon: 'KeyboardArrowUp',   color: latencyColor(fetchStats.max), subtitle: 'slowest fetch' }] },
            ],
          }] : []),

          // ── Recent events ─────────────────────────────────────────────
          ...(recent.length > 0 ? [{
            type   : 'data_table',
            title  : 'Recent Events (last 8)',
            columns: [
              { field: 'ts',      label: 'Time',      align: 'left'   },
              { field: 'event',   label: 'Event',     align: 'center' },
              { field: 'bot',     label: 'Bot',       align: 'left'   },
              { field: 'detail',  label: 'Detail',    align: 'left'   },
              { field: 'ms',      label: 'ms',        align: 'center' },
              {
                field: 'ok', label: 'Status', align: 'center',
                chip : { colorMap: { '✓': 'success', '✗': 'error', '—': 'default' } },
              },
            ],
            rows: recent.map(e => ({
              ts    : fmtTs(e.ts),
              event : e.event?.replace('bot.', '') || '—',
              bot   : e.botName || e.botId?.split('/')[0] || '—',
              detail: e.intent || e.url?.split('?')[0].split('/').slice(-2).join('/') || e.message || '—',
              ms    : e.executionTimeMs != null ? e.executionTimeMs
                    : e.latencyMs        != null ? e.latencyMs : null,
              ok    : e.success === true  ? '✓'
                    : e.success === false ? '✗' : '—',
            })),
            emptyMessage: 'No recent events.',
          }] : []),

          // ── Action buttons ────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '▶ Executions',
                  intent: 'view_executions', params: { date: displayDate },
                  variant: 'outlined', color: 'primary', icon: 'PlayArrow', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '🌐 API Fetches',
                  intent: 'view_fetches', params: { date: displayDate },
                  variant: 'outlined', color: 'warning', icon: 'Http', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '📄 Raw Log',
                  intent: 'view_raw_log', params: { date: displayDate },
                  variant: 'outlined', color: 'info', icon: 'Article', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '🔄 Refresh',
                  intent: 'init', params: { date: displayDate },
                  variant: 'outlined', color: 'secondary', icon: 'Refresh', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Paginated execution table ────────────────────────────────────────────
    view_executions: async (context) => {
      const date    = context.metadata?.date || null;
      const page    = Math.max(1, Number(context.metadata?.page || 1));
      const filter  = context.metadata?.botName || null;

      let logData;
      try { logData = await fetchLog(context, date); }
      catch (err) {
        return { layout: [{ type: 'alert', severity: 'error', message: err.message, action: { label: '← Dashboard', intent: 'init' } }] };
      }

      const { entries } = logData;
      const displayDate = logData.date;

      let executions = entries.filter(e => e.event === 'bot.execute');
      if (filter) executions = executions.filter(e => e.botName === filter);
      executions = executions.reverse(); // newest first

      const total      = executions.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRows   = executions.slice(offset, offset + PAGE_SIZE);

      // Unique bot names for filter hint
      const allBots = [...new Set(entries.filter(e => e.event === 'bot.execute').map(e => e.botName))].filter(Boolean);

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## ▶ Executions — ${displayDate}${filter ? `  ·  ${filter}` : ''}  (${total})`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{ type: 'action_button', label: '← Dashboard', intent: 'init', params: { date: displayDate }, variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true }],
              },
            ],
          },

          // Per-bot filter chips
          ...(allBots.length > 1 ? [{
            type   : 'grid',
            spacing: 1,
            columns: [
              {
                xs: 12,
                components: [{
                  type    : 'text',
                  content : `**Filter by bot:** ${allBots.map(b => b === filter ? `**${b}**` : b).join('  ·  ')}`,
                  markdown: true,
                }],
              },
            ],
          }] : []),

          {
            type   : 'data_table',
            title  : `Executions — page ${page}/${totalPages}`,
            columns: [
              { field: 'ts',          label: 'Timestamp',   align: 'left'   },
              { field: 'bot',         label: 'Bot',         align: 'left'   },
              { field: 'intent',      label: 'Intent',      align: 'left'   },
              { field: 'execMs',      label: 'Exec ms',     align: 'center' },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { '✓ OK': 'success', '✗ Error': 'error' } },
              },
              { field: 'convId',   label: 'Conversation', align: 'left'   },
            ],
            rows: pageRows.map(e => ({
              ts      : fmtTs(e.ts),
              bot     : e.botName || e.botId,
              intent  : e.intent,
              execMs  : e.executionTimeMs != null ? `${e.executionTimeMs} ms` : '—',
              result  : e.success !== false ? '✓ OK' : '✗ Error',
              convId  : e.conversationId || '—',
            })),
            pagination  : { page, pageSize: PAGE_SIZE, total, intent: 'view_executions', params: { date: displayDate, ...(filter ? { botName: filter } : {}) } },
            emptyMessage: 'No executions.',
          },

          // Per-bot drill-down buttons
          ...(allBots.length > 0 ? [{
            type   : 'grid',
            spacing: 1,
            columns: allBots.map(b => ({
              xs: 12, sm: 4,
              components: [{
                type: 'action_button', label: b,
                intent: 'view_bot_detail', params: { botName: b, date: displayDate },
                variant: filter === b ? 'contained' : 'outlined',
                color: 'primary', fullWidth: true,
              }],
            })),
          }] : []),
        ],
      };
    },

    // ── Paginated API fetch log ───────────────────────────────────────────────
    view_fetches: async (context) => {
      const date   = context.metadata?.date || null;
      const page   = Math.max(1, Number(context.metadata?.page || 1));
      const botId  = context.metadata?.botId || null;

      let logData;
      try { logData = await fetchLog(context, date); }
      catch (err) {
        return { layout: [{ type: 'alert', severity: 'error', message: err.message, action: { label: '← Dashboard', intent: 'init' } }] };
      }

      const { entries }  = logData;
      const displayDate  = logData.date;

      let fetches = entries.filter(e => e.event === 'bot.fetch');
      if (botId) fetches = fetches.filter(f => f.botId === botId);
      fetches = fetches.reverse();

      const total      = fetches.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRows   = fetches.slice(offset, offset + PAGE_SIZE);

      // Latency stats for this page set
      const allMs    = fetches.map(f => f.latencyMs).filter(v => v != null);
      const stats    = latencyStats(allMs);

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 🌐 API Fetches — ${displayDate} (${total})`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{ type: 'action_button', label: '← Dashboard', intent: 'init', params: { date: displayDate }, variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true }],
              },
            ],
          },

          // Latency KPIs
          ...(allMs.length > 0 ? [{
            type: 'grid', spacing: 2,
            columns: [
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Min',     value: fmtMs(stats.min), icon: 'KeyboardArrowDown', color: 'success',               subtitle: 'fastest' }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Avg',     value: fmtMs(stats.avg), icon: 'Speed',             color: latencyColor(stats.avg), subtitle: 'mean'    }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'P95',     value: fmtMs(stats.p95), icon: 'TrendingUp',        color: latencyColor(stats.p95), subtitle: '95th pct' }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Max',     value: fmtMs(stats.max), icon: 'KeyboardArrowUp',   color: latencyColor(stats.max), subtitle: 'slowest' }] },
            ],
          }] : []),

          {
            type   : 'data_table',
            title  : `API Fetch Log — page ${page}/${totalPages}`,
            columns: [
              { field: 'ts',      label: 'Timestamp',  align: 'left'   },
              { field: 'method',  label: 'Method',     align: 'center' },
              { field: 'url',     label: 'URL',        align: 'left'   },
              { field: 'status',  label: 'HTTP',       align: 'center' },
              { field: 'ms',      label: 'Latency ms', align: 'center' },
              {
                field: 'ok', label: 'Result', align: 'center',
                chip : { colorMap: { '✓ OK': 'success', '✗ Error': 'error' } },
              },
              { field: 'bot', label: 'Bot', align: 'left' },
            ],
            rows: pageRows.map(f => ({
              ts    : fmtTs(f.ts),
              method: f.method,
              url   : (f.url || '').length > 70 ? f.url.slice(0, 70) + '…' : f.url,
              status: f.status ?? '—',
              ms    : f.latencyMs != null ? `${f.latencyMs} ms` : '—',
              ok    : f.success !== false ? '✓ OK' : '✗ Error',
              bot   : f.botId?.split('/')[0] || '—',
            })),
            pagination  : { page, pageSize: PAGE_SIZE, total, intent: 'view_fetches', params: { date: displayDate } },
            emptyMessage: 'No fetch events logged.',
          },
        ],
      };
    },

    // ── Per-bot drilldown ────────────────────────────────────────────────────
    view_bot_detail: async (context) => {
      const botName = context.metadata?.botName;
      const date    = context.metadata?.date || null;

      if (!botName) {
        return { layout: [{ type: 'alert', severity: 'error', message: 'No botName provided.', action: { label: '← Dashboard', intent: 'init' } }] };
      }

      let logData;
      try { logData = await fetchLog(context, date); }
      catch (err) {
        return { layout: [{ type: 'alert', severity: 'error', message: err.message, action: { label: '← Dashboard', intent: 'init' } }] };
      }

      const { entries } = logData;
      const displayDate = logData.date;

      const executions  = entries.filter(e => e.event === 'bot.execute' && e.botName === botName);
      const loadsForBot = entries.filter(e => e.event === 'bot.load'    && e.botName === botName);
      const errors      = executions.filter(e => e.success === false);

      // Intent breakdown
      const intentMap = {};
      executions.forEach(e => {
        const k = e.intent || 'unknown';
        if (!intentMap[k]) intentMap[k] = { count: 0, totalMs: 0, maxMs: 0, errors: 0 };
        intentMap[k].count++;
        if (e.executionTimeMs != null) {
          intentMap[k].totalMs += e.executionTimeMs;
          if (e.executionTimeMs > intentMap[k].maxMs) intentMap[k].maxMs = e.executionTimeMs;
        }
        if (e.success === false) intentMap[k].errors++;
      });

      const intentRows = Object.entries(intentMap)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([intent, v]) => ({
          intent,
          calls  : v.count,
          avgMs  : v.count > 0 ? `${Math.round(v.totalMs / v.count)} ms` : '—',
          maxMs  : `${v.maxMs} ms`,
          errors : v.errors,
        }));

      const execMs  = executions.map(e => e.executionTimeMs).filter(v => v != null);
      const stats   = latencyStats(execMs);

      // Timeline (last 10 executions)
      const timeline = executions.slice(-10).reverse();

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 🤖 ${botName}  —  ${displayDate}`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{ type: 'action_button', label: '← Dashboard', intent: 'init', params: { date: displayDate }, variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true }],
              },
            ],
          },

          // KPIs
          {
            type: 'grid', spacing: 2,
            columns: [
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Executions',  value: executions.length,  icon: 'PlayArrow',     color: 'primary',              subtitle: `${loadsForBot.length} script load${loadsForBot.length !== 1 ? 's' : ''}` }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Avg Exec ms', value: fmtMs(stats.avg),   icon: 'Speed',         color: execColor(stats.avg),   subtitle: 'mean intent execution'  }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'P95 Exec ms', value: fmtMs(stats.p95),   icon: 'TrendingUp',    color: execColor(stats.p95),   subtitle: '95th pct execution'     }] },
              { xs: 6, sm: 3, components: [{ type: 'stat_card', title: 'Errors',      value: errors.length,      icon: 'ErrorOutline',  color: errors.length === 0 ? 'success' : 'error', subtitle: errors.length === 0 ? 'All OK ✓' : 'failed executions' }] },
            ],
          },

          // Intent breakdown
          {
            type   : 'data_table',
            title  : 'Intent Breakdown',
            columns: [
              { field: 'intent', label: 'Intent',  align: 'left'   },
              { field: 'calls',  label: 'Calls',   align: 'center' },
              { field: 'avgMs',  label: 'Avg ms',  align: 'center' },
              { field: 'maxMs',  label: 'Max ms',  align: 'center' },
              { field: 'errors', label: 'Errors',  align: 'center' },
            ],
            rows        : intentRows,
            emptyMessage: 'No executions.',
          },

          // Recent timeline
          {
            type   : 'data_table',
            title  : 'Recent Executions (last 10)',
            columns: [
              { field: 'ts',      label: 'Time',       align: 'left'   },
              { field: 'intent',  label: 'Intent',     align: 'left'   },
              { field: 'execMs',  label: 'Exec ms',    align: 'center' },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { '✓ OK': 'success', '✗ Error': 'error' } },
              },
              { field: 'convId',  label: 'Conversation', align: 'left' },
            ],
            rows: timeline.map(e => ({
              ts     : fmtTs(e.ts),
              intent : e.intent,
              execMs : e.executionTimeMs != null ? `${e.executionTimeMs} ms` : '—',
              result : e.success !== false ? '✓ OK' : '✗ Error',
              convId : e.conversationId || '—',
            })),
            emptyMessage: 'No executions.',
          },
        ],
      };
    },

    // ── Raw NDJSON log browser ───────────────────────────────────────────────
    view_raw_log: async (context) => {
      const date    = context.metadata?.date || null;
      const page    = Math.max(1, Number(context.metadata?.page || 1));
      const filter  = context.metadata?.event || null; // e.g. 'bot.fetch'

      let logData;
      try { logData = await fetchLog(context, date); }
      catch (err) {
        return { layout: [{ type: 'alert', severity: 'error', message: err.message, action: { label: '← Dashboard', intent: 'init' } }] };
      }

      const { entries, summary } = logData;
      const displayDate = logData.date;

      let rows = filter ? entries.filter(e => e.event === filter) : entries;
      rows = [...rows].reverse();

      const total      = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRows   = rows.slice(offset, offset + PAGE_SIZE);

      const eventTypes = ['bot.load', 'bot.execute', 'bot.fetch', 'bot.script_log'];

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 📄 Raw Log — ${displayDate}${filter ? `  ·  ${filter}` : ''}  (${total} entries)`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{ type: 'action_button', label: '← Dashboard', intent: 'init', params: { date: displayDate }, variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true }],
              },
            ],
          },

          // Summary chips
          {
            type   : 'grid',
            spacing: 1,
            columns: [
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Total',      value: summary.total,      icon: 'Article',     color: 'primary',   subtitle: 'all events'   }] },
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Loads',      value: summary.loads,      icon: 'Download',    color: 'secondary', subtitle: 'bot.load'     }] },
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Executions', value: summary.executions, icon: 'PlayArrow',   color: 'info',      subtitle: 'bot.execute'  }] },
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Fetches',    value: summary.fetches,    icon: 'Http',        color: 'warning',   subtitle: 'bot.fetch'    }] },
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Script Logs',value: summary.scriptLogs, icon: 'Terminal',    color: 'default',   subtitle: 'bot.script_log' }] },
              { xs: 6, sm: 2, components: [{ type: 'stat_card', title: 'Errors',     value: summary.errors,     icon: 'Error',       color: summary.errors === 0 ? 'success' : 'error', subtitle: 'success=false' }] },
            ],
          },

          // Event type filter buttons
          {
            type   : 'grid',
            spacing: 1,
            columns: [
              {
                xs: 12, sm: 2,
                components: [{
                  type: 'action_button', label: 'All Events',
                  intent: 'view_raw_log', params: { date: displayDate },
                  variant: !filter ? 'contained' : 'outlined', color: 'primary', fullWidth: true,
                }],
              },
              ...eventTypes.map(ev => ({
                xs: 12, sm: 2,
                components: [{
                  type   : 'action_button',
                  label  : ev.replace('bot.', ''),
                  intent : 'view_raw_log',
                  params : { date: displayDate, event: ev },
                  variant: filter === ev ? 'contained' : 'outlined',
                  color  : 'info',
                  fullWidth: true,
                }],
              })),
            ],
          },

          // Log table
          {
            type   : 'data_table',
            title  : `Log entries — page ${page}/${totalPages}`,
            columns: [
              { field: 'ts',     label: 'Timestamp', align: 'left'   },
              { field: 'event',  label: 'Event',     align: 'center' },
              { field: 'bot',    label: 'Bot',       align: 'left'   },
              { field: 'detail', label: 'Detail',    align: 'left'   },
              { field: 'ms',     label: 'ms',        align: 'center' },
              {
                field: 'ok', label: 'OK', align: 'center',
                chip : { colorMap: { 'true': 'success', 'false': 'error', '—': 'default' } },
              },
            ],
            rows: pageRows.map(e => ({
              ts    : fmtTs(e.ts),
              event : e.event?.replace('bot.', '') || '?',
              bot   : e.botName || e.botId?.split('/')[0] || '—',
              detail: (
                e.intent  ? `intent:${e.intent}` :
                e.url     ? e.url.split('?')[0].split('/').slice(-2).join('/') :
                e.message ? e.message.slice(0, 60) :
                e.level   ? `[${e.level}]` : '—'
              ),
              ms    : e.executionTimeMs ?? e.latencyMs ?? null,
              ok    : e.success != null ? String(e.success) : '—',
            })),
            pagination  : {
              page, pageSize: PAGE_SIZE, total,
              intent: 'view_raw_log',
              params: { date: displayDate, ...(filter ? { event: filter } : {}) },
            },
            emptyMessage: 'No entries.',
          },
        ],
      };
    },

    // ── Switch date ──────────────────────────────────────────────────────────
    select_date: async (context) => {
      const date = context.metadata?.date;
      if (!date) {
        return { layout: [{ type: 'alert', severity: 'error', message: 'No date provided.', action: { label: '← Dashboard', intent: 'init' } }] };
      }
      // Delegate to init with the chosen date
      return context.execute('init', { date });
    },
  },
};
