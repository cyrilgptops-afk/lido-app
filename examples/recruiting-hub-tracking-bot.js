/**
 * RecruitingHub Tracking Bot
 * Version: 1.0.0
 *
 * Application bot that queries the RecruitingHub Tracking API for:
 *   - Organisation-level candidate tracking  (org_id=org-m0kjxzg1-6s0x0)
 *   - Job-level candidate tracking           (job_id=200)
 *
 * Every API call is timed with performance.now() and the results are surfaced
 * live in the `perf_report` intent as a full call log + endpoint summary.
 *
 * Intents:
 *   init               — fetch both APIs in parallel, KPI dashboard + perf cards
 *   view_org_tracking  — paginated table of org-level records   (params: { page? })
 *   view_job_tracking  — paginated table of job-200 records     (params: { page? })
 *   view_candidate     — candidate detail + AI score breakdown  (params: { recordId, source })
 *   perf_report        — dedicated API performance report table
 *   refresh_cache      — bust caches, re-fetch both APIs
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://app-recruitinghub.gateway.apiplatform.io/v1';
const PKEY     = '3fe6763df06a1b793fde07bde9af77d8';
const APIKEY   = 'aI307LzvXPt6KW9OnYXXhLGTvCljUkFq';
const ORG_ID   = 'org-m0kjxzg1-6s0x0';
const JOB_ID   = '200';
const PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Shared request headers ───────────────────────────────────────────────────
const HEADERS = {
  'pkey'  : PKEY,
  'apikey': APIKEY,
  'Accept': 'application/json',
};

// ─── Performance store ────────────────────────────────────────────────────────
/** @type {{ endpoint: string, durationMs: number, status: string, recordCount: number, timestamp: string }[]} */
const _perfLog = [];

function recordPerf(endpoint, durationMs, status, recordCount) {
  _perfLog.push({ endpoint, durationMs, status, recordCount, timestamp: new Date().toISOString() });
}

// ─── Data caches ──────────────────────────────────────────────────────────────
let _orgCache = null; // { records: [], expiresAt: number }
let _jobCache = null; // { records: [], expiresAt: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely extract the array of records from whatever shape the API returns:
 * plain array, { data: [] }, { records: [] }, etc.
 */
function extractRecords(data) {
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'records', 'items', 'results', 'tracking', 'applications']) {
    if (Array.isArray(data[key])) return data[key];
  }
  const found = Object.values(data || {}).find(v => Array.isArray(v));
  return found || [];
}

/** Unix-timestamp → "01 Jan 2025" */
function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

/** Unix-timestamp → "01 Jan 2025, 14:30" */
function fmtDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

/** 0–100 score → MUI chip color */
function scoreColor(score) {
  if (score === null || score === undefined) return 'default';
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

/** Response-time (ms) → MUI chip color */
function perfColor(ms) {
  if (ms < 500)  return 'success';
  if (ms < 1500) return 'warning';
  return 'error';
}

// ─── Status → chip color ──────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Ready For Scoring'        : 'info',
  'Shortlisting In Progress' : 'warning',
  'Rejected In Scoring'      : 'error',
  'Shortlisted'              : 'success',
  'Passed'                   : 'success',
  'Rejected'                 : 'error',
  'On Hold'                  : 'warning',
};

// ─── API fetchers with built-in perf timing ───────────────────────────────────
async function fetchOrgTracking(force = false) {
  if (!force && _orgCache && _orgCache.expiresAt > Date.now()) {
    return _orgCache.records; // cache hit — no network call, no perf entry
  }

  const t0      = performance.now();
  let   status  = 'ok';
  let   records = [];

  try {
    const resp = await fetch(`${BASE_URL}/get-tracking?org_id=${ORG_ID}`, {
      method: 'GET', headers: HEADERS,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    records    = extractRecords(data);
    _orgCache  = { records, expiresAt: Date.now() + CACHE_TTL };
  } catch (err) {
    status = 'error';
    throw err;
  } finally {
    recordPerf(`org_id=${ORG_ID}`, Math.round(performance.now() - t0), status, records.length);
  }

  return records;
}

async function fetchJobTracking(force = false) {
  if (!force && _jobCache && _jobCache.expiresAt > Date.now()) {
    return _jobCache.records;
  }

  const t0      = performance.now();
  let   status  = 'ok';
  let   records = [];

  try {
    const resp = await fetch(`${BASE_URL}/get-tracking?job_id=${JOB_ID}`, {
      method: 'GET', headers: HEADERS,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    records    = extractRecords(data);
    _jobCache  = { records, expiresAt: Date.now() + CACHE_TTL };
  } catch (err) {
    status = 'error';
    throw err;
  } finally {
    recordPerf(`job_id=${JOB_ID}`, Math.round(performance.now() - t0), status, records.length);
  }

  return records;
}

// ─── Stats helper ─────────────────────────────────────────────────────────────
function calcStats(records) {
  const byStatus = {};
  let totalAi = 0, aiN = 0, totalShort = 0, shortN = 0;

  records.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.ai_score != null)          { totalAi    += r.ai_score;          aiN++;    }
    if (r.shortlisting_score > 0)    { totalShort += r.shortlisting_score; shortN++; }
  });

  return {
    total          : records.length,
    byStatus,
    statuses       : Object.entries(byStatus).sort(([,a],[,b]) => b - a),
    avgAiScore     : aiN    > 0 ? Math.round(totalAi    / aiN)    : null,
    avgShortlisting: shortN > 0 ? Math.round(totalShort / shortN) : null,
  };
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
  name   : 'RecruitingHub Tracking',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[TrackingBot] init user=${context.userId}`);
  },

  intents: {

    // ── Dashboard — fetch both APIs in parallel on init ──────────────────────
    init: async (context) => {
      let orgRecords = [], jobRecords = [];
      let orgErr = null, jobErr = null;

      // Parallel fetch — both APIs called simultaneously
      const [orgResult, jobResult] = await Promise.allSettled([
        fetchOrgTracking(),
        fetchJobTracking(),
      ]);

      if (orgResult.status === 'fulfilled') orgRecords = orgResult.value;
      else orgErr = orgResult.reason?.message || 'Org tracking unavailable';

      if (jobResult.status === 'fulfilled') jobRecords = jobResult.value;
      else jobErr = jobResult.reason?.message || 'Job tracking unavailable';

      const orgStats  = calcStats(orgRecords);
      const jobStats  = calcStats(jobRecords);

      // Grab the two most-recent perf entries (the calls we just made)
      const latestPerf = _perfLog.slice(-2);

      return {
        layout: [
          // ── Page header ──────────────────────────────────────────────────
          {
            type    : 'text',
            content : '# 📊 RecruitingHub Tracking Dashboard',
            markdown: true,
          },

          // Error banners
          ...(orgErr ? [{ type: 'alert', severity: 'error', title: 'Org Tracking Failed', message: orgErr }] : []),
          ...(jobErr ? [{ type: 'alert', severity: 'error', title: 'Job Tracking Failed', message: jobErr }] : []),

          // ── Org KPIs ─────────────────────────────────────────────────────
          { type: 'text', content: `### 🏢 Organisation  \`${ORG_ID}\``, markdown: true },
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Candidates',
                  value   : orgStats.total,
                  icon    : 'People',
                  color   : 'primary',
                  subtitle: 'Org tracking records',
                  action  : { label: 'View All', intent: 'view_org_tracking' },
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Distinct Statuses',
                  value   : orgStats.statuses.length,
                  icon    : 'Category',
                  color   : 'info',
                  subtitle: orgStats.statuses[0] ? `Top: ${orgStats.statuses[0][0]}` : '—',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg AI Score',
                  value   : orgStats.avgAiScore != null ? `${orgStats.avgAiScore}/100` : '—',
                  icon    : 'Psychology',
                  color   : orgStats.avgAiScore != null ? scoreColor(orgStats.avgAiScore) : 'default',
                  subtitle: 'AI-scored candidates',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg Shortlisting',
                  value   : orgStats.avgShortlisting != null ? `${orgStats.avgShortlisting}/100` : '—',
                  icon    : 'Star',
                  color   : orgStats.avgShortlisting != null ? scoreColor(orgStats.avgShortlisting) : 'default',
                  subtitle: 'Shortlisting score',
                }],
              },
            ],
          },

          // ── Job KPIs ─────────────────────────────────────────────────────
          { type: 'text', content: `### 💼 Job  \`job_id=${JOB_ID}\``, markdown: true },
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Candidates',
                  value   : jobStats.total,
                  icon    : 'PersonAdd',
                  color   : 'primary',
                  subtitle: `Job ${JOB_ID} records`,
                  action  : { label: 'View All', intent: 'view_job_tracking' },
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Distinct Statuses',
                  value   : jobStats.statuses.length,
                  icon    : 'Category',
                  color   : 'info',
                  subtitle: jobStats.statuses[0] ? `Top: ${jobStats.statuses[0][0]}` : '—',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg AI Score',
                  value   : jobStats.avgAiScore != null ? `${jobStats.avgAiScore}/100` : '—',
                  icon    : 'Psychology',
                  color   : jobStats.avgAiScore != null ? scoreColor(jobStats.avgAiScore) : 'default',
                  subtitle: 'AI-scored candidates',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg Shortlisting',
                  value   : jobStats.avgShortlisting != null ? `${jobStats.avgShortlisting}/100` : '—',
                  icon    : 'Star',
                  color   : jobStats.avgShortlisting != null ? scoreColor(jobStats.avgShortlisting) : 'default',
                  subtitle: 'Shortlisting score',
                }],
              },
            ],
          },

          // ── API Performance cards (this load) ─────────────────────────────
          { type: 'text', content: '### ⚡ API Performance — this load', markdown: true },
          {
            type   : 'grid',
            spacing: 2,
            columns: latestPerf.map(p => ({
              xs: 12, sm: 6,
              components: [{
                type    : 'stat_card',
                title   : `/v1/get-tracking?${p.endpoint}`,
                value   : `${p.durationMs} ms`,
                icon    : 'Speed',
                color   : perfColor(p.durationMs),
                subtitle: `${p.recordCount} records · ${p.status === 'ok' ? '✓ OK' : '✗ Error'}`,
                action  : { label: 'Full Perf Report', intent: 'perf_report' },
              }],
            })),
          },

          // ── Action buttons ────────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '🏢 Org Tracking',
                  intent   : 'view_org_tracking',
                  variant  : 'contained',
                  color    : 'primary',
                  icon     : 'Business',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '💼 Job 200 Tracking',
                  intent   : 'view_job_tracking',
                  variant  : 'contained',
                  color    : 'secondary',
                  icon     : 'Work',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '⚡ Perf Report',
                  intent   : 'perf_report',
                  variant  : 'outlined',
                  color    : 'info',
                  icon     : 'Speed',
                  fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Organisation-level tracking — paginated table ────────────────────────
    view_org_tracking: async (context) => {
      const page = Math.max(1, Number(context.metadata?.page || 1));

      let records;
      try {
        records = await fetchOrgTracking();
      } catch (err) {
        return {
          layout: [{
            type: 'alert', severity: 'error',
            title: 'Failed to load org tracking', message: err.message,
            action: { label: '← Dashboard', intent: 'init' },
          }],
        };
      }

      const total      = records.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRecs   = records.slice(offset, offset + PAGE_SIZE);

      const rows = pageRecs.map(r => ({
        id                : r.id,
        candidate_name    : r.candidate?.personal_info?.full_name || `Candidate #${r.candidate_id}`,
        job_id            : r.job_id,
        status            : r.status,
        shortlisting_score: r.shortlisting_score ?? '—',
        ai_score          : r.ai_score ?? '—',
        shortlisted_at    : fmtDate(r.shortlisted_at),
        ai_scored_at      : fmtDate(r.ai_scored_at),
        _record_id        : r.id,
      }));

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{
                  type: 'text',
                  content: `## 🏢 Org Tracking — Page ${page}/${totalPages} (${total} records)`,
                  markdown: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },
          {
            type   : 'data_table',
            title  : `Org Tracking (page ${page} of ${totalPages})`,
            columns: [
              { field: 'id',                 label: 'ID',           align: 'center' },
              { field: 'candidate_name',     label: 'Candidate',    align: 'left'   },
              { field: 'job_id',             label: 'Job',          align: 'center' },
              { field: 'status',             label: 'Status',       align: 'center',
                chip: { colorMap: STATUS_COLORS } },
              { field: 'shortlisting_score', label: 'Shortlist ↑',  align: 'center' },
              { field: 'ai_score',           label: 'AI Score',     align: 'center' },
              { field: 'shortlisted_at',     label: 'Shortlisted',  align: 'center' },
              { field: 'ai_scored_at',       label: 'AI Scored',    align: 'center' },
              {
                field  : '_actions', label: 'Detail', align: 'center',
                actions: [{ label: 'View', intent: 'view_candidate', params: { recordId: '{{row._record_id}}', source: 'org' } }],
              },
            ],
            rows        : rows,
            pagination  : { page, pageSize: PAGE_SIZE, total, intent: 'view_org_tracking' },
            emptyMessage: 'No org tracking records.',
          },
        ],
      };
    },

    // ── Job-level tracking — paginated table ─────────────────────────────────
    view_job_tracking: async (context) => {
      const page = Math.max(1, Number(context.metadata?.page || 1));

      let records;
      try {
        records = await fetchJobTracking();
      } catch (err) {
        return {
          layout: [{
            type: 'alert', severity: 'error',
            title: `Failed to load job ${JOB_ID} tracking`, message: err.message,
            action: { label: '← Dashboard', intent: 'init' },
          }],
        };
      }

      const total      = records.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRecs   = records.slice(offset, offset + PAGE_SIZE);

      const rows = pageRecs.map(r => ({
        id                : r.id,
        candidate_name    : r.candidate?.personal_info?.full_name || `Candidate #${r.candidate_id}`,
        status            : r.status,
        shortlisting_score: r.shortlisting_score ?? '—',
        ai_score          : r.ai_score ?? '—',
        shortlisted_at    : fmtDate(r.shortlisted_at),
        _record_id        : r.id,
      }));

      return {
        layout: [
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{
                  type: 'text',
                  content: `## 💼 Job ${JOB_ID} Tracking — Page ${page}/${totalPages} (${total} records)`,
                  markdown: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },
          {
            type   : 'data_table',
            title  : `Job ${JOB_ID} Tracking (page ${page} of ${totalPages})`,
            columns: [
              { field: 'id',                 label: 'ID',          align: 'center' },
              { field: 'candidate_name',     label: 'Candidate',   align: 'left'   },
              { field: 'status',             label: 'Status',       align: 'center',
                chip: { colorMap: STATUS_COLORS } },
              { field: 'shortlisting_score', label: 'Shortlist ↑', align: 'center' },
              { field: 'ai_score',           label: 'AI Score',    align: 'center' },
              { field: 'shortlisted_at',     label: 'Shortlisted', align: 'center' },
              {
                field  : '_actions', label: 'Detail', align: 'center',
                actions: [{ label: 'View', intent: 'view_candidate', params: { recordId: '{{row._record_id}}', source: 'job' } }],
              },
            ],
            rows        : rows,
            pagination  : { page, pageSize: PAGE_SIZE, total, intent: 'view_job_tracking' },
            emptyMessage: `No tracking records for job ${JOB_ID}.`,
          },
        ],
      };
    },

    // ── Candidate detail + AI comments ───────────────────────────────────────
    view_candidate: async (context) => {
      const recordId = context.metadata?.recordId;
      const source   = context.metadata?.source || 'org'; // 'org' | 'job'

      if (!recordId) {
        return {
          layout: [{
            type: 'alert', severity: 'error', message: 'No recordId provided.',
            action: { label: '← Back', intent: 'init' },
          }],
        };
      }

      let record = null;
      try {
        const records = source === 'job' ? await fetchJobTracking() : await fetchOrgTracking();
        record = records.find(r => String(r.id) === String(recordId)) || null;
      } catch (err) {
        return {
          layout: [{
            type: 'alert', severity: 'error', title: 'API Error', message: err.message,
            action: { label: '← Back', intent: 'init' },
          }],
        };
      }

      if (!record) {
        return {
          layout: [{
            type: 'alert', severity: 'warning', title: 'Record Not Found',
            message: `No tracking record with ID ${recordId}.`,
            action: { label: '← Back', intent: source === 'job' ? 'view_job_tracking' : 'view_org_tracking' },
          }],
        };
      }

      const c    = record.candidate    || {};
      const info = c.personal_info     || {};
      const loc  = c.location          || {};
      const name  = info.full_name     || `Candidate #${record.candidate_id}`;
      const email = info.emails?.[0]?.value  || '—';
      const phone = info.phones?.[0]?.number || '—';
      const backIntent = source === 'job' ? 'view_job_tracking' : 'view_org_tracking';

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 👤 ${name}`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button',
                  label: source === 'job' ? '← Job Tracking' : '← Org Tracking',
                  intent: backIntent,
                  variant: 'outlined', color: 'secondary', icon: 'ArrowBack', fullWidth: true,
                }],
              },
            ],
          },

          // Score KPIs
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'AI Score',
                  value   : record.ai_score != null ? `${record.ai_score}/100` : '—',
                  icon    : 'Psychology',
                  color   : record.ai_score != null ? scoreColor(record.ai_score) : 'default',
                  subtitle: 'AI evaluation',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Shortlisting Score',
                  value   : record.shortlisting_score > 0 ? `${record.shortlisting_score}/100` : '—',
                  icon    : 'Star',
                  color   : record.shortlisting_score > 0 ? scoreColor(record.shortlisting_score) : 'default',
                  subtitle: 'Shortlisting evaluation',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Status',
                  value   : record.status || '—',
                  icon    : 'Info',
                  color   : STATUS_COLORS[record.status] || 'default',
                  subtitle: `Job ${record.job_id}`,
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Shortlisted',
                  value   : fmtDate(record.shortlisted_at),
                  icon    : 'CalendarToday',
                  color   : 'info',
                  subtitle: `AI scored: ${fmtDate(record.ai_scored_at)}`,
                }],
              },
            ],
          },

          // Info tables
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 6,
                components: [{
                  type   : 'data_table',
                  title  : 'Candidate Info',
                  columns: [
                    { field: 'label', label: 'Field', align: 'left' },
                    { field: 'value', label: 'Value', align: 'left' },
                  ],
                  rows: [
                    { label: 'Full Name',    value: name                              },
                    { label: 'Email',        value: email                             },
                    { label: 'Phone',        value: phone                             },
                    { label: 'Country',      value: loc.current?.country || '—'       },
                    { label: 'Relocate?',    value: loc.willing_to_relocate ? 'Yes' : 'No' },
                    { label: 'Source',       value: c.source || '—'                   },
                    { label: 'Candidate ID', value: record.candidate_id               },
                  ],
                  emptyMessage: '',
                }],
              },
              {
                xs: 12, sm: 6,
                components: [{
                  type   : 'data_table',
                  title  : 'Tracking Details',
                  columns: [
                    { field: 'label', label: 'Field', align: 'left' },
                    { field: 'value', label: 'Value', align: 'left' },
                  ],
                  rows: [
                    { label: 'Record ID',   value: record.id                         },
                    { label: 'Job ID',      value: record.job_id                     },
                    { label: 'Org ID',      value: record.org_id                     },
                    { label: 'Workspace',   value: record.ws_id                      },
                    { label: 'Agent ID',    value: record.agent_id                   },
                    { label: 'Company ID',  value: record.company_id                 },
                    { label: 'Created',     value: fmtDateTime(record.created_at)    },
                    { label: 'Updated',     value: fmtDateTime(record.updated_at)    },
                    { label: 'Shortlisted', value: fmtDateTime(record.shortlisted_at) },
                    { label: 'AI Scored',   value: fmtDateTime(record.ai_scored_at)  },
                  ],
                  emptyMessage: '',
                }],
              },
            ],
          },

          // AI comments (can be long — render as markdown)
          ...(record.ai_comments ? [{
            type    : 'text',
            content : `**🤖 AI Evaluation**\n\n${record.ai_comments.replace(/\r\n/g, '\n').trim()}`,
            markdown: true,
            variant : 'body2',
          }] : []),

          // Shortlisting comments
          ...(record.shortlisting_comments ? [{
            type    : 'alert',
            severity: 'info',
            title   : 'Shortlisting Comments',
            message : record.shortlisting_comments,
          }] : []),
        ],
      };
    },

    // ── API Performance report ────────────────────────────────────────────────
    perf_report: async (context) => {
      if (_perfLog.length === 0) {
        return {
          layout: [{
            type: 'alert', severity: 'info',
            title: 'No Performance Data Yet',
            message: 'Navigate to the dashboard first to collect API timings.',
            action: { label: 'Load Dashboard', intent: 'init' },
          }],
        };
      }

      // ── Per-endpoint aggregation ─────────────────────────────────────────
      const byEndpoint = {};
      _perfLog.forEach(e => {
        if (!byEndpoint[e.endpoint]) {
          byEndpoint[e.endpoint] = { calls: 0, totalMs: 0, minMs: Infinity, maxMs: -Infinity, errors: 0 };
        }
        const agg = byEndpoint[e.endpoint];
        agg.calls++;
        agg.totalMs += e.durationMs;
        if (e.durationMs < agg.minMs) agg.minMs = e.durationMs;
        if (e.durationMs > agg.maxMs) agg.maxMs = e.durationMs;
        if (e.status !== 'ok') agg.errors++;
      });

      const summaryRows = Object.entries(byEndpoint).map(([ep, agg]) => ({
        endpoint: ep,
        calls   : agg.calls,
        avgMs   : Math.round(agg.totalMs / agg.calls),
        minMs   : agg.minMs,
        maxMs   : agg.maxMs,
        errors  : agg.errors,
        health  : agg.errors === 0 ? 'Healthy' : 'Degraded',
      }));

      const logRows = _perfLog.map((e, i) => ({
        '#'       : i + 1,
        endpoint  : `/v1/get-tracking?${e.endpoint}`,
        ms        : e.durationMs,
        status    : e.status === 'ok' ? 'OK' : 'Error',
        records   : e.recordCount,
        time      : e.timestamp.replace('T', ' ').slice(0, 19) + ' UTC',
      }));

      // ── Overall KPIs ─────────────────────────────────────────────────────
      const allMs      = _perfLog.map(e => e.durationMs);
      const avgMs      = Math.round(allMs.reduce((a, b) => a + b, 0) / allMs.length);
      const maxMs      = Math.max(...allMs);
      const minMs      = Math.min(...allMs);
      const errorCount = _perfLog.filter(e => e.status !== 'ok').length;

      return {
        layout: [
          // Header
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: '## ⚡ API Performance Report', markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },

          // ── Overall KPI row ──────────────────────────────────────────────
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total API Calls',
                  value   : _perfLog.length,
                  icon    : 'Http',
                  color   : 'primary',
                  subtitle: 'since bot started',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg Response',
                  value   : `${avgMs} ms`,
                  icon    : 'Speed',
                  color   : perfColor(avgMs),
                  subtitle: 'all endpoints',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Slowest / Fastest',
                  value   : `${maxMs} / ${minMs} ms`,
                  icon    : 'HourglassBottom',
                  color   : perfColor(maxMs),
                  subtitle: 'worst / best call',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Errors',
                  value   : errorCount,
                  icon    : 'ErrorOutline',
                  color   : errorCount === 0 ? 'success' : 'error',
                  subtitle: errorCount === 0 ? 'All calls succeeded' : `${errorCount} failed`,
                }],
              },
            ],
          },

          // ── Per-endpoint summary ─────────────────────────────────────────
          {
            type   : 'data_table',
            title  : 'Summary by Endpoint',
            columns: [
              { field: 'endpoint', label: 'Endpoint',  align: 'left'   },
              { field: 'calls',    label: 'Calls',     align: 'center' },
              { field: 'avgMs',    label: 'Avg ms',    align: 'center' },
              { field: 'minMs',    label: 'Min ms',    align: 'center' },
              { field: 'maxMs',    label: 'Max ms',    align: 'center' },
              { field: 'errors',   label: 'Errors',    align: 'center' },
              {
                field: 'health', label: 'Health', align: 'center',
                chip : { colorMap: { 'Healthy': 'success', 'Degraded': 'error' } },
              },
            ],
            rows        : summaryRows,
            emptyMessage: 'No data.',
          },

          // ── Full call log ────────────────────────────────────────────────
          {
            type   : 'data_table',
            title  : 'All API Calls Log',
            columns: [
              { field: '#',        label: '#',          align: 'center' },
              { field: 'endpoint', label: 'Endpoint',   align: 'left'   },
              { field: 'ms',       label: 'Duration ms', align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: { 'OK': 'success', 'Error': 'error' } },
              },
              { field: 'records',  label: 'Records',    align: 'center' },
              { field: 'time',     label: 'Timestamp',  align: 'left'   },
            ],
            rows        : logRows,
            emptyMessage: 'No calls logged yet.',
          },

          // ── Actions ──────────────────────────────────────────────────────
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 6,
                components: [{
                  type: 'action_button', label: '🔄 Refresh Both APIs', intent: 'refresh_cache',
                  variant: 'outlined', color: 'warning', icon: 'Refresh', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 6,
                components: [{
                  type: 'action_button', label: '🏢 Org Tracking', intent: 'view_org_tracking',
                  variant: 'outlined', color: 'primary', icon: 'Business', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Bust caches and re-fetch ──────────────────────────────────────────────
    refresh_cache: async () => {
      _orgCache = null;
      _jobCache = null;

      const [orgResult, jobResult] = await Promise.allSettled([
        fetchOrgTracking(true),
        fetchJobTracking(true),
      ]);

      const ok  = [orgResult, jobResult].filter(r => r.status === 'fulfilled').length;
      const err = [orgResult, jobResult].filter(r => r.status === 'rejected').length;

      return {
        layout: [{
          type    : 'alert',
          severity: err > 0 ? 'warning' : 'success',
          title   : 'Cache Refreshed',
          message : `${ok} API${ok !== 1 ? 's' : ''} reloaded successfully${err > 0 ? `, ${err} failed` : ''}.`,
          action  : { label: '← Dashboard', intent: 'init' },
        }],
      };
    },
  },
};
